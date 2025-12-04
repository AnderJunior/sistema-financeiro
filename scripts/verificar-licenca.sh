#!/bin/bash
# Script standalone para verificar licença
# Pode ser executado manualmente ou via cron

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar variáveis de ambiente
if [ -z "$LICENSE_EMAIL" ]; then
  echo -e "${RED}ERRO: LICENSE_EMAIL não está definida${NC}"
  exit 1
fi

if [ -z "$LICENSE_DOMAIN" ]; then
  echo -e "${RED}ERRO: LICENSE_DOMAIN não está definida${NC}"
  exit 1
fi

if [ -z "$LICENSE_API_URL" ]; then
  echo -e "${RED}ERRO: LICENSE_API_URL não está definida${NC}"
  exit 1
fi

echo "=========================================="
echo "Verificação de Licença"
echo "=========================================="
echo "Email: $LICENSE_EMAIL"
echo "Domínio: $LICENSE_DOMAIN"
echo "API: $LICENSE_API_URL"
echo ""

# Preparar payload
PAYLOAD=$(cat <<EOF
{
  "email": "$LICENSE_EMAIL",
  "dominio": "$LICENSE_DOMAIN"
}
EOF
)

# Fazer requisição
echo "Verificando licença..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$LICENSE_API_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" 2>&1)

# Separar body e status code
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

# Verificar resultado
if [ "$HTTP_CODE" = "200" ]; then
  STATUS=$(echo "$BODY" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "")
  
  if [ "$STATUS" = "ativo" ]; then
    echo -e "${GREEN}✓ Licença válida e ativa!${NC}"
    echo ""
    echo "Resposta completa:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    exit 0
  else
    echo -e "${RED}✗ Licença não está ativa${NC}"
    echo "Status: $STATUS"
    echo ""
    echo "Resposta:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    exit 1
  fi
else
  echo -e "${RED}✗ Erro ao verificar licença${NC}"
  echo "HTTP Code: $HTTP_CODE"
  echo ""
  echo "Resposta:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi



