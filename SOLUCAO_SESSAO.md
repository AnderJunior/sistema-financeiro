# Solução: Problema de Sessão Não Encontrada no Servidor

## Problema Identificado

A página de teste mostra `"authError": "Auth session missing!"`, o que significa que a sessão não está sendo passada corretamente do cliente (browser) para o servidor (Next.js Server Components).

## Causa Raiz

O problema ocorre porque:
1. Os cookies de autenticação estão sendo salvos no cliente
2. Mas quando o servidor tenta ler esses cookies, eles não estão disponíveis ou não estão sendo lidos corretamente
3. Isso faz com que o RLS bloqueie todas as queries porque não há usuário autenticado

## Soluções Implementadas

### 1. Melhorias no Cliente do Servidor (`lib/supabase/server.ts`)

- Adicionado refresh automático da sessão
- Melhor tratamento de cookies
- Tentativa de obter usuário se a sessão não estiver disponível

### 2. Página de Teste (`/test-auth`)

- Criada para diagnosticar problemas de autenticação
- Mostra informações detalhadas sobre sessão e usuário

## Solução Rápida: Verificar Cookies

### Passo 1: Verificar se os cookies estão sendo salvos

1. Abra o DevTools (F12)
2. Vá para a aba **Application** (ou **Armazenamento**)
3. Clique em **Cookies** → `http://localhost:3000`
4. Procure por cookies que começam com:
   - `sb-`
   - `supabase.auth.token`

**Se não houver cookies:**
- Faça logout e login novamente
- Verifique se o login está funcionando corretamente

### Passo 2: Verificar se está autenticado no cliente

No console do navegador (F12), execute:

```javascript
// Verificar sessão no cliente
const supabase = (await import('/lib/supabase/client')).createClient();
const { data: { session } } = await supabase.auth.getSession();
console.log('Sessão:', session);
console.log('User ID:', session?.user?.id);
```

**Se a sessão existir no cliente mas não no servidor:**
- O problema é na passagem de cookies do cliente para o servidor
- Continue para o Passo 3

### Passo 3: Forçar atualização da sessão

1. Faça logout
2. Limpe os cookies do navegador
3. Faça login novamente
4. Acesse `/test-auth` para verificar

### Passo 4: Verificar configuração do Supabase

Certifique-se de que as variáveis de ambiente estão corretas:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
```

## Solução Alternativa: Usar Client Components Temporariamente

Se o problema persistir, você pode temporariamente usar Client Components para páginas que precisam de autenticação:

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function ClienteDetailPage({ params }: { params: { id: string } }) {
  const [cliente, setCliente] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadCliente() {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', params.id)
        .single()
      
      if (error) {
        console.error('Erro:', error)
      } else {
        setCliente(data)
      }
      setLoading(false)
    }
    
    loadCliente()
  }, [params.id, supabase])

  if (loading) return <div>Carregando...</div>
  if (!cliente) return <div>Cliente não encontrado</div>
  
  // ... resto do código
}
```

**Nota:** Esta é uma solução temporária. O ideal é resolver o problema de cookies.

## Verificação Final

Após aplicar as correções:

1. Acesse `/test-auth`
2. Verifique se:
   - `user` não é `null`
   - `authError` é `null`
   - `session` não é `null`
   - `Clientes encontrados` mostra seus clientes

Se tudo estiver correto, a página de detalhes do cliente deve funcionar.

## Se Ainda Não Funcionar

1. Verifique os logs do servidor (terminal onde o Next.js está rodando)
2. Verifique os logs do Supabase (Dashboard → Logs)
3. Verifique se há erros no console do navegador
4. Tente em modo anônimo/privado para descartar problemas de cache

## Próximos Passos

Se o problema persistir após todas essas verificações, pode ser necessário:
1. Verificar configurações de CORS no Supabase
2. Verificar configurações de cookies no Supabase
3. Verificar se há algum proxy ou middleware interferindo

