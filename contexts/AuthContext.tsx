'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Verificar sessão inicial
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('Erro ao verificar sessão:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Escutar mudanças na autenticação (apenas UMA subscription para toda a aplicação)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Removido log excessivo que pode causar confusão
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      router.push('/login')
      // Usar setTimeout para evitar conflitos com recompilação do Next.js
      setTimeout(() => {
        router.refresh()
      }, 100)
    } catch (error: any) {
      // Ignorar erros EBUSY relacionados ao OneDrive sincronizando arquivos .next
      if (error?.code === 'EBUSY' || error?.errno === -4082) {
        console.warn('Aviso: Arquivo temporariamente bloqueado pelo OneDrive. Logout concluído.')
        setUser(null)
        // Forçar redirecionamento mesmo com erro
        window.location.href = '/login'
        return
      }
      // Para outros erros, ainda tentar redirecionar
      console.error('Erro ao fazer logout:', error)
      setUser(null)
      window.location.href = '/login'
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}

