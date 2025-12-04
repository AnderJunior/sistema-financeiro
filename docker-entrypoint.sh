#!/bin/sh
set -e

# ============================================================================
# SISTEMA DE LICENCIAMENTO - Verificação de Assinatura
# ============================================================================
# Este script verifica se o cliente tem uma assinatura ativa antes de
# permitir que o sistema seja iniciado.
# ============================================================================

echo "=========================================="
echo "Verificando licença do sistema..."
echo "=========================================="

# Verificar se as variáveis obrigatórias estão definidas
if [ -z "$LICENSE_EMAIL" ]; then
  echo "ERRO: Variável LICENSE_EMAIL não está definida"
  echo "Por favor, configure LICENSE_EMAIL no seu stack.yml ou docker-compose.yml"
  exit 1
fi

if [ -z "$LICENSE_DOMAIN" ]; then
  echo "ERRO: Variável LICENSE_DOMAIN não está definida"
  echo "Por favor, configure LICENSE_DOMAIN no seu stack.yml ou docker-compose.yml"
  exit 1
fi

if [ -z "$LICENSE_API_URL" ]; then
  echo "ERRO: Variável LICENSE_API_URL não está definida"
  echo "Por favor, configure LICENSE_API_URL no seu stack.yml ou docker-compose.yml"
  echo "Exemplo: LICENSE_API_URL=https://seu-dominio.com/api/license/verify"
  exit 1
fi

# Função para verificar licença
verificar_licenca() {
  echo "Verificando licença para:"
  echo "  Email: $LICENSE_EMAIL"
  echo "  Domínio: $LICENSE_DOMAIN"
  echo "  API: $LICENSE_API_URL"
  echo ""

  # Verificar se curl está disponível
  if ! command -v curl >/dev/null 2>&1; then
    echo "ERRO: curl não está instalado!"
    exit 1
  fi

  # Preparar payload JSON
  PAYLOAD=$(cat <<EOF
{
  "email": "$LICENSE_EMAIL",
  "dominio": "$LICENSE_DOMAIN"
}
EOF
)

  # Fazer requisição para API de verificação com timeout
  RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 30 --connect-timeout 10 -X POST "$LICENSE_API_URL" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" 2>&1) || {
    echo "ERRO: Falha ao conectar com a API de licenciamento"
    echo "Verifique se a URL está correta: $LICENSE_API_URL"
    exit 1
  }

  # Separar body e status code
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  # Verificar código HTTP
  if [ "$HTTP_CODE" != "200" ]; then
    echo "ERRO: Falha na verificação de licença (HTTP $HTTP_CODE)"
    echo "Resposta: $BODY"
    echo ""
    echo "=========================================="
    echo "SISTEMA NÃO PODE SER INICIADO"
    echo "=========================================="
    echo "Motivo: Licença não encontrada ou inativa"
    echo ""
    echo "Por favor, verifique:"
    echo "1. Se você possui uma assinatura ativa"
    echo "2. Se o email e domínio estão corretos"
    echo "3. Se sua assinatura não está vencida"
    echo "4. Se a API de licenciamento está acessível"
    echo ""
    echo "Entre em contato com o suporte se necessário."
    exit 1
  fi

  # Verificar status na resposta JSON
  STATUS=$(echo "$BODY" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "")

  if [ "$STATUS" != "ativo" ]; then
    echo "ERRO: Licença não está ativa"
    echo "Resposta: $BODY"
    echo ""
    echo "=========================================="
    echo "SISTEMA NÃO PODE SER INICIADO"
    echo "=========================================="
    echo "Status da licença: $STATUS"
    exit 1
  fi

  echo "✓ Licença verificada com sucesso!"
  echo "Status: $STATUS"
  echo ""
}

# Verificar licença na inicialização
verificar_licenca

# Criar script de verificação periódica
cat > /app/verificar-licenca-periodica.sh <<EOFSCRIPT
#!/bin/sh
# Script de verificação periódica de licença

LICENSE_EMAIL="${LICENSE_EMAIL}"
LICENSE_DOMAIN="${LICENSE_DOMAIN}"
LICENSE_API_URL="${LICENSE_API_URL}"

if [ -z "$LICENSE_EMAIL" ] || [ -z "$LICENSE_DOMAIN" ] || [ -z "$LICENSE_API_URL" ]; then
  echo "Variáveis de licença não configuradas"
  exit 1
fi

PAYLOAD=$(cat <<EOF
{
  "email": "$LICENSE_EMAIL",
  "dominio": "$LICENSE_DOMAIN"
}
EOF
)

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$LICENSE_API_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
STATUS=$(echo "$BODY" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ "$HTTP_CODE" != "200" ] || [ "$STATUS" != "ativo" ]; then
  echo "$(date): Licença inválida ou inativa. Encerrando sistema..."
  echo "HTTP Code: $HTTP_CODE"
  echo "Status: $STATUS"
  echo "Resposta: $BODY"
  
  # Encerrar o processo principal (Next.js)
  pkill -f "node.*server.js" || true
  exit 1
fi

echo "$(date): Licença verificada - Status: $STATUS"
EOFSCRIPT

chmod +x /app/verificar-licenca-periodica.sh

# Configurar cron para verificação diária às 2h da manhã
echo "Configurando verificação periódica de licença..."
echo "0 2 * * * /app/verificar-licenca-periodica.sh >> /var/log/license-check.log 2>&1" | crontab -

echo "=========================================="
echo "Licença verificada - Iniciando sistema..."
echo "=========================================="
echo ""

# Verificar se server.js existe antes de executar
if [ ! -f "/app/server.js" ]; then
  echo "ERRO: server.js não encontrado em /app/"
  echo "O build pode ter falhado. Verifique os logs do build."
  exit 1
fi

# Executar comando original (Next.js)
exec "$@"

