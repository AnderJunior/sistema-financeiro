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
        const { data: { session }, error } = await supabase.auth.getSession()
        
        // Se houver erro ao obter sessão, pode ser problema com metadados corrompidos
        if (error) {
          console.error('Erro ao verificar sessão:', error)
          // Tentar limpar metadados problemáticos se possível
          try {
            const { data: { user: currentUser } } = await supabase.auth.getUser()
            if (currentUser?.user_metadata?.foto_url) {
              // Metadados podem estar corrompidos - tentar limpar
              console.warn('Detectados metadados de foto que podem estar causando problema')
            }
          } catch (cleanupError) {
            console.error('Erro ao tentar limpar metadados:', cleanupError)
          }
        }
        
        // Tentar obter usuário mesmo se sessão falhou
        if (!session?.user) {
          try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              // Clonar usuário sem metadados problemáticos se necessário
              const safeUser = { ...user }
              if (safeUser.user_metadata?.foto_url && typeof safeUser.user_metadata.foto_url === 'string' && safeUser.user_metadata.foto_url.length > 50000) {
                // Foto muito grande, remover temporariamente
                console.warn('Foto muito grande nos metadados, removendo temporariamente')
                delete safeUser.user_metadata.foto_url
              }
              setUser(safeUser)
            } else {
              setUser(null)
            }
          } catch (getUserError) {
            console.error('Erro ao obter usuário:', getUserError)
            setUser(null)
          }
        } else {
          // Clonar usuário e verificar metadados
          const safeUser = { ...session.user }
          if (safeUser.user_metadata?.foto_url && typeof safeUser.user_metadata.foto_url === 'string' && safeUser.user_metadata.foto_url.length > 50000) {
            // Foto muito grande, remover dos metadados locais
            console.warn('Foto muito grande nos metadados, removendo localmente')
            delete safeUser.user_metadata.foto_url
          }
          setUser(safeUser)
        }
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
      try {
        if (session?.user) {
          // Clonar usuário e verificar metadados
          const safeUser = { ...session.user }
          if (safeUser.user_metadata?.foto_url && typeof safeUser.user_metadata.foto_url === 'string' && safeUser.user_metadata.foto_url.length > 50000) {
            // Foto muito grande, remover dos metadados locais
            console.warn('Foto muito grande nos metadados, removendo localmente')
            delete safeUser.user_metadata.foto_url
          }
          setUser(safeUser)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Erro ao processar mudança de autenticação:', error)
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const signOut = async () => {
    try {
      // Fazer logout no Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Erro ao fazer signOut no Supabase:', error)
      }
      
      // Limpar estado do usuário
      setUser(null)
      
      // Redirecionar para login usando window.location para garantir que funcione
      window.location.href = '/login'
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
      // Sempre redirecionar para login, mesmo em caso de erro
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

