# Como Limpar Metadados Corrompidos

Se você não consegue fazer login no sistema devido a metadados corrompidos, use uma das opções abaixo:

## Opção 1: Via Supabase Dashboard (Mais Fácil) ⭐

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor** (no menu lateral)
4. Execute o SQL abaixo substituindo `SEU_EMAIL_AQUI` pelo seu email:

```sql
-- Substitua 'SEU_EMAIL_AQUI' pelo seu email
DO $$
DECLARE
    user_id uuid;
    current_metadata jsonb;
    cleaned_metadata jsonb;
    nome_completo text;
BEGIN
    -- Buscar o user_id pelo email
    SELECT id INTO user_id
    FROM auth.users
    WHERE email = 'SEU_EMAIL_AQUI';
    
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não encontrado com este email';
    END IF;
    
    -- Obter metadados atuais
    SELECT raw_user_meta_data INTO current_metadata
    FROM auth.users
    WHERE id = user_id;
    
    -- Criar metadados limpos (apenas nome_completo se existir)
    cleaned_metadata := '{}'::jsonb;
    
    -- Tentar manter nome_completo
    IF current_metadata ? 'nome_completo' THEN
        cleaned_metadata := cleaned_metadata || jsonb_build_object('nome_completo', current_metadata->>'nome_completo');
    ELSIF current_metadata ? 'full_name' THEN
        cleaned_metadata := cleaned_metadata || jsonb_build_object('nome_completo', current_metadata->>'full_name');
    END IF;
    
    -- Atualizar metadados
    UPDATE auth.users
    SET raw_user_meta_data = cleaned_metadata,
        updated_at = now()
    WHERE id = user_id;
    
    RAISE NOTICE 'Metadados limpos com sucesso para o usuário %', user_id;
END $$;
```

5. Clique em **Run** para executar
6. Faça logout e login novamente no sistema

## Opção 2: Limpar Tudo (Remove TODOS os metadados)

Se você quiser remover TODOS os metadados (incluindo nome completo), use este SQL:

```sql
-- Substitua 'SEU_EMAIL_AQUI' pelo seu email
UPDATE auth.users
SET raw_user_meta_data = '{}'::jsonb,
    updated_at = now()
WHERE email = 'SEU_EMAIL_AQUI';
```

## Opção 3: Via Supabase CLI

Se você tem o Supabase CLI instalado:

```bash
# 1. Faça login no Supabase
supabase login

# 2. Conecte ao seu projeto
supabase link --project-ref seu-project-ref

# 3. Execute o SQL
supabase db execute "
UPDATE auth.users
SET raw_user_meta_data = '{}'::jsonb,
    updated_at = now()
WHERE email = 'SEU_EMAIL_AQUI';
"
```

## Opção 4: Via API do Supabase (Programático)

Se você tem acesso à Service Role Key do Supabase, pode usar este script Node.js:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'SUA_SUPABASE_URL'
const supabaseServiceKey = 'SUA_SERVICE_ROLE_KEY'
const userEmail = 'SEU_EMAIL_AQUI'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function limparMetadados() {
  // Listar todos os usuários
  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  
  if (error) {
    console.error('Erro:', error)
    return
  }
  
  // Encontrar o usuário pelo email
  const user = users.find(u => u.email === userEmail.toLowerCase().trim())
  
  if (!user) {
    console.error('Usuário não encontrado')
    return
  }
  
  // Limpar metadados (manter apenas nome_completo se existir)
  const currentMetadata = user.user_metadata || {}
  const cleanedMetadata = {}
  
  if (currentMetadata.nome_completo) {
    cleanedMetadata.nome_completo = currentMetadata.nome_completo
  } else if (currentMetadata.full_name) {
    cleanedMetadata.nome_completo = currentMetadata.full_name
  }
  
  // Atualizar
  const { data, error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { user_metadata: cleanedMetadata }
  )
  
  if (updateError) {
    console.error('Erro ao atualizar:', updateError)
  } else {
    console.log('Metadados limpos com sucesso!')
  }
}

limparMetadados()
```

## Opção 5: Limpar Cookies e Tentar Novamente

Antes de tudo, tente limpar os cookies do navegador:

1. Abra o DevTools (F12)
2. Vá em **Application** > **Cookies**
3. Delete todos os cookies que começam com:
   - `sb-`
   - `supabase`
4. Feche e abra o navegador novamente
5. Tente acessar `/limpar-metadados` novamente

## Verificar se Funcionou

Após limpar os metadados, faça login novamente e verifique:

1. Acesse a página de configurações
2. Veja se o perfil carrega normalmente
3. Se ainda houver problemas, verifique o console do navegador (F12)

---

**Recomendação:** Use a **Opção 1** (Supabase Dashboard) - é a mais simples e segura!


