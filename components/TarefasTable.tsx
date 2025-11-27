'use client'

import { formatDate } from '@/lib/utils'
import { Search, List, LayoutGrid, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { TarefaDetailModal } from '@/components/modals/TarefaDetailModal'
import { TarefaKanbanColuna } from '@/types/kanban.types'
import { useModal } from '@/contexts/ModalContext'
import { createClient } from '@/lib/supabase/client'

type ViewMode = 'lista' | 'kanban'

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

interface TarefasTableProps {
  tarefas: Tarefa[]
  onTarefaUpdate?: () => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  kanbanColumns: TarefaKanbanColuna[]
}

export function TarefasTable({ tarefas, onTarefaUpdate, viewMode, onViewModeChange, kanbanColumns }: TarefasTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const { confirm, alert } = useModal()

  const columnMap = useMemo(() => {
    return new Map(kanbanColumns.map((coluna) => [coluna.id, coluna]))
  }, [kanbanColumns])

  const filteredTarefas = tarefas.filter(tarefa =>
    tarefa.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tarefa.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tarefa.clientes?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tarefa.projetos?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (columnId: string | null) => {
    const column = columnId ? columnMap.get(columnId) : undefined
    return {
      label: column?.nome || 'Sem status',
      style: column
        ? {
            color: column.cor,
            borderColor: column.cor,
            backgroundColor: `${column.cor}1a`,
          }
        : {
            color: '#374151',
            borderColor: 'transparent',
          },
    }
  }

  const handleTarefaClick = (tarefa: Tarefa) => {
    setSelectedTarefa(tarefa)
    setIsDetailModalOpen(true)
  }

  const handleDelete = async (e: React.MouseEvent, tarefaId: string, tarefaNome: string) => {
    e.stopPropagation() // Prevenir que o click abra o modal de detalhes
    
    const confirmed = await confirm(
      `Tem certeza que deseja excluir a tarefa "${tarefaNome}"?`,
      'Confirmar exclusão',
      'Excluir',
      'Cancelar',
      'danger'
    )
    
    if (!confirmed) return

    const supabase = createClient()
    const { error } = await supabase
      .from('tarefas')
      .delete()
      .eq('id', tarefaId)

    if (error) {
      await alert('Erro ao excluir tarefa: ' + error.message, 'Erro')
    } else {
      onTarefaUpdate?.()
    }
  }

  return (
    <>
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

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Tarefa</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Cliente/Projeto</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Data Vencimento</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredTarefas.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  {searchTerm ? 'Nenhuma tarefa encontrada' : 'Nenhuma tarefa cadastrada'}
                </td>
              </tr>
            ) : (
              filteredTarefas.map((tarefa) => {
                const statusBadge = getStatusBadge(tarefa.status)
                return (
                  <tr
                    key={tarefa.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleTarefaClick(tarefa)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {tarefa.nome}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-700">
                        {tarefa.clientes ? (
                          <div>
                            <div className="font-medium">{tarefa.clientes.nome}</div>
                            {tarefa.projetos && (
                              <div className="text-xs text-gray-500">{tarefa.projetos.nome}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {tarefa.data_vencimento ? formatDate(tarefa.data_vencimento) : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="text-xs font-medium rounded-full px-3 py-1 border"
                        style={statusBadge.style}
                      >
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={(e) => handleDelete(e, tarefa.id, tarefa.nome)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir tarefa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedTarefa && (
        <TarefaDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false)
            setSelectedTarefa(null)
          }}
          tarefa={selectedTarefa}
          onUpdate={() => {
            onTarefaUpdate?.()
            setIsDetailModalOpen(false)
            setSelectedTarefa(null)
          }}
          kanbanColumns={kanbanColumns}
        />
      )}
    </>
  )
}

