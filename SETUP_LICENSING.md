# 🚀 Setup Rápido - Sistema de Licenciamento

Guia passo a passo para configurar o sistema de licenciamento na sua VPS.

## 📋 Pré-requisitos

1. **Supabase** (mesmo que o sistema já usa - todos os clientes compartilham)
2. **VPS com Docker** configurada
3. **Email e domínio** do cliente que pagou
4. **Tabela `assinantes`** criada no Supabase

## 🔧 Passo 1: Configurar Tabela de Assinantes

### 1.1. Acessar Supabase

Use o mesmo Supabase que o sistema já utiliza.

### 1.2. Executar Migration

1. No SQL Editor do Supabase, execute o arquivo:
   ```
   supabase/migrations/005_create_assinantes_table.sql
   ```

2. Verifique se a tabela foi criada:
   ```sql
   SELECT * FROM assinantes;
   ```

### 1.3. Cadastrar Primeiro Assinante

```sql
INSERT INTO assinantes (
  email,
  dominio,
  status,
  data_vencimento
) VALUES (
  'cliente@exemplo.com',
  'cliente.com.br',
  'ativo',
  '2025-12-31 23:59:59+00'
);
```

## 🔧 Passo 2: Configurar API de Verificação

### 2.1. Deploy da Aplicação

A API de verificação está em `app/api/license/verify/route.ts` e será automaticamente disponibilizada quando você fizer deploy.

### 2.2. Variáveis de Ambiente

A API usa as mesmas variáveis do Supabase que o sistema já utiliza:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 🔧 Passo 3: Configurar Cliente na VPS

### 3.1. Configurar stack.yml

No `stack.yml` do cliente, adicione:

```yaml
environment:
  # Supabase (mesmo para todos os clientes)
  - NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
  - NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... # Anon key
  - SUPABASE_SERVICE_ROLE_KEY=eyJ... # Service role
  
  # Licenciamento (obrigatórias)
  - LICENSE_EMAIL=cliente@exemplo.com
  - LICENSE_DOMAIN=cliente.com.br
  - LICENSE_API_URL=https://cliente.com.br/api/license/verify
```

### 3.3. Build e Deploy

```bash
# Build da imagem
docker build -t sistema-financeiro:latest .

# Ou usar docker-compose/stack deploy
docker stack deploy -c stack.yml sistema-financeiro
```

## ✅ Passo 4: Testar

### 4.1. Verificar se o Container Inicia

```bash
docker logs <container-id>
```

Você deve ver:
```
==========================================
Verificando licença do sistema...
==========================================
Verificando licença para:
  Email: cliente@exemplo.com
  Domínio: cliente.com.br
  API: https://...

✓ Licença verificada com sucesso!
Status: ativo
==========================================
Licença verificada - Iniciando sistema...
==========================================
```

### 4.2. Testar Verificação Manual

```bash
# Dentro do container ou na VPS
export LICENSE_EMAIL="cliente@exemplo.com"
export LICENSE_DOMAIN="cliente.com.br"
export LICENSE_API_URL="https://seu-projeto-licenciamento.supabase.co/api/license/verify"

bash scripts/verificar-licenca.sh
```

### 4.3. Verificar Cron

```bash
# Dentro do container
crontab -l
# Deve mostrar: 0 2 * * * /app/verificar-licenca-periodica.sh ...
```

## 🚨 Troubleshooting

### Container não inicia - "Licença não encontrada"

**Verifique**:
1. Se o assinante está cadastrado na tabela `assinantes`
2. Se o email e domínio estão corretos (case-insensitive, mas verifique)
3. Se o status é `ativo`
4. Se a data de vencimento não passou

**Teste direto no Supabase**:
```sql
SELECT * FROM assinantes 
WHERE email = 'cliente@exemplo.com' 
  AND dominio = 'cliente.com.br' 
  AND status = 'ativo';
```

### Erro 500 - "Serviço de licenciamento não configurado"

**Verifique**:
1. Se `NEXT_PUBLIC_SUPABASE_URL` está configurado
2. Se `SUPABASE_SERVICE_ROLE_KEY` está configurado
3. Se as credenciais estão corretas

### API não responde

**Verifique**:
1. Se a aplicação está rodando
2. Se a rota `/api/license/verify` está acessível
3. Se há firewall bloqueando

**Teste direto**:
```bash
curl -X POST "https://cliente.com.br/api/license/verify" \
  -H "Content-Type: application/json" \
  -d '{"email":"cliente@exemplo.com","dominio":"cliente.com.br"}'
```

## 🔄 Integração com Asaas + n8n

### Workflow Sugerido

1. **Webhook do Asaas** → n8n recebe confirmação de pagamento
2. **n8n cria registro** na tabela `assinantes` com status `pendente_ativacao`
3. **n8n envia email** com link para formulário
4. **Cliente preenche** email e domínio
5. **n8n atualiza registro** com email/domínio e status `ativo`
6. **n8n envia email** com instruções de instalação

### Exemplo de Código n8n

```javascript
// Node: Supabase - Insert
const novoAssinante = {
  email: $json.email, // Do formulário
  dominio: $json.dominio, // Do formulário
  status: 'ativo',
  asaas_customer_id: $json.customerId, // Do webhook Asaas
  asaas_subscription_id: $json.subscriptionId, // Do webhook Asaas
  data_vencimento: $json.nextDueDate // Do webhook Asaas
};

return { json: novoAssinante };
```

## 📊 Monitoramento

### Ver Logs de Verificação

```bash
# Logs do container
docker logs <container-id>

# Logs do cron (dentro do container)
cat /var/log/license-check.log
```

### Consultar Assinantes no Supabase

```sql
-- Ver todos os assinantes
SELECT 
  email,
  dominio,
  status,
  data_vencimento,
  ultima_verificacao,
  ip_ultimo_acesso
FROM assinantes
ORDER BY created_at DESC;

-- Ver assinantes que precisam verificação
SELECT * FROM assinantes
WHERE proxima_verificacao < NOW()
  AND status = 'ativo';
```

## 🔐 Segurança

### ⚠️ IMPORTANTE

- **NUNCA** exponha `SUPABASE_SERVICE_ROLE_KEY` no código
- **NUNCA** commite credenciais no Git
- Use variáveis de ambiente ou secrets do Docker
- Mantenha o Service Role Key apenas no servidor
- A tabela `assinantes` deve ter RLS desabilitado ou política que permita leitura com Service Role

### Boas Práticas

1. Use diferentes Service Role Keys para desenvolvimento e produção
2. Monitore logs de verificação para detectar tentativas suspeitas
3. Implemente rate limiting na API (futuro)
4. Use HTTPS sempre

## 📝 Próximos Passos

1. ✅ Sistema básico funcionando
2. 🔄 Integrar com Asaas + n8n
3. 🔄 Criar dashboard de gerenciamento de assinantes
4. 🔄 Implementar notificações de vencimento
5. 🔄 Adicionar rate limiting na API

