'use client'

import React, { DragEvent, useEffect, useMemo, useRef, useState } from 'react'
import { formatDate } from '@/lib/utils'
import { Database } from '@/types/database.types'
import { Search, List, LayoutGrid, Settings, ChevronLeft, ChevronRight, GripVertical, Edit, Trash2, Plus, X, Flag } from 'lucide-react'
import { TarefaDetailModal } from '@/components/modals/TarefaDetailModal'
import { Modal } from '@/components/ui/Modal'
import { useModal } from '@/contexts/ModalContext'
import { createClient } from '@/lib/supabase/client'
import { TarefaKanbanColuna } from '@/types/kanban.types'

type ViewMode = 'lista' | 'kanban'

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

interface TarefasKanbanProps {
  tarefas: Tarefa[]
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onTarefaUpdate?: () => void
  kanbanColumns: TarefaKanbanColuna[]
  onColumnsUpdated: () => void
}

export function TarefasKanban({
  tarefas: initialTarefas,
  viewMode,
  onViewModeChange,
  onTarefaUpdate,
  kanbanColumns,
  onColumnsUpdated,
}: TarefasKanbanProps) {
  const { alert } = useModal()
  const [localTarefas, setLocalTarefas] = useState(initialTarefas)
  const [searchTerm, setSearchTerm] = useState('')
  const [draggedTarefaId, setDraggedTarefaId] = useState<string | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isColunasModalOpen, setIsColunasModalOpen] = useState(false)
  const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  useEffect(() => {
    setLocalTarefas(initialTarefas)
  }, [initialTarefas])

  const colunasVisiveis = useMemo(
    () =>
      kanbanColumns
        .filter((coluna) => coluna.ativo)
        .sort((a, b) => a.ordem - b.ordem),
    [kanbanColumns]
  )

  const filteredTarefas = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return localTarefas.filter((tarefa) => {
      return (
        tarefa.nome?.toLowerCase().includes(term) ||
        tarefa.descricao?.toLowerCase().includes(term) ||
        tarefa.clientes?.nome?.toLowerCase().includes(term) ||
        tarefa.projetos?.nome?.toLowerCase().includes(term)
      )
    })
  }, [localTarefas, searchTerm])

  const tarefasPorColuna = useMemo(() => {
    const grouped: Record<string, Tarefa[]> = {}
    const tarefasProcessadas = new Set<string>() // Para evitar duplicatas
    
    colunasVisiveis.forEach((coluna) => {
      const tarefasNaColuna = filteredTarefas.filter((tarefa) => {
        return tarefa.status === coluna.id && !tarefasProcessadas.has(tarefa.id)
      })
      tarefasNaColuna.forEach(tarefa => tarefasProcessadas.add(tarefa.id))
      grouped[coluna.id] = tarefasNaColuna
    })

    const primeiraColuna = colunasVisiveis[0]
    if (primeiraColuna) {
      const columnIds = new Set(colunasVisiveis.map((coluna) => coluna.id))
      const semColuna = filteredTarefas.filter((tarefa) => {
        return !columnIds.has(tarefa.status) && !tarefasProcessadas.has(tarefa.id)
      })
      if (semColuna.length > 0) {
        semColuna.forEach(tarefa => tarefasProcessadas.add(tarefa.id))
        grouped[primeiraColuna.id] = [
          ...(grouped[primeiraColuna.id] || []),
          ...semColuna,
        ]
      }
    }

    return grouped
  }, [filteredTarefas, colunasVisiveis])

  const checkScrollability = () => {
    if (!scrollContainerRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  useEffect(() => {
    checkScrollability()
    const handleResize = () => checkScrollability()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [colunasVisiveis, filteredTarefas])

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return
    const containerWidth = scrollContainerRef.current.clientWidth
    const scrollAmount = (containerWidth - 32) / 3 + 16
    const currentScroll = scrollContainerRef.current.scrollLeft
    const newScroll =
      direction === 'left'
        ? Math.max(0, currentScroll - scrollAmount)
        : currentScroll + scrollAmount

    scrollContainerRef.current.scrollTo({
      left: newScroll,
      behavior: 'smooth',
    })
  }

  const handleDragStart = (e: DragEvent<HTMLDivElement>, tarefa: Tarefa) => {
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('a')) {
      e.preventDefault()
      return
    }

    setIsDragging(true)
    setDraggedTarefaId(tarefa.id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', tarefa.id)
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
  }

  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    setIsDragging(false)
    setDraggedTarefaId(null)
    setDragOverColumnId(null)
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>, columnId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumnId(columnId)
  }

  const handleDragLeave = () => {
    setDragOverColumnId(null)
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>, column: TarefaKanbanColuna) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverColumnId(null)
    setIsDragging(false)

    const tarefaId = draggedTarefaId || e.dataTransfer.getData('text/plain')
    if (!tarefaId) return

    const tarefa = localTarefas.find((item) => item.id === tarefaId)
    if (!tarefa || tarefa.status === column.id) {
      setDraggedTarefaId(null)
      return
    }

    const previousStatus = tarefa.status
    setLocalTarefas((prev) =>
      prev.map((item) => (item.id === tarefaId ? { ...item, status: column.id } : item))
    )

    const supabase = createClient()
    const { error } = await supabase
      .from('tarefas')
      .update({ status: column.id })
      .eq('id', tarefaId)

    if (error) {
      await alert('Erro ao atualizar status da tarefa: ' + error.message, 'Erro')
      setLocalTarefas((prev) =>
        prev.map((item) => (item.id === tarefaId ? { ...item, status: previousStatus } : item))
      )
    } else {
      onTarefaUpdate?.()
    }

    setDraggedTarefaId(null)
  }

  const handleCardClick = (tarefa: Tarefa) => {
    if (isDragging || draggedTarefaId) return
    setSelectedTarefa(tarefa)
  }

  return (
    <div>
      <div className="mb-4 flex gap-4 items-center">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar tarefas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-500"
          />
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsColunasModalOpen(true)}
            className="flex items-center gap-2 h-10 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-600" />
            <span className="text-sm text-gray-700">Colunas</span>
          </button>
          <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-0.5">
            <button
              onClick={() => onViewModeChange('lista')}
              className={`h-9 w-9 flex items-center justify-center rounded transition-colors ${
                viewMode === 'lista' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Visualização em lista"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => onViewModeChange('kanban')}
              className={`h-9 w-9 flex items-center justify-center rounded transition-colors ${
                viewMode === 'kanban' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Visualização em kanban"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Rolar para esquerda"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
        )}

        <div
          ref={scrollContainerRef}
          onScroll={checkScrollability}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 px-1"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {colunasVisiveis.length === 0 ? (
            <div className="w-full flex items-center justify-center py-12 px-4">
              <div className="text-center max-w-md">
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhuma coluna cadastrada
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Para usar a visualização em kanban, é necessário criar colunas personalizadas.
                </p>
                <button
                  onClick={() => setIsColunasModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Criar Colunas
                </button>
              </div>
            </div>
          ) : (
            colunasVisiveis.map((coluna) => {
            const tarefasNaColuna = tarefasPorColuna[coluna.id] || []
            const isDragOver = dragOverColumnId === coluna.id

            return (
              <div
                key={coluna.id}
                className={`flex-shrink-0 rounded-lg bg-white border-t-4 border border-gray-200 p-4 min-h-[240px] transition-all ${
                  isDragOver ? 'ring-2 ring-primary-500 ring-offset-2' : ''
                }`}
                style={{
                  borderTopColor: coluna.cor,
                  width: 'calc((100% - 2rem) / 3)',
                  minWidth: '280px',
                }}
              >
                <div className="mb-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base" style={{ color: coluna.cor }}>
                      {coluna.nome}
                    </h3>
                    <span className="text-xs font-medium bg-white px-2 py-1 rounded-full text-gray-700">
                      {tarefasNaColuna.length} {tarefasNaColuna.length === 1 ? 'tarefa' : 'tarefas'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Ordem #{coluna.ordem + 1}
                  </p>
                </div>

                <div
                  className="space-y-3 min-h-[200px]"
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    e.dataTransfer.dropEffect = 'move'
                    handleDragOver(e, coluna.id)
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleDragLeave()
                  }}
                  onDrop={(e) => handleDrop(e, coluna)}
                >
                  {tarefasNaColuna.length === 0 ? (
                    <div
                      className={`text-center py-8 text-gray-400 text-sm rounded-lg border-2 border-dashed transition-colors ${
                        isDragOver ? 'border-primary-400 bg-primary-50 text-primary-600' : 'border-gray-200'
                      }`}
                    >
                      {isDragOver ? 'Solte aqui' : 'Nenhuma tarefa'}
                    </div>
                  ) : (
                    tarefasNaColuna.map((tarefa) => {
                      const isDragged = draggedTarefaId === tarefa.id
                      return (
                        <div
                          key={tarefa.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, tarefa)}
                          onDragEnd={handleDragEnd}
                          className={`tarefa-card bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-all cursor-grab active:cursor-grabbing ${
                            isDragged ? 'opacity-50' : 'opacity-100'
                          }`}
                          onClick={() => handleCardClick(tarefa)}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-base font-semibold text-gray-900 truncate flex-1">{tarefa.nome}</p>
                              {tarefa.prioridade && (
                                <Flag 
                                  className={`w-4 h-4 flex-shrink-0 ${
                                    tarefa.prioridade === 'urgente' ? 'text-red-600' :
                                    tarefa.prioridade === 'alta' ? 'text-orange-600' :
                                    tarefa.prioridade === 'normal' ? 'text-blue-600' :
                                    tarefa.prioridade === 'baixa' ? 'text-gray-600' :
                                    'text-gray-400'
                                  }`}
                                />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {tarefa.clientes?.nome || 'Cliente não informado'}
                              {tarefa.projetos?.nome ? ` • ${tarefa.projetos.nome}` : ''}
                            </p>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                            {tarefa.data_vencimento && (
                              <div className="flex items-center gap-1">
                                <span>Vence:</span>
                                <strong className="text-gray-900">{formatDate(tarefa.data_vencimento)}</strong>
                              </div>
                            )}
                            {tarefa.prioridade && (
                              <div className="flex items-center gap-1">
                                <span>Prioridade:</span>
                                <strong className="capitalize">{tarefa.prioridade}</strong>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })
          )}
        </div>

        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Rolar para direita"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <GerenciarColunasModal
        isOpen={isColunasModalOpen}
        onClose={() => setIsColunasModalOpen(false)}
        colunas={kanbanColumns}
        onSuccess={() => {
          onColumnsUpdated()
        }}
      />

      {selectedTarefa && (
        <TarefaDetailModal
          isOpen
          onClose={() => setSelectedTarefa(null)}
          tarefa={selectedTarefa}
          onUpdate={() => {
            onTarefaUpdate?.()
            setSelectedTarefa(null)
          }}
          kanbanColumns={kanbanColumns}
        />
      )}
    </div>
  )
}

interface GerenciarColunasModalProps {
  isOpen: boolean
  onClose: () => void
  colunas: TarefaKanbanColuna[]
  onSuccess: () => void
}

function GerenciarColunasModal({ isOpen, onClose, colunas, onSuccess }: GerenciarColunasModalProps) {
  const { alert, confirm } = useModal()
  const [loading, setLoading] = useState<string | null>(null) // ID da coluna sendo salva
  const [draggedColunaId, setDraggedColunaId] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [colunasOrdenadas, setColunasOrdenadas] = useState<TarefaKanbanColuna[]>([])
  const [editingColunaId, setEditingColunaId] = useState<string | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newColunaData, setNewColunaData] = useState({ nome: '', cor: '#3B82F6' })
  const [editingColunaData, setEditingColunaData] = useState<Record<string, { nome: string; cor: string }>>({})
  const [colunaFinalizadoId, setColunaFinalizadoId] = useState<string>('')

  useEffect(() => {
    // Ordenar colunas por ordem quando o modal abrir
    setColunasOrdenadas([...colunas].sort((a, b) => a.ordem - b.ordem))
    
    // Carregar configuração da coluna finalizado
    if (isOpen) {
      const supabase = createClient()
      supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('chave', 'tarefas_coluna_finalizado_id')
        .single()
        .then(({ data }) => {
          if (data) {
            setColunaFinalizadoId(data.valor || '')
          }
        })
    }
    
    // Resetar estados quando o modal fechar
    if (!isOpen) {
      setEditingColunaId(null)
      setIsCreatingNew(false)
      setNewColunaData({ nome: '', cor: '#3B82F6' })
      setEditingColunaData({})
    }
  }, [colunas, isOpen])

  const handleStartEdit = (coluna: TarefaKanbanColuna) => {
    setEditingColunaId(coluna.id)
    setEditingColunaData({
      [coluna.id]: {
        nome: coluna.nome,
        cor: coluna.cor
      }
    })
    setIsCreatingNew(false)
  }

  const handleCancelEdit = () => {
    setEditingColunaId(null)
    setEditingColunaData({})
  }

  const handleStartCreate = () => {
    setIsCreatingNew(true)
    setNewColunaData({ nome: '', cor: '#3B82F6' })
    setEditingColunaId(null)
  }

  const handleCancelCreate = () => {
    setIsCreatingNew(false)
    setNewColunaData({ nome: '', cor: '#3B82F6' })
  }

  const handleSaveEdit = async (coluna: TarefaKanbanColuna) => {
    const data = editingColunaData[coluna.id]
    if (!data || !data.nome.trim()) {
      await alert('O nome da coluna é obrigatório.', 'Validação')
      return
    }

    setLoading(coluna.id)
    const supabase = createClient()
    
    const { error } = await supabase
      .from('tarefas_kanban_colunas')
      .update({
        nome: data.nome.trim(),
        cor: data.cor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', coluna.id)

    if (!error) {
      setEditingColunaId(null)
      setEditingColunaData({})
      onSuccess()
    } else {
      await alert('Erro ao atualizar coluna: ' + error.message, 'Erro')
    }

    setLoading(null)
  }

  const handleSaveCreate = async () => {
    if (!newColunaData.nome.trim()) {
      await alert('O nome da coluna é obrigatório.', 'Validação')
      return
    }

    setLoading('new')
    const supabase = createClient()
    
    const maxOrdem = Math.max(...colunas.map(c => c.ordem), -1)
    const { error } = await supabase
      .from('tarefas_kanban_colunas')
      .insert([{
        nome: newColunaData.nome.trim(),
        cor: newColunaData.cor,
        ordem: maxOrdem + 1,
        ativo: true,
      }])

    if (!error) {
      setIsCreatingNew(false)
      setNewColunaData({ nome: '', cor: '#3B82F6' })
      onSuccess()
    } else {
      await alert('Erro ao criar coluna: ' + error.message, 'Erro')
    }

    setLoading(null)
  }

  const handleDeleteColumn = async (coluna: TarefaKanbanColuna) => {
    const activeColumns = colunas.filter((c) => c.ativo && c.id !== coluna.id)
    const targetColumn = activeColumns[0]

    if (!targetColumn) {
      await alert('Precisa existir ao menos uma coluna ativa antes de excluir esta.', 'Aviso')
      return
    }

    // Verificar se é a coluna "Finalizado" - não permitir excluir
    if (coluna.nome === 'Finalizado') {
      await alert('Não é possível excluir a coluna "Finalizado".', 'Aviso')
      return
    }

    const confirmed = await confirm(
      `Tem certeza que deseja excluir a coluna "${coluna.nome}"?`,
      'Confirmar exclusão',
      'Excluir',
      'Cancelar',
      'danger'
    )
    if (!confirmed) return

    const supabase = createClient()
    const [{ error: updateTasksError }, { error: updateColumnError }] = await Promise.all([
      supabase
        .from('tarefas')
        .update({ status: targetColumn.id })
        .eq('status', coluna.id),
      supabase
        .from('tarefas_kanban_colunas')
        .update({ ativo: false })
        .eq('id', coluna.id),
    ])

    if (updateTasksError || updateColumnError) {
      await alert('Erro ao excluir coluna: ' + (updateTasksError?.message || updateColumnError?.message), 'Erro')
      return
    }

    onSuccess()
  }

  // Handlers para drag and drop de colunas no modal
  const handleColunaDragStart = (e: React.DragEvent, colunaId: string) => {
    setDraggedColunaId(colunaId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', colunaId)
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
  }

  const handleColunaDragEnd = (e: React.DragEvent) => {
    setDraggedColunaId(null)
    setDragOverIndex(null)
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
  }

  const handleColunaDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleColunaDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleColunaDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)
    
    const colunaId = draggedColunaId || e.dataTransfer.getData('text/html')
    if (!colunaId) {
      setDraggedColunaId(null)
      return
    }

    const draggedIndex = colunasOrdenadas.findIndex(c => c.id === colunaId)
    if (draggedIndex === -1 || draggedIndex === targetIndex) {
      setDraggedColunaId(null)
      return
    }

    // Reordenar colunas localmente
    const novasColunas = [...colunasOrdenadas]
    const [colunaMovida] = novasColunas.splice(draggedIndex, 1)
    novasColunas.splice(targetIndex, 0, colunaMovida)

    // Atualizar ordem no estado local
    const colunasComNovaOrdem = novasColunas.map((coluna, index) => ({
      ...coluna,
      ordem: index
    }))

    setColunasOrdenadas(colunasComNovaOrdem)

    // Salvar nova ordem no banco de dados
    const supabase = createClient()
    for (const coluna of colunasComNovaOrdem) {
      await supabase
        .from('tarefas_kanban_colunas')
        .update({ ordem: coluna.ordem })
        .eq('id', coluna.id)
    }

    setDraggedColunaId(null)
    onSuccess() // Recarregar colunas
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gerenciar Colunas do Kanban">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Todas as Colunas</h3>
          <p className="text-xs text-gray-500 mb-3">Arraste as colunas para reordená-las</p>
          <div className="space-y-2">
            {colunasOrdenadas.map((coluna, index) => {
              const isDragged = draggedColunaId === coluna.id
              const isDragOver = dragOverIndex === index
              const isEditing = editingColunaId === coluna.id
              const colunaEditData = editingColunaData[coluna.id] || { nome: coluna.nome, cor: coluna.cor }
              
              return (
                <div
                  key={coluna.id}
                  draggable={!isEditing && !isCreatingNew}
                  onDragStart={(e) => !isEditing && !isCreatingNew && handleColunaDragStart(e, coluna.id)}
                  onDragEnd={handleColunaDragEnd}
                  onDragOver={(e) => !isEditing && !isCreatingNew && handleColunaDragOver(e, index)}
                  onDragLeave={handleColunaDragLeave}
                  onDrop={(e) => !isEditing && !isCreatingNew && handleColunaDrop(e, index)}
                  className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg transition-all ${
                    isDragged ? 'opacity-50' : ''
                  } ${
                    isDragOver ? 'ring-2 ring-primary-500 ring-offset-2 bg-primary-50' : ''
                  } ${
                    !isEditing && !isCreatingNew ? 'cursor-grab active:cursor-grabbing' : ''
                  }`}
                >
                  {isEditing ? (
                    // Modo de edição inline
                    <>
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <input
                          type="color"
                          value={colunaEditData.cor}
                          onChange={(e) => setEditingColunaData({
                            ...editingColunaData,
                            [coluna.id]: { ...colunaEditData, cor: e.target.value }
                          })}
                          className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={colunaEditData.nome}
                          onChange={(e) => setEditingColunaData({
                            ...editingColunaData,
                            [coluna.id]: { ...colunaEditData, nome: e.target.value }
                          })}
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Nome da coluna"
                          autoFocus
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveEdit(coluna)}
                          disabled={loading === coluna.id}
                          className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          {loading === coluna.id ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={loading === coluna.id}
                          className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Cancelar"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    // Modo de visualização normal
                    <>
                      <div className="flex items-center gap-2 flex-1">
                        <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: coluna.cor }}
                        />
                        <span className="text-sm text-gray-700">{coluna.nome}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(coluna)}
                          className="p-1.5 text-gray-600 hover:text-primary-600 hover:bg-white rounded transition-colors"
                          title="Editar"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {coluna.nome !== 'Finalizado' && (
                          <button
                            onClick={() => handleDeleteColumn(coluna)}
                            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-white rounded transition-colors"
                            title="Excluir"
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
            
            {/* Linha para criar nova coluna */}
            {isCreatingNew && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-2 border-dashed border-primary-300">
                <div className="flex items-center gap-2 flex-1 mr-2">
                  <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0 opacity-0" />
                  <input
                    type="color"
                    value={newColunaData.cor}
                    onChange={(e) => setNewColunaData({ ...newColunaData, cor: e.target.value })}
                    className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newColunaData.nome}
                    onChange={(e) => setNewColunaData({ ...newColunaData, nome: e.target.value })}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Nome da coluna"
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveCreate}
                    disabled={loading === 'new'}
                    className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {loading === 'new' ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    onClick={handleCancelCreate}
                    disabled={loading === 'new'}
                    className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="Cancelar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {!isCreatingNew && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleStartCreate}
                className="flex items-center gap-2 w-full justify-center px-4 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nova Coluna
              </button>
            </div>
          )}
        </div>
        
        {/* Configuração da coluna finalizado */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Configuração</h3>
          <p className="text-xs text-gray-500 mb-3">
            Selecione qual coluna corresponde à etapa "Finalizado". Tarefas nesta coluna não aparecerão no calendário.
          </p>
          <select
            value={colunaFinalizadoId}
            onChange={async (e) => {
              const novaColunaId = e.target.value
              setColunaFinalizadoId(novaColunaId)
              
              const supabase = createClient()
              // Salvar ou atualizar configuração
              const { data: existing } = await supabase
                .from('configuracoes_sistema')
                .select('id')
                .eq('chave', 'tarefas_coluna_finalizado_id')
                .single()
              
              if (existing) {
                await supabase
                  .from('configuracoes_sistema')
                  .update({ valor: novaColunaId })
                  .eq('chave', 'tarefas_coluna_finalizado_id')
              } else {
                await supabase
                  .from('configuracoes_sistema')
                  .insert([{ chave: 'tarefas_coluna_finalizado_id', valor: novaColunaId }])
              }
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Selecione uma coluna...</option>
            {colunasOrdenadas.map((coluna) => (
              <option key={coluna.id} value={coluna.id}>
                {coluna.nome}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  )
}

