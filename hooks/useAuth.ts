'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useAuth(redirectToLogin = true) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
        } else if (redirectToLogin) {
          // Redirecionar para login se não houver sessão
          router.push('/login')
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error)
        if (redirectToLogin) {
          router.push('/login')
        }
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        setUser(null)
        if (redirectToLogin) {
          router.push('/login')
        }
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase, redirectToLogin])

  return { user, loading }
}









