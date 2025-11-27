import { createServerClient } from '@supabase/ssr'
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

  // Rotas públicas que não precisam de autenticação
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password']
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
    // console.log('[Middleware] ✅ Usuário autenticado, redirecionando para dashboard')
    const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url))
    // Copiar cookies atualizados para a resposta de redirecionamento
    response.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }
  
  // console.log('[Middleware] ✅ Permitindo acesso a:', request.nextUrl.pathname)

  // Retornar o response que foi atualizado pelo Supabase com os cookies corretos
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

