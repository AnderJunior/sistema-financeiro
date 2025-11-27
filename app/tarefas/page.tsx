'use client'

import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { Plus } from 'lucide-react'
import { TarefasKanban } from '@/components/TarefasKanban'
import { TarefasTable } from '@/components/TarefasTable'
import { TarefaModal } from '@/components/modals/TarefaModal'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TarefaKanbanColuna } from '@/types/kanban.types'
import { Database } from '@/types/database.types'

// Tipagem local para Tarefa (evita problemas com tipos do Database)
type Tarefa = {
  id: string
  nome: string
  descricao: string | null
  data_inicio: string | null
  data_vencimento: string | null
  cliente_id: string | null
  projeto_id: string | null
  prioridade: 'urgente' | 'alta' | 'normal' | 'baixa' | null
  status: string
  created_at: string
  updated_at: string
  clientes?: Database['public']['Tables']['clientes']['Row'] | null
  projetos?: Database['public']['Tables']['projetos']['Row'] | null
}

type ViewMode = 'lista' | 'kanban'

const STORAGE_VIEW_KEY = 'tarefas_view_mode'

export default function TarefasPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(STORAGE_VIEW_KEY)
      if (saved === 'lista' || saved === 'kanban') {
        return saved
      }
    }
    return 'lista'
  })
  const [kanbanColumns, setKanbanColumns] = useState<TarefaKanbanColuna[]>([])
  const isLoadingRef = useRef(false)
  const channelRef = useRef<any>(null)

  const loadTarefas = useCallback(async () => {
    // Prevenir múltiplas chamadas simultâneas
    if (isLoadingRef.current) {
      return
    }

    isLoadingRef.current = true
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('tarefas')
      .select(`
        *,
        clientes (*),
        projetos (*)
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      // Remover duplicatas baseado no ID
      const uniqueTarefas = data.reduce((acc: Tarefa[], current: Tarefa) => {
        const exists = acc.find((item) => item.id === current.id)
        if (!exists) {
          acc.push(current as Tarefa)
        }
        return acc
      }, [])
      
      setTarefas(uniqueTarefas)
    }
    setLoading(false)
    isLoadingRef.current = false
  }, [])

  useEffect(() => {
    loadTarefas()
    loadKanbanColumns()

    // Configurar subscription Realtime apenas uma vez
    const supabase = createClient()
    
    // Remover subscription anterior se existir
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel('tarefas_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tarefas'
        },
        async () => {
          // Usar um pequeno delay para evitar múltiplas chamadas rápidas
          setTimeout(() => {
            loadTarefas()
          }, 100)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [loadTarefas])

  async function loadKanbanColumns() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('tarefas_kanban_colunas')
      .select('*')
      .order('ordem', { ascending: true })

    if (!error && data) {
      setKanbanColumns(data as TarefaKanbanColuna[])
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_VIEW_KEY, viewMode)
    }
  }, [viewMode])

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tarefas</h1>
            <p className="text-gray-600 mt-2">Gerencie todas as suas tarefas</p>
          </div>
        </div>
        <Card>
          <Loading isLoading={true} message="Carregando tarefas..." />
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tarefas</h1>
          <p className="text-gray-600 mt-2">Gerencie todas as suas tarefas</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Tarefa
        </button>
      </div>

      <Card>
        {viewMode === 'lista' ? (
          <TarefasTable
            tarefas={tarefas}
            onTarefaUpdate={loadTarefas}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            kanbanColumns={kanbanColumns}
          />
        ) : (
          <TarefasKanban
            tarefas={tarefas}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onTarefaUpdate={loadTarefas}
            kanbanColumns={kanbanColumns}
            onColumnsUpdated={loadKanbanColumns}
          />
        )}
      </Card>

      <TarefaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          loadTarefas()
          setIsModalOpen(false)
        }}
        kanbanColumns={kanbanColumns}
      />
    </div>
  )
}

