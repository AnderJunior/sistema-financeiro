# Implementação de Isolamento de Dados por Usuário (SaaS)

Este documento descreve a implementação completa de isolamento de dados por usuário, transformando o sistema em um modelo SaaS seguro.

## 🔒 Segurança Implementada

### 1. Row Level Security (RLS)
- **RLS habilitado** em todas as 18 tabelas do sistema
- Cada tabela possui políticas de segurança que garantem:
  - **SELECT**: Usuários só podem visualizar seus próprios dados
  - **INSERT**: Usuários só podem inserir dados com seu próprio `user_id`
  - **UPDATE**: Usuários só podem atualizar seus próprios dados
  - **DELETE**: Usuários só podem deletar seus próprios dados

### 2. Triggers de Segurança
- **Trigger `set_user_id()`**: Define automaticamente o `user_id` em todos os INSERTs
- **Trigger `prevent_user_id_change()`**: Previne alteração de `user_id` após criação
- Todos os triggers validam que o `user_id` corresponde ao usuário autenticado

### 3. Proteção em Múltiplas Camadas
- **Nível de Banco de Dados**: RLS e triggers garantem isolamento
- **Nível de Aplicação**: Middleware verifica autenticação
- **Nível de API**: Todas as queries são automaticamente filtradas por `user_id`

## 📋 Tabelas Protegidas

As seguintes tabelas possuem isolamento completo de dados:

1. `clientes`
2. `clientes_grupos`
3. `configuracoes_sistema`
4. `contas_financeiras`
5. `financeiro_categorias`
6. `financeiro_lancamentos`
7. `fluxos_automacao`
8. `grupos`
9. `kanban_colunas`
10. `notificacoes_log`
11. `projetos`
12. `servicos`
13. `tarefas`
14. `tarefas_atividades`
15. `tarefas_comentarios`
16. `tarefas_kanban_colunas`
17. `transferencias_bancarias`
18. `workflow_executions`
19. `workflow_execution_node_states`

## 🚀 Como Aplicar a Migration

### Passo 1: Executar a Migration no Supabase

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Abra o arquivo `supabase/migrations/001_add_user_isolation_rls.sql`
4. Copie todo o conteúdo e execute no SQL Editor
5. Aguarde a conclusão (pode levar alguns minutos)

### Passo 2: Atualizar Tipos TypeScript (Opcional mas Recomendado)

Após executar a migration, atualize os tipos do banco de dados:

```bash
# Se você usa Supabase CLI
npx supabase gen types typescript --project-id seu-project-id > types/database.types.ts

# Ou gere manualmente através do Supabase Dashboard:
# Settings > API > Generate TypeScript types
```

### Passo 3: Migrar Dados Existentes (Se Aplicável)

**⚠️ IMPORTANTE**: Se você já possui dados no banco antes de aplicar esta migration:

1. **NÃO execute a migration diretamente** se houver dados existentes
2. Primeiro, atribua `user_id` a todos os registros existentes
3. Depois execute a migration

Exemplo de script para migrar dados existentes:

```sql
-- ATENÇÃO: Execute este script ANTES da migration se houver dados existentes
-- Substitua 'user-id-aqui' pelo ID do usuário que deve possuir os dados existentes

UPDATE clientes SET user_id = 'user-id-aqui' WHERE user_id IS NULL;
UPDATE servicos SET user_id = 'user-id-aqui' WHERE user_id IS NULL;
UPDATE grupos SET user_id = 'user-id-aqui' WHERE user_id IS NULL;
-- ... repita para todas as tabelas
```

## 🔧 Como Funciona

### Inserção Automática de `user_id`

Com os triggers implementados, você **não precisa** incluir `user_id` manualmente nas operações de INSERT. O trigger define automaticamente:

```typescript
// ✅ Funciona automaticamente - user_id é definido pelo trigger
const { data } = await supabase
  .from('clientes')
  .insert([{
    nome: 'João Silva',
    tipo_pessoa: 'PF',
    // user_id será definido automaticamente pelo trigger
  }])
```

### Queries Automáticas Filtradas

Todas as queries são automaticamente filtradas pelo RLS:

```typescript
// ✅ Retorna apenas clientes do usuário autenticado
const { data } = await supabase
  .from('clientes')
  .select('*')
// RLS garante que apenas dados do usuário autenticado sejam retornados
```

### Helpers Disponíveis

Use os helpers em `lib/supabase/auth-helpers.ts`:

```typescript
import { getCurrentUserId, requireAuth } from '@/lib/supabase/auth-helpers'

// Obter ID do usuário atual
const userId = await getCurrentUserId()

// Garantir autenticação (lança erro se não autenticado)
const userId = await requireAuth()
```

## 🛡️ Garantias de Segurança

### 1. Proteção Contra Acesso Não Autorizado
- ❌ Usuários **não podem** acessar dados de outros usuários via API
- ❌ Usuários **não podem** modificar requisições HTTP para acessar outros dados
- ❌ Usuários **não podem** usar o console do navegador para acessar dados de outros

### 2. Proteção no Nível do Banco de Dados
- Todas as políticas RLS são aplicadas **antes** de qualquer query ser executada
- Mesmo usando Service Role Key, as políticas RLS continuam ativas (a menos que explicitamente desabilitadas)

### 3. Validação Automática
- Triggers garantem que `user_id` sempre corresponde ao usuário autenticado
- Tentativas de inserir dados com `user_id` diferente são bloqueadas

## ⚠️ Considerações Importantes

### Dados Existentes
Se você já possui dados no banco:
1. Atribua `user_id` a todos os registros antes de habilitar RLS
2. Ou crie uma migration intermediária para migrar dados existentes

### Service Role Key
- A **Service Role Key** pode bypassar RLS se necessário
- Use apenas em operações administrativas ou background jobs
- **Nunca** exponha a Service Role Key no frontend

### Performance
- Índices foram criados em todas as colunas `user_id` para otimizar queries
- Queries filtradas por `user_id` são muito eficientes

## 🧪 Testando a Segurança

### Teste 1: Verificar Isolamento de Dados
1. Crie dois usuários diferentes
2. Faça login com o primeiro usuário e crie alguns dados
3. Faça login com o segundo usuário
4. Verifique que o segundo usuário **não vê** os dados do primeiro

### Teste 2: Tentar Acessar Dados de Outro Usuário
1. Com o usuário A autenticado, tente acessar um ID de registro do usuário B
2. A query deve retornar vazia ou erro, mesmo que o ID exista

### Teste 3: Tentar Inserir com user_id Diferente
1. Tente inserir um registro com `user_id` de outro usuário
2. O trigger deve bloquear a operação

## 📝 Próximos Passos

1. ✅ Execute a migration no Supabase
2. ✅ Atualize os tipos TypeScript (se necessário)
3. ✅ Teste o isolamento de dados com múltiplos usuários
4. ✅ Configure backups regulares (importante para SaaS)
5. ✅ Configure monitoramento de segurança

## 🆘 Troubleshooting

### Erro: "new row violates row-level security policy"
- **Causa**: Tentativa de inserir dados sem autenticação ou com `user_id` incorreto
- **Solução**: Certifique-se de que o usuário está autenticado e que os triggers estão funcionando

### Erro: "Cannot change user_id after creation"
- **Causa**: Tentativa de alterar `user_id` em um UPDATE
- **Solução**: Este é o comportamento esperado. `user_id` não pode ser alterado após criação

### Dados não aparecem após migration
- **Causa**: Dados existentes sem `user_id`
- **Solução**: Atribua `user_id` aos dados existentes antes de habilitar RLS

## 📚 Referências

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)


