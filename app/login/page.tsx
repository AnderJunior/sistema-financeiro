'use client'

import React, { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'

export const dynamic = 'force-dynamic'

function LoginPageContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Verificar se há mensagem de sucesso na URL
  useEffect(() => {
    const passwordReset = searchParams.get('passwordReset')
    if (passwordReset === 'success') {
      setSuccessMessage('Senha redefinida com sucesso! Faça login com sua nova senha.')
    }
    
    // Verificar se o usuário já está autenticado (após reload)
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const redirectTo = searchParams.get('redirectTo') || '/dashboard'
        console.log('✅ Usuário autenticado detectado, redirecionando para:', redirectTo)
        router.push(redirectTo)
      }
    }
    
    // Aguardar um pouco antes de verificar para garantir que os cookies sejam lidos
    const timeoutId = setTimeout(checkAuth, 500)
    
    return () => clearTimeout(timeoutId)
  }, [searchParams, supabase, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        // Mensagens de erro mais específicas
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos')
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Por favor, confirme seu email antes de fazer login')
        } else {
          setError(signInError.message || 'Erro ao fazer login. Tente novamente.')
        }
        setLoading(false)
        return
      }

      if (data.user && data.session) {
        console.log('✅ Login bem-sucedido!', { user: data.user.id, session: !!data.session })
        
        // Limpar mensagens antes de redirecionar
        setError('')
        setSuccessMessage('')
        
        // Obter o redirectTo da URL ou usar dashboard como padrão
        let redirectTo = searchParams.get('redirectTo') || '/dashboard'
        
        // Decodificar o redirectTo se necessário
        try {
          redirectTo = decodeURIComponent(redirectTo)
        } catch {
          redirectTo = '/dashboard'
        }
        
        // Garantir que redirectTo comece com /
        if (!redirectTo.startsWith('/')) {
          redirectTo = '/' + redirectTo
        }
        
        console.log('🔄 Redirecionando para:', redirectTo)
        
        // Verificar sessão antes de redirecionar
        const { data: { session: checkSession } } = await supabase.auth.getSession()
        console.log('🔍 Sessão verificada:', !!checkSession)
        
        if (checkSession) {
          // Limpar o estado de loading
          setLoading(false)
          
          // Mostrar mensagem de sucesso
          setSuccessMessage('Login realizado com sucesso! Redirecionando...')
          
          // SOLUÇÃO DEFINITIVA: Aguardar um momento e redirecionar diretamente
          // O dashboard vai verificar a autenticação no cliente se o middleware falhar
          setTimeout(() => {
            console.log('🚀 Redirecionando para:', redirectTo)
            window.location.href = redirectTo
          }, 1000)
        } else {
          console.error('❌ Sessão não encontrada após login')
          setError('Erro: sessão não foi estabelecida. Tente novamente.')
          setLoading(false)
        }
      } else {
        console.error('❌ Login falhou - sem usuário ou sessão', { user: !!data.user, session: !!data.session })
        setError('Erro ao estabelecer sessão. Tente novamente.')
        setLoading(false)
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <>
      <div className="min-h-screen flex">
        {/* Left Section - Blue Background with Decorative Elements */}
        <div className="hidden lg:flex lg:w-2/3 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
          {/* Decorative geometric shapes */}
          <div className="absolute inset-0">
            {/* Large circles with blur - animated */}
            <div className="absolute top-20 right-20 w-40 h-40 bg-blue-400/30 rounded-full blur-3xl animate-float"></div>
            <div className="absolute bottom-32 left-16 w-48 h-48 bg-blue-500/25 rounded-full blur-3xl animate-float-reverse"></div>
            <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-blue-300/35 rounded-full blur-2xl animate-drift"></div>
            <div className="absolute top-1/3 left-1/3 w-36 h-36 bg-blue-400/20 rounded-full blur-3xl animate-drift-slow"></div>
            
            {/* Chevron patterns - rotating */}
            <div className="absolute top-40 left-40 w-0 h-0 border-l-[35px] border-l-transparent border-r-[35px] border-r-transparent border-b-[60px] border-b-blue-400/25 animate-rotate" style={{ transformOrigin: 'center' }}></div>
            <div className="absolute bottom-40 right-60 w-0 h-0 border-l-[30px] border-l-transparent border-r-[30px] border-r-transparent border-b-[50px] border-b-blue-300/30 animate-rotate" style={{ transformOrigin: 'center', animationDuration: '25s', animationDirection: 'reverse' }}></div>
            <div className="absolute top-1/4 right-1/3 w-0 h-0 border-l-[25px] border-l-transparent border-r-[25px] border-r-transparent border-b-[40px] border-b-blue-400/20 animate-rotate" style={{ transformOrigin: 'center', animationDuration: '30s' }}></div>
            
            {/* Dots pattern - floating with different delays */}
            <div className="absolute top-32 left-1/4 w-2 h-2 bg-white/40 rounded-full animate-float-delay-1"></div>
            <div className="absolute top-48 left-1/3 w-2 h-2 bg-white/40 rounded-full animate-float-delay-2"></div>
            <div className="absolute top-64 left-1/2 w-2 h-2 bg-white/40 rounded-full animate-float-delay-3"></div>
            <div className="absolute top-80 left-2/3 w-2 h-2 bg-white/40 rounded-full animate-float"></div>
            <div className="absolute bottom-48 right-1/4 w-2 h-2 bg-white/40 rounded-full animate-float-reverse"></div>
            <div className="absolute bottom-64 right-1/3 w-2 h-2 bg-white/40 rounded-full animate-float-delay-1"></div>
            <div className="absolute bottom-80 right-1/2 w-2 h-2 bg-white/40 rounded-full animate-float-delay-2"></div>
            <div className="absolute top-96 left-1/5 w-2 h-2 bg-white/40 rounded-full animate-pulse-slow"></div>
            <div className="absolute bottom-96 right-1/5 w-2 h-2 bg-white/40 rounded-full animate-float-delay-3"></div>
          </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white h-full">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">SEU</span>
              <span className="text-sm font-semibold">LOGO</span>
            </div>
          </div>

          {/* Main text */}
          <div className="flex-1 flex items-center">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold mb-6" style={{ lineHeight: '1.4' }}>
                Seu sistema de gestão completa está aqui!
              </h1>
              <p className="text-lg text-blue-100 max-w-md">
                Gerencie suas finanças, projetos e tarefas de forma simples e eficiente. Tudo em um só lugar para você ter controle total do seu negócio.
              </p>
            </div>
          </div>
        </div>
        </div>

      {/* Right Section - Login Form */}
      <div className="w-full lg:w-1/3 bg-white flex flex-col justify-center p-8 md:p-12">
        <div className="w-full max-w-md mx-auto">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Input
                type="email"
                label="Endereço de email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                disabled={loading}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Senha
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            {successMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">{successMessage}</p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Carregando...
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  )
}
