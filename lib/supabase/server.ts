import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database.types'

export async function createClient() {
  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                // Garantir que os cookies sejam acessíveis
                httpOnly: options?.httpOnly ?? false,
                sameSite: options?.sameSite ?? 'lax',
                secure: options?.secure ?? process.env.NODE_ENV === 'production',
              })
            })
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            console.error('Error setting cookies in server component:', error)
          }
        },
      },
    }
  )

  // IMPORTANTE: Tentar múltiplas formas de obter a sessão
  // Primeiro, tentar getSession()
  let { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  // Se não há sessão, tentar getUser() que pode fazer refresh automático
  if (!session) {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // Se getUser() retornou um usuário, tentar getSession() novamente
    if (user && !session) {
      const retrySession = await supabase.auth.getSession()
      session = retrySession.data.session
    }
  }

  return supabase
}

