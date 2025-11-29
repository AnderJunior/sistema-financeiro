# Guia de Verificação do Supabase

## Problema: Login não redireciona para dashboard

Siga estes passos para verificar e corrigir as configurações do Supabase:

### 1. Verificar Site URL
1. Acesse o painel do Supabase: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **Authentication** → **URL Configuration**
4. Verifique o campo **Site URL**:
   - Para desenvolvimento local: `http://localhost:3000`
   - Para produção: sua URL de produção
5. **IMPORTANTE**: Clique em **Save** se fez alguma alteração

### 2. Verificar Redirect URLs
1. Na mesma página (**Authentication** → **URL Configuration**)
2. No campo **Redirect URLs**, adicione estas URLs (uma por linha):
   ```
   http://localhost:3000/dashboard
   http://localhost:3000/login
   http://localhost:3000/reset-password
   http://localhost:3000/**
   ```
3. Se estiver em produção, adicione também:
   ```
   https://seu-dominio.com/dashboard
   https://seu-dominio.com/login
   https://seu-dominio.com/reset-password
   https://seu-dominio.com/**
   ```
4. Clique em **Save**

### 3. Verificar Email Templates (Opcional)
1. Vá em **Authentication** → **Email Templates**
2. Verifique se os templates estão configurados corretamente
3. O template de **Reset Password** deve ter a URL de redirecionamento correta

### 4. Verificar RLS (Row Level Security)
1. Vá em **Authentication** → **Policies**
2. Verifique se as políticas RLS estão configuradas corretamente
3. Se todas as tabelas estão como "Unrestricted", isso pode estar causando problemas

### 5. Verificar Variáveis de Ambiente
No seu arquivo `.env.local` (ou `.env`), verifique se estão corretas:
```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

**Onde encontrar essas informações:**
- **URL**: Settings → API → Project URL
- **ANON KEY**: Settings → API → Project API keys → `anon` `public`

### 6. Limpar Cache e Cookies
1. No navegador, abra o DevTools (F12)
2. Vá em **Application** → **Cookies**
3. Delete todos os cookies relacionados ao Supabase (que começam com `sb-`)
4. Recarregue a página

### 7. Verificar Logs do Supabase
1. No painel do Supabase, vá em **Logs** → **Auth Logs**
2. Verifique se há erros relacionados ao login
3. Verifique se as tentativas de login estão sendo registradas

## Solução Alternativa: Desabilitar temporariamente a verificação de email

Se o problema persistir, você pode desabilitar temporariamente a confirmação de email:

1. Vá em **Authentication** → **Providers** → **Email**
2. Desmarque **Confirm email**
3. Clique em **Save**

**⚠️ ATENÇÃO**: Isso é apenas para desenvolvimento. Em produção, mantenha a confirmação de email ativada.

## Teste após as alterações

1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Feche e reabra o navegador
3. Tente fazer login novamente
4. Verifique os logs no console do navegador e no terminal do servidor





