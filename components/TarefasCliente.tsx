'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'
import { CheckSquare, Flag, Calendar } from 'lucide-react'
import { TarefaDetailModal } from '@/components/modals/TarefaDetailModal'
import { TarefaKanbanColuna } from '@/types/kanban.types'
import { Database } from '@/types/database.types'

type Cliente = {
  id: string
  nome: string
}

type Projeto = {
  id: string
  nome: string
}

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
  clientes?: Cliente | null
  projetos?: Projeto | null
}

interface TarefasClienteProps {
  clienteId: string
  onDataChange?: () => void
}

export function TarefasCliente({ clienteId, onDataChange }: TarefasClienteProps) {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(true)
  const [kanbanColumns, setKanbanColumns] = useState<TarefaKanbanColuna[]>([])
  const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const loadTarefas = useCallback(async () => {
    const supabase = createClient()
    
    // OTIMIZADO: Selecionar apenas campos necessários
    const { data } = await supabase
      .from('tarefas')
      .select(`
        id,
        nome,
        descricao,
        data_inicio,
        data_vencimento,
        cliente_id,
        projeto_id,
        prioridade,
        status,
        created_at,
        updated_at,
        clientes (
          id,
          nome
        ),
        projetos (
          id,
          nome
        )
      `)
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })

    if (data) {
      setTarefas(data as Tarefa[])
    }
    setLoading(false)
  }, [clienteId])

  const loadKanbanColumns = useCallback(async () => {
    // OTIMIZADO: Verificar cache primeiro (colunas kanban raramente mudam)
    const cacheKey = 'tarefas_kanban_colunas_ativo'
    const cached = sessionStorage.getItem(cacheKey)
    
    if (cached) {
      try {
        const data = JSON.parse(cached) as TarefaKanbanColuna[]
        setKanbanColumns(data)
        return
      } catch (e) {
        // Se cache inválido, continuar com query
      }
    }
    
    const supabase = createClient()
    // OTIMIZADO: Selecionar apenas campos necessários
    const { data } = await supabase
      .from('tarefas_kanban_colunas')
      .select('id, nome, cor, ordem, ativo')
      .eq('ativo', true)
      .order('ordem', { ascending: true })

    if (data) {
      setKanbanColumns(data as TarefaKanbanColuna[])
      // Cachear por 5 minutos
      sessionStorage.setItem(cacheKey, JSON.stringify(data))
    }
  }, [])

  // OTIMIZADO: Carregar dados em paralelo
  useEffect(() => {
    Promise.all([loadTarefas(), loadKanbanColumns()]).catch(console.error)
  }, [clienteId, loadTarefas, loadKanbanColumns])

  const handleTarefaClick = (tarefa: Tarefa) => {
    setSelectedTarefa(tarefa)
    setIsDetailModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsDetailModalOpen(false)
    setSelectedTarefa(null)
    loadTarefas()
    onDataChange?.()
  }

  if (loading) {
    return (
      <Card title="Tarefas">
        <div className="text-center py-8 text-gray-500">Carregando...</div>
      </Card>
    )
  }

  return (
    <>
      <div id="tarefas" className="scroll-mt-8">
        <Card title="Tarefas">
          {tarefas.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhuma tarefa encontrada
            </div>
          ) : (
            <div className="space-y-3">
              {tarefas.map((tarefa) => (
                <TarefaCard
                  key={tarefa.id}
                  tarefa={tarefa}
                  kanbanColumns={kanbanColumns}
                  onClick={() => handleTarefaClick(tarefa)}
                />
              ))}
            </div>
          )}
        </Card>
      </div>

      {selectedTarefa && (
        <TarefaDetailModal
          isOpen={isDetailModalOpen}
          onClose={handleCloseModal}
          tarefa={selectedTarefa}
          onUpdate={() => {
            loadTarefas()
            handleCloseModal()
          }}
          kanbanColumns={kanbanColumns}
        />
      )}
    </>
  )
}

interface TarefaCardProps {
  tarefa: Tarefa
  kanbanColumns: TarefaKanbanColuna[]
  onClick: () => void
}

function TarefaCard({ tarefa, kanbanColumns, onClick }: TarefaCardProps) {
  const coluna = kanbanColumns.find(c => c.id === tarefa.status)
  
  const getStatusColor = () => {
    if (!coluna) {
      return 'bg-gray-100 text-gray-800 border-gray-200'
    }
    
    const cor = coluna.cor.toLowerCase()
    
    if (cor === '#fbbf24' || cor === '#f59e0b') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    } else if (cor === '#2563eb' || cor === '#3b82f6') {
      return 'bg-blue-100 text-blue-800 border-blue-200'
    } else if (cor === '#16a34a' || cor === '#22c55e') {
      return 'bg-green-100 text-green-800 border-green-200'
    } else if (cor === '#dc2626' || cor === '#ef4444') {
      return 'bg-red-100 text-red-800 border-red-200'
    } else if (cor === '#7c3aed' || cor === '#8b5cf6') {
      return 'bg-purple-100 text-purple-800 border-purple-200'
    } else if (cor === '#f97316' || cor === '#fb923c') {
      return 'bg-orange-100 text-orange-800 border-orange-200'
    }
    
    return 'border-gray-200'
  }

  const getStatusStyle = () => {
    if (!coluna) {
      return {}
    }
    
    const cor = coluna.cor.toLowerCase()
    const coresConhecidas = ['#fbbf24', '#f59e0b', '#2563eb', '#3b82f6', '#16a34a', '#22c55e', '#dc2626', '#ef4444', '#7c3aed', '#8b5cf6', '#f97316', '#fb923c']
    
    if (!coresConhecidas.includes(cor)) {
      const hex = coluna.cor.replace('#', '')
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)
      
      return {
        backgroundColor: `rgba(${r}, ${g}, ${b}, 0.1)`,
        color: coluna.cor,
        borderColor: `rgba(${r}, ${g}, ${b}, 0.2)`
      }
    }
    
    return {}
  }

  const getPrioridadeIcon = () => {
    if (!tarefa.prioridade) return null
    
    const colors = {
      urgente: 'text-red-600',
      alta: 'text-orange-600',
      normal: 'text-blue-600',
      baixa: 'text-gray-600'
    }
    
    return <Flag className={`w-4 h-4 ${colors[tarefa.prioridade] || 'text-gray-400'}`} />
  }

  return (
    <div 
      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <CheckSquare className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <p className="font-medium text-gray-900">
                  {tarefa.nome}
                </p>
                {getPrioridadeIcon()}
                <div className="flex items-center gap-1 text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm text-gray-600">
                    {tarefa.data_vencimento ? formatDate(tarefa.data_vencimento) : 'Sem data'}
                  </span>
                </div>
              </div>
              <span 
                className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-lg border flex-shrink-0 ${getStatusColor()}`}
                style={getStatusStyle()}
              >
                {coluna?.nome || 'Sem status'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

