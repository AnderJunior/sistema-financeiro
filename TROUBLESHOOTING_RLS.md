# Troubleshooting: Cliente não encontrado após implementar RLS

## Problema
Após implementar RLS, ao clicar em um cliente recém-cadastrado, aparece "Cliente não encontrado".

## Possíveis Causas

### 1. Cliente criado sem `user_id`
O trigger pode não estar funcionando ou o cliente foi criado antes do RLS ser habilitado.

**Como verificar:**
```sql
-- No Supabase SQL Editor, execute:
SELECT id, nome, user_id, created_at 
FROM clientes 
ORDER BY created_at DESC 
LIMIT 10;
```

**Se `user_id` for NULL:**
- O trigger não está funcionando
- Execute a migration `002_fix_rls_debug.sql` para corrigir

### 2. Sessão não está sendo passada corretamente
O servidor pode não estar recebendo a sessão do usuário corretamente.

**Como verificar:**
1. Abra o console do navegador (F12)
2. Vá para a aba Network
3. Clique em um cliente
4. Verifique se os cookies estão sendo enviados na requisição

### 3. RLS bloqueando a query
O RLS pode estar bloqueando porque o `user_id` do cliente não corresponde ao usuário autenticado.

**Como verificar:**
```sql
-- Verifique qual usuário está autenticado
SELECT auth.uid() as current_user_id;

-- Verifique o user_id dos clientes
SELECT id, nome, user_id FROM clientes LIMIT 10;

-- Compare os IDs
```

## Soluções Rápidas

### Solução 1: Recriar os clientes após habilitar RLS

Se você apagou todos os dados e está recriando:

1. **Certifique-se de estar autenticado** antes de criar clientes
2. Crie um novo cliente
3. Verifique se o `user_id` foi definido:
   ```sql
   SELECT id, nome, user_id FROM clientes ORDER BY created_at DESC LIMIT 1;
   ```
4. Se `user_id` for NULL, o trigger não está funcionando - execute `002_fix_rls_debug.sql`

### Solução 2: Atribuir `user_id` manualmente aos clientes existentes

Se você tem clientes sem `user_id`:

```sql
-- Substitua 'SEU-USER-ID' pelo seu user_id
UPDATE clientes 
SET user_id = 'SEU-USER-ID' 
WHERE user_id IS NULL;

-- Para obter seu user_id:
SELECT id, email FROM auth.users;
```

### Solução 3: Verificar se a migration foi executada corretamente

1. Acesse o Supabase Dashboard
2. Vá em **Database** → **Policies**
3. Verifique se existem políticas RLS para a tabela `clientes`
4. Deve haver 4 políticas: SELECT, INSERT, UPDATE, DELETE

### Solução 4: Verificar triggers

```sql
-- Verificar se os triggers existem
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'clientes'
  AND trigger_name LIKE '%user_id%';
```

Deve retornar 2 triggers:
- `set_user_id_clientes` (BEFORE INSERT)
- `prevent_user_id_change_clientes` (BEFORE UPDATE)

## Teste Completo

Execute este teste passo a passo:

1. **Faça login no sistema**
2. **Abra o console do navegador (F12)**
3. **Execute no console:**
   ```javascript
   // Verificar se está autenticado
   const supabase = window.supabase || (await import('/lib/supabase/client')).createClient();
   const { data: { user } } = await supabase.auth.getUser();
   console.log('User ID:', user?.id);
   ```
4. **Crie um novo cliente pelo sistema**
5. **No Supabase SQL Editor, execute:**
   ```sql
   SELECT id, nome, user_id FROM clientes ORDER BY created_at DESC LIMIT 1;
   ```
6. **Compare o `user_id` do cliente com o ID do usuário do passo 3**
   - Devem ser iguais
7. **Tente acessar a página de detalhes do cliente**
   - Se ainda não funcionar, verifique os logs do servidor

## Logs Úteis

Adicione logs temporários na página de detalhes para debug:

```typescript
// Em app/clientes/[id]/page.tsx
const { data: { user } } = await supabase.auth.getUser()
console.log('User:', user?.id)
console.log('Cliente ID:', params.id)

const { data: cliente, error } = await supabase
  .from('clientes')
  .select('*')
  .eq('id', params.id)
  .single()

console.log('Cliente:', cliente)
console.log('Error:', error)
```

## Contato

Se nenhuma das soluções funcionar, verifique:
1. Se a migration `001_add_user_isolation_rls.sql` foi executada completamente
2. Se há erros no console do navegador
3. Se há erros nos logs do Supabase (Dashboard → Logs)


