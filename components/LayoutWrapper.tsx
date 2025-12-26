'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'
import { PageLoading } from '@/components/PageLoading'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Verificar se estamos em uma página de autenticação
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/reset-password'

  if (isAuthPage) {
    // Layout fullscreen sem sidebar e topbar
    return (
      <>
        <PageLoading />
        {children}
      </>
    )
  }

  // Layout padrão com sidebar e topbar
  return (
    <>
      <PageLoading />
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </>
  )
}

