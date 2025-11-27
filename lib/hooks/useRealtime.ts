import { useEffect, useState, useRef, useMemo } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook genérico para subscriptions Realtime do Supabase
 * Atualiza automaticamente os dados quando há mudanças no banco
 */
export function useRealtime<T>(
  table: string,
  initialData: T[],
  options?: {
    filter?: string
    orderBy?: { column: string; ascending?: boolean }
    limit?: number
  }
) {
  const [data, setData] = useState<T[]>(initialData)
  const [loading, setLoading] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Memoizar orderBy para evitar re-renders desnecessários
  const orderByMemo = useMemo(() => options?.orderBy, [options?.orderBy?.column, options?.orderBy?.ascending])

  useEffect(() => {
    // Carregar dados iniciais
    async function loadData() {
      setLoading(true)
      const supabase = createClient()
      
      let query = supabase
        .from(table)
        .select('*')

      if (options?.filter) {
        query = query.eq(options.filter.split('=')[0], options.filter.split('=')[1])
      }

      if (orderByMemo) {
        query = query.order(orderByMemo.column, { 
          ascending: orderByMemo.ascending ?? false 
        })
      }

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      const { data: fetchedData, error } = await query

      if (!error && fetchedData) {
        setData(fetchedData as T[])
      }
      setLoading(false)
    }

    loadData()

    // Configurar subscription Realtime
    const supabase = createClient()
    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: table,
        },
        async () => {
          // Recarregar dados quando houver mudanças
          await loadData()
        }
      )
      .subscribe()

    channelRef.current = channel

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [table, options?.filter, orderByMemo, options?.limit])

  // Manter dados sincronizados quando initialData mudar externamente
  useEffect(() => {
    if (initialData && initialData.length > 0 && !loading) {
      setData(initialData)
    }
  }, [initialData, loading])

  return { data, loading, setData }
}

/**
 * Hook específico para clientes com Realtime
 */
export function useRealtimeClientes(initialClientes: any[]) {
  return useRealtime('clientes', initialClientes, {
    orderBy: { column: 'created_at', ascending: false }
  })
}

/**
 * Hook específico para lançamentos financeiros com Realtime
 */
export function useRealtimeLancamentos(initialLancamentos: any[]) {
  return useRealtime('financeiro_lancamentos', initialLancamentos, {
    orderBy: { column: 'created_at', ascending: false },
    limit: 50
  })
}

/**
 * Hook específico para serviços com Realtime
 */
export function useRealtimeServicos(initialServicos: any[]) {
  return useRealtime('servicos', initialServicos, {
    orderBy: { column: 'created_at', ascending: false }
  })
}

/**
 * Hook específico para grupos com Realtime
 */
export function useRealtimeGrupos(initialGrupos: any[]) {
  return useRealtime('grupos', initialGrupos, {
    orderBy: { column: 'created_at', ascending: false }
  })
}









