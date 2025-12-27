'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdmin } from '@/hooks/useAdmin'
import { useAuth } from '@/contexts/AuthContext'
import { PageLoading } from './PageLoading'

interface AdminGuardProps {
  children: React.ReactNode
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { isAdmin, loading } = useAdmin()
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Se não está autenticado, redirecionar para login de admin
        router.push('/admin/login')
      } else if (!isAdmin) {
        // Se está autenticado mas não é admin, redirecionar para dashboard
        router.push('/dashboard')
      }
    }
  }, [isAdmin, loading, user, router])

  if (loading) {
    return <PageLoading />
  }

  if (!user || !isAdmin) {
    return null
  }

  return <>{children}</>
}

