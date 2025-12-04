'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (resetError) {
        setError(resetError.message || 'Erro ao enviar email de recuperação')
        return
      }

      setSuccess(true)
    } catch (err) {
      setError('Erro ao enviar email de recuperação. Tente novamente.')
    } finally {
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

      {/* Right Section - Forgot Password Form */}
      <div className="w-full lg:w-1/3 bg-white flex flex-col justify-center p-8 md:p-12">
        <div className="w-full max-w-md mx-auto">
          {success ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Email enviado!
                </h2>
                <p className="text-gray-600">
                  Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                </p>
              </div>

              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">
                  Email enviado com sucesso! Verifique sua caixa de entrada.
                </p>
              </div>

              <Link
                href="/login"
                className="block w-full text-center bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Voltar para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Esqueceu a senha?
                </h2>
                <p className="text-gray-600 mb-6">
                  Digite seu email e enviaremos um link para redefinir sua senha.
                </p>
              </div>

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
                  {loading ? 'Enviando...' : 'Enviar'}
                </button>
              </div>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Voltar para o login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
