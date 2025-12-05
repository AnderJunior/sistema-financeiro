'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('')

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
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })

      if (signUpError) {
        // Mensagens de erro mais específicas
        if (signUpError.message.includes('already registered')) {
          setError('Este email já está cadastrado. Tente fazer login.')
        } else if (signUpError.message.includes('Password')) {
          setError('A senha deve ter pelo menos 6 caracteres')
        } else {
          setError(signUpError.message || 'Erro ao criar conta. Tente novamente.')
        }
        setLoading(false)
        return
      }

      if (data.user) {
        // Verificar se o email precisa ser confirmado
        if (data.user.email_confirmed_at) {
          router.push('/dashboard')
          router.refresh()
        } else {
          setError('')
          setSuccessMessage('Conta criada com sucesso! Verifique seu email para confirmar sua conta antes de fazer login.')
        }
      }
    } catch (err) {
      setError('Erro ao criar conta. Tente novamente.')
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
              Crie sua conta
            </h1>
            <p className="text-lg md:text-xl text-primary-100">
              Junte-se ao Sistema Financeiro e comece a gerenciar suas finanças de forma inteligente e automatizada.
            </p>
          </div>
        </div>

        {/* Right Section - Register Form */}
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
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Cadastro</h2>
              <Link
                href="/login"
                className="px-4 py-2 border-2 border-primary-600 text-primary-600 rounded-lg font-semibold text-sm hover:bg-primary-50 transition-colors"
              >
                ENTRAR
              </Link>
            </div>

            <form onSubmit={handleRegister} className="space-y-6">
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
                <Input
                  type="password"
                  label="Senha"
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
                  label="Confirmar senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                {loading ? 'Criando conta...' : 'CADASTRAR'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

