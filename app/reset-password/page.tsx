'use client'

import React, { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'

export const dynamic = 'force-dynamic'

function ResetPasswordPageContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    // Verificar se há um token de recuperação na URL (Supabase adiciona automaticamente)
    // O Supabase gerencia isso através do callback URL
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // Se não há sessão, pode ser que o link expirou ou é inválido
        // Mas vamos permitir que o usuário tente redefinir mesmo assim
        // O Supabase vai validar quando tentar atualizar a senha
      }
    }
    checkSession()
  }, [searchParams, supabase])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      setLoading(false)
      return
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      })

      if (updateError) {
        setError(updateError.message || 'Erro ao redefinir senha')
        return
      }

      setSuccess(true)
      
      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        router.push('/login?passwordReset=success')
      }, 2000)
    } catch (err) {
      setError('Erro ao redefinir senha. Tente novamente.')
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
        <div className="w-full md:w-1/2 bg-gradient-to-br from-primary-800 to-primary-900 p-8 md:p-12 flex flex-col justify-between text-white relative">
          {/* Logo */}
          <div className="flex items-center">
            <Image
              src="/logos/para-fundos-escuros-horizontal.png"
              alt="Logo do Sistema"
              width={200}
              height={60}
              className="h-auto"
              priority
            />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Redefinir senha
            </h1>
            <p className="text-lg md:text-xl text-primary-100">
              Digite sua nova senha para continuar.
            </p>
          </div>
        </div>

        {/* Right Section - Form */}
        <div className="w-full md:w-1/2 bg-white p-8 md:p-12 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto">
            {/* Logo para fundo claro */}
            <div className="mb-6 flex justify-center md:justify-start">
              <Image
                src="/logos/para-fundos-claros-horizontal.png"
                alt="Logo do Sistema"
                width={180}
                height={54}
                className="h-auto"
                priority
              />
            </div>
            <div className="mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                Nova senha
              </h2>
              <p className="text-gray-600">
                Escolha uma senha forte para sua conta.
              </p>
            </div>

            {success ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-600">
                    Senha redefinida com sucesso! Redirecionando para o login...
                  </p>
                </div>
                <Link
                  href="/login"
                  className="block text-center text-primary-600 hover:text-primary-700 font-medium"
                >
                  Ir para o login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <Input
                    type="password"
                    label="Nova senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <Input
                    type="password"
                    label="Confirmar nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
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
                  {loading ? 'Redefinindo...' : 'REDEFINIR SENHA'}
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Carregando...
        </div>
      }
    >
      <ResetPasswordPageContent />
    </Suspense>
  )
}
