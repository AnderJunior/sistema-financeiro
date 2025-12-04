import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Criar resposta primeiro
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Criar cliente Supabase
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Atualizar cookies no request e response
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            if (options) {
              response.cookies.set(name, value, options)
            } else {
              response.cookies.set(name, value)
            }
          })
        },
      },
    }
  )

  // IMPORTANTE: Atualizar a sessão primeiro - isso sincroniza os cookies
  // getSession() atualiza os cookies no response automaticamente
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Obter o usuário da sessão
  let user = session?.user
  
  // Obter cookies para verificação ANTES de tentar refresh
  const allCookies = request.cookies.getAll()
  const supabaseCookies = allCookies.filter(c => 
    c.name.includes('supabase') || c.name.includes('sb-') || c.name.includes('auth-token')
  )
  
  // Verificar se há cookies de autenticação
  const hasAuthCookies = supabaseCookies.length > 0
  
  // Se não há usuário mas há cookies do Supabase, tentar múltiplas vezes
  if (!user && hasAuthCookies) {
    // Tentar getUser() que faz refresh automático da sessão
    const userResult = await supabase.auth.getUser()
    user = userResult.data.user
    
    // Se ainda não há usuário, tentar obter a sessão novamente após getUser()
    if (!user) {
      const retrySession = await supabase.auth.getSession()
      user = retrySession.data.session?.user
    }
  }
  
  // Logs apenas para debug (comentar em produção se necessário)
  // console.log('[Middleware]', {
  //   pathname: request.nextUrl.pathname,
  //   hasSession: !!session,
  //   hasUser: !!user,
  //   userId: user?.id,
  //   totalCookies: allCookies.length,
  //   supabaseCookies: supabaseCookies.map(c => c.name),
  // })

  // Rotas públicas que não precisam de autenticação nem assinatura ativa
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/licenca-invalida']
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )


  // Se o usuário não está autenticado e tenta acessar rota protegida
  if (!user && !isPublicRoute) {
    // Se há cookies do Supabase mas não há usuário, pode ser problema de timing
    // Permitir que a página carregue e verifique no cliente
    // Isso é normal após login quando os cookies ainda não foram totalmente processados
    if (hasAuthCookies) {
      // Permitir acesso - a página vai verificar autenticação no cliente se necessário
      // Retornar o response que já foi atualizado pelo Supabase
      return response
    }
    
    // Se não há cookies do Supabase, realmente não está autenticado
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Se o usuário está autenticado e tenta acessar página de login/registro
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')) {
    // Verificar se tem assinatura ativa antes de redirecionar
    try {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )

      const { data: assinante, error: errorAssinante } = await supabaseAdmin
        .from('assinantes')
        .select('status, id, plano_nome')
        .eq('user_id', user.id)
        .in('status', ['ativo', 'teste'])
        .maybeSingle()

      // Se não tem assinatura ativa, redirecionar para google.com
      if (!assinante) {
        return NextResponse.redirect('https://google.com')
      }

      // Tem assinatura ativa - redirecionar para dashboard
      const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
      response.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    } catch (error: any) {
      // Em caso de erro, redirecionar para google.com
      return NextResponse.redirect('https://google.com')
    }
  }

  // VERIFICAÇÃO ÚNICA: Verificar assinatura ativa se o usuário está autenticado e não está em rota pública/API
  if (user && !isPublicRoute && !request.nextUrl.pathname.startsWith('/api/')) {
    try {
      // Usar Service Role Key para verificar assinatura (acesso à tabela assinantes)
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )

      // Verificar se o usuário tem assinatura com status "ativo" ou "teste"
      const { data: assinanteAtiva, error: errorAtiva } = await supabaseAdmin
        .from('assinantes')
        .select('status, id, plano_nome, data_vencimento')
        .eq('user_id', user.id)
        .in('status', ['ativo', 'teste'])
        .maybeSingle()

      // Se houve erro na query
      if (errorAtiva) {
        // Erro PGRST116 = nenhum registro encontrado (não tem assinatura ativa)
        if (errorAtiva.code === 'PGRST116') {
          // Não tem assinatura ativa - redirecionar para google.com
          return NextResponse.redirect('https://google.com')
        }
        
        // Em caso de erro técnico, redirecionar para google.com (mais seguro)
        return NextResponse.redirect('https://google.com')
      }

      // Se não encontrou assinante ativo, redirecionar para google.com
      if (!assinanteAtiva) {
        return NextResponse.redirect('https://google.com')
      }

      // Se chegou aqui, tem assinatura ativa - permitir acesso
    } catch (error: any) {
      // Em caso de erro inesperado, redirecionar para google.com
      return NextResponse.redirect('https://google.com')
    }
  }
  
  // Retornar o response que foi atualizado pelo Supabase com os cookies corretos
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

