import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook genérico para subscriptions Realtime do Supabase
 * OTIMIZADO: Usa atualização incremental em vez de recarregar tudo
 */
export function useRealtime<T extends { id?: string }>(
  table: string,
  initialData: T[],
  options?: {
    filter?: string
    orderBy?: { column: string; ascending?: boolean }
    limit?: number
    events?: ('INSERT' | 'UPDATE' | 'DELETE')[] // OTIMIZADO: Eventos específicos
  }
) {
  const [data, setData] = useState<T[]>(initialData)
  const [loading, setLoading] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Memoizar orderBy para evitar re-renders desnecessários
  const orderByMemo = useMemo(() => options?.orderBy, [options?.orderBy?.column, options?.orderBy?.ascending])
  
  // OTIMIZADO: Eventos específicos em vez de '*'
  const events = options?.events || ['INSERT', 'UPDATE', 'DELETE']

  // Carregar dados iniciais
  const loadData = useCallback(async () => {
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
  }, [table, options?.filter, orderByMemo, options?.limit])

  useEffect(() => {
    loadData()

    // Configurar subscription Realtime com atualização incremental
    const supabase = createClient()
    const channel = supabase.channel(`${table}_changes_${Date.now()}`) // Nome único para evitar conflitos
    
    // OTIMIZADO: Configurar listeners para cada evento específico
    events.forEach(eventType => {
      channel.on(
        'postgres_changes',
        {
          event: eventType,
          schema: 'public',
          table: table,
        },
        (payload) => {
          // Debounce para evitar múltiplas atualizações rápidas
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
          }
          
          debounceTimerRef.current = setTimeout(() => {
            setData(prevData => {
              if (eventType === 'INSERT') {
                // Adicionar novo registro
                const newRecord = payload.new as T
                // Verificar se já existe (evitar duplicatas)
                const exists = prevData.some(item => 
                  item.id && newRecord.id && item.id === newRecord.id
                )
                if (!exists) {
                  const updated = [...prevData, newRecord]
                  // Aplicar ordenação se necessário
                  if (orderByMemo) {
                    updated.sort((a, b) => {
                      const aVal = (a as any)[orderByMemo.column]
                      const bVal = (b as any)[orderByMemo.column]
                      if (aVal === bVal) return 0
                      const comparison = aVal > bVal ? 1 : -1
                      return orderByMemo.ascending ? comparison : -comparison
                    })
                  }
                  // Aplicar limite se necessário
                  return options?.limit ? updated.slice(0, options.limit) : updated
                }
                return prevData
              } else if (eventType === 'UPDATE') {
                // Atualizar registro existente
                const updatedRecord = payload.new as T
                return prevData.map(item => 
                  item.id && updatedRecord.id && item.id === updatedRecord.id
                    ? updatedRecord
                    : item
                )
              } else if (eventType === 'DELETE') {
                // Remover registro
                const deletedRecord = payload.old as T
                return prevData.filter(item => 
                  !item.id || !deletedRecord.id || item.id !== deletedRecord.id
                )
              }
              return prevData
            })
          }, 150) // Debounce de 150ms
        }
      )
    })
    
    channel.subscribe()
    channelRef.current = channel

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [table, loadData, events, orderByMemo, options?.limit])

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









