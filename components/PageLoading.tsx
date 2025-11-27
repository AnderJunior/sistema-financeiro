'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export function PageLoading() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const prevPathnameRef = useRef(pathname)
  const showTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null)
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Limpar todos os timers
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current)
      showTimerRef.current = null
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current)
      safetyTimerRef.current = null
    }

    // Se o pathname mudou
    if (pathname !== prevPathnameRef.current) {
      prevPathnameRef.current = pathname
      
      // Mostrar loading após 200ms (só se realmente demorar para evitar flickering)
      showTimerRef.current = setTimeout(() => {
        setLoading(true)
        
        // Esconder após 300ms quando mostrar (total de 500ms desde a mudança)
        hideTimerRef.current = setTimeout(() => {
          setLoading(false)
        }, 300)
      }, 200)
      
      // Timeout de segurança: sempre esconder após máximo 1 segundo
      safetyTimerRef.current = setTimeout(() => {
        setLoading(false)
      }, 1000)
    } else {
      // Se não mudou, garantir que não está em loading
      setLoading(false)
    }

    // Cleanup: sempre limpar quando pathname mudar
    return () => {
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current)
        showTimerRef.current = null
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
      if (safetyTimerRef.current) {
        clearTimeout(safetyTimerRef.current)
        safetyTimerRef.current = null
      }
      setLoading(false)
    }
  }, [pathname])

  if (!loading) return null

  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
        <p className="text-gray-600 font-medium">Carregando...</p>
      </div>
    </div>
  )
}
