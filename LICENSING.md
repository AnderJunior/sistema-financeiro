# Sistema de Licenciamento

Este documento explica como funciona o sistema de licenciamento e como configurá-lo.

## 📋 Visão Geral

O sistema possui um mecanismo de licenciamento que verifica se o cliente possui uma assinatura ativa antes de permitir que o sistema seja instalado ou continue funcionando.

### Como Funciona

1. **Na Instalação**: O `docker-entrypoint.sh` verifica a licença antes de iniciar o sistema
2. **Verificação Periódica**: Um cron job verifica a licença diariamente às 2h da manhã
3. **Se a licença for inválida**: O sistema não inicia ou é encerrado automaticamente

## 🔧 Configuração

### 1. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis no seu `stack.yml` ou `docker-compose.yml`:

```yaml
environment:
  # Licenciamento (obrigatórias)
  - LICENSE_EMAIL=seu-email@exemplo.com
  - LICENSE_DOMAIN=seudominio.com.br
  - LICENSE_API_URL=https://seu-projeto.supabase.co/api/license/verify
  
  # Supabase de Licenciamento (apenas no servidor)
  - LICENSE_SUPABASE_URL=https://seu-projeto-licenciamento.supabase.co
  - LICENSE_SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
```

### 2. Variáveis Explicadas

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `LICENSE_EMAIL` | Email do assinante cadastrado | ✅ Sim |
| `LICENSE_DOMAIN` | Domínio onde o sistema está instalado | ✅ Sim |
| `LICENSE_API_URL` | URL da API de verificação de licença | ✅ Sim |
| `LICENSE_SUPABASE_URL` | URL do Supabase de licenciamento | ✅ Sim |
| `LICENSE_SUPABASE_SERVICE_ROLE_KEY` | Service Role Key do Supabase de licenciamento | ✅ Sim |

### 3. Configurar no Supabase de Licenciamento

#### 3.1. Executar Migration

Execute a migration `005_create_assinantes_table.sql` no seu Supabase de licenciamento:

```sql
-- Execute o arquivo: supabase/migrations/005_create_assinantes_table.sql
```

#### 3.2. Cadastrar Assinante

Para cadastrar um novo assinante, insira um registro na tabela `assinantes`:

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
  '2025-12-31 23:59:59+00' -- Data de vencimento
);
```

#### 3.3. Gerar API Key (Opcional)

Se quiser usar API Key para autenticação adicional:

```sql
UPDATE assinantes 
SET api_key = generate_api_key() 
WHERE email = 'cliente@exemplo.com';
```

## 🔄 Fluxo de Verificação

### Verificação na Inicialização

1. O `docker-entrypoint.sh` é executado quando o container inicia
2. Verifica se as variáveis obrigatórias estão definidas
3. Faz uma requisição POST para `LICENSE_API_URL` com email e domínio
4. Se a resposta for `status: "ativo"`, o sistema inicia
5. Se não, o container é encerrado com erro

### Verificação Periódica

1. Um cron job é configurado automaticamente no `docker-entrypoint.sh`
2. Executa diariamente às 2h da manhã
3. Verifica a licença da mesma forma
4. Se inválida, encerra o processo do Next.js

## 📡 API de Verificação

### Endpoint

```
POST /api/license/verify
```

### Request Body

```json
{
  "email": "cliente@exemplo.com",
  "dominio": "cliente.com.br",
  "api_key": "opcional" // Se configurado
}
```

### Response (Sucesso)

```json
{
  "status": "ativo",
  "data": {
    "email": "cliente@exemplo.com",
    "dominio": "cliente.com.br",
    "data_vencimento": "2025-12-31T23:59:59.000Z",
    "ultima_verificacao": "2024-01-15T10:30:00.000Z"
  }
}
```

### Response (Erro)

```json
{
  "status": "invalido",
  "message": "Licença não encontrada ou inválida"
}
```

## 🛠️ Testando a Verificação

### Teste Manual

Execute o script de verificação manualmente:

```bash
# Definir variáveis
export LICENSE_EMAIL="seu-email@exemplo.com"
export LICENSE_DOMAIN="seudominio.com.br"
export LICENSE_API_URL="https://seu-projeto.supabase.co/api/license/verify"

# Executar script
bash scripts/verificar-licenca.sh
```

### Teste via cURL

```bash
curl -X POST "https://seu-projeto.supabase.co/api/license/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seu-email@exemplo.com",
    "dominio": "seudominio.com.br"
  }'
```

## 🔒 Segurança

### Credenciais Protegidas

- `LICENSE_SUPABASE_SERVICE_ROLE_KEY`: Nunca é exposta no código ou no cliente
- Fica apenas em variáveis de ambiente do servidor
- Usada apenas na API Route `/api/license/verify`

### Validações

- Email e domínio são obrigatórios
- Verificação de status (`ativo`, `suspenso`, `cancelado`)
- Verificação de data de vencimento
- Logs de todas as verificações (IP, User-Agent, timestamp)

## 📊 Monitoramento

### Logs

Os logs de verificação periódica são salvos em:
```
/var/log/license-check.log
```

### Tabela de Assinantes

A tabela `assinantes` mantém registro de:
- Última verificação
- IP do último acesso
- User-Agent do último acesso
- Próxima verificação agendada

## 🚨 Troubleshooting

### Erro: "Variável LICENSE_EMAIL não está definida"

**Solução**: Adicione a variável no `stack.yml` ou `docker-compose.yml`

### Erro: "Licença não encontrada ou inválida"

**Possíveis causas**:
1. Email ou domínio incorretos
2. Assinante não cadastrado no banco
3. Status diferente de `ativo`
4. Assinatura vencida

**Solução**: Verifique o registro na tabela `assinantes`

### Erro: "Serviço de licenciamento não configurado"

**Solução**: Configure `LICENSE_SUPABASE_URL` e `LICENSE_SUPABASE_SERVICE_ROLE_KEY`

### Sistema não inicia

**Verifique**:
1. Logs do container: `docker logs <container-id>`
2. Se a API de verificação está acessível
3. Se as credenciais do Supabase estão corretas

## 📝 Notas Importantes

1. **Todos os clientes usam o MESMO Supabase** - o isolamento de dados é feito via RLS (Row Level Security)
2. **A tabela `assinantes` fica no mesmo Supabase** que o sistema usa
3. **As credenciais nunca são expostas** no código open source (Service Role Key fica apenas no servidor)
4. **A verificação é server-side** e não pode ser burlada facilmente
5. **O sistema verifica automaticamente** na inicialização e durante o uso (middleware)
6. **Se a licença for inválida**, o sistema não inicia ou bloqueia o acesso

