import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook para cachear dados do Supabase que raramente mudam
 * Evita múltiplas queries desnecessárias para os mesmos dados
 */
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

export function useSupabaseCache<T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  options?: {
    ttl?: number // Time to live em milissegundos
    enabled?: boolean
  }
): { data: T | null; loading: boolean; error: Error | null; refetch: () => Promise<void> } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const mountedRef = useRef(true)
  const ttl = options?.ttl ?? CACHE_TTL

  const fetchData = async () => {
    // Verificar cache primeiro
    const cached = cache.get(cacheKey)
    const now = Date.now()

    if (cached && (now - cached.timestamp) < ttl) {
      if (mountedRef.current) {
        setData(cached.data)
        setLoading(false)
        setError(null)
      }
      return
    }

    // Buscar dados
    try {
      setLoading(true)
      const result = await queryFn()
      
      // Atualizar cache
      cache.set(cacheKey, { data: result, timestamp: now })
      
      if (mountedRef.current) {
        setData(result)
        setLoading(false)
        setError(null)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err as Error)
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    mountedRef.current = true
    
    if (options?.enabled !== false) {
      fetchData()
    } else {
      setLoading(false)
    }

    return () => {
      mountedRef.current = false
    }
  }, [cacheKey, options?.enabled])

  const refetch = async () => {
    // Limpar cache e buscar novamente
    cache.delete(cacheKey)
    await fetchData()
  }

  return { data, loading, error, refetch }
}

/**
 * Função auxiliar para invalidar cache específico
 */
export function invalidateCache(cacheKey: string) {
  cache.delete(cacheKey)
}

/**
 * Função auxiliar para limpar todo o cache
 */
export function clearCache() {
  cache.clear()
}

