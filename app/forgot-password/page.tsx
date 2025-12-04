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
        <div className="w-full md:w-1/2 bg-gradient-to-br from-primary-800 to-primary-900 p-8 md:p-12 flex flex-col justify-center text-white relative">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Recuperar senha
            </h1>
            <p className="text-lg md:text-xl text-primary-100">
              Não se preocupe! Enviaremos instruções para redefinir sua senha.
            </p>
          </div>
        </div>

        {/* Right Section - Form */}
        <div className="w-full md:w-1/2 bg-white p-8 md:p-12 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Esqueceu a senha?
              </h2>
              <p className="text-gray-600">
                Digite seu email e enviaremos um link para redefinir sua senha.
              </p>
            </div>

            {success ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-600">
                    Email enviado! Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="block text-center text-primary-600 hover:text-primary-700 font-medium"
                >
                  Voltar para o login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-6">
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-700 hover:bg-primary-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
                >
                  {loading ? 'Enviando...' : 'ENVIAR'}
                </button>

                <Link
                  href="/login"
                  className="block text-center text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                  Voltar para o login
                </Link>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}












