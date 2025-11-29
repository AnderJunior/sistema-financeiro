'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Play } from 'lucide-react'

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const passwordReset = searchParams.get('passwordReset')
    if (passwordReset === 'true') {
      setSuccessMessage('Senha redefinida com sucesso! Você já pode fazer login.')
    }
  }, [searchParams])
    
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary-50 via-primary-100 to-primary-200 relative overflow-hidden">
      {/* Background decorative circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-primary-200 rounded-full opacity-30 blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary-300 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary-200 rounded-full opacity-20 blur-3xl"></div>
      </div>

      {/* Main container */}
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col md:flex-row">
        {/* Left Section - Welcome */}
        <div className="w-full md:w-1/2 bg-gradient-to-br from-primary-800 to-primary-900 p-8 md:p-12 flex flex-col justify-between text-white relative">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Bem-vindo ao Sistema Financeiro!
            </h1>
            <p className="text-lg md:text-xl text-primary-100 mb-8">
              Uma ferramenta inteligente, segura e robusta para gestão financeira automatizada.
            </p>
          </div>

          {/* Video placeholder */}
          <div className="relative w-full aspect-video bg-primary-700 rounded-xl overflow-hidden mb-4 group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
              {/* Placeholder image/content */}
              <div className="w-full h-full flex items-center justify-center bg-primary-700">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-all">
                    <Play className="w-10 h-10 text-white ml-1" fill="white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-primary-200 text-center">
            Assista ao vídeo para mais informações
          </p>
        </div>

        {/* Right Section - Login Form */}
        <div className="w-full md:w-1/2 bg-white p-8 md:p-12 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Login</h2>
              <Link
                href="/register"
                className="px-4 py-2 border-2 border-primary-600 text-primary-600 rounded-lg font-semibold text-sm hover:bg-primary-50 transition-colors"
              >
                CADASTRAR
              </Link>
            </div>

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
                <div className="flex justify-between items-center mb-1">
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-700 hover:bg-primary-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
              >
                {loading ? 'Entrando...' : 'ENTRAR'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

