'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import { useModal } from '@/contexts/ModalContext'
import { TarefaKanbanColuna } from '@/types/kanban.types'

type Cliente = Database['public']['Tables']['clientes']['Row']
type Projeto = Database['public']['Tables']['projetos']['Row']

interface TarefaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  kanbanColumns: TarefaKanbanColuna[]
}

export function TarefaModal({ isOpen, onClose, onSuccess, kanbanColumns }: TarefaModalProps) {
  const { alert } = useModal()
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    data_vencimento: '',
    cliente_id: '',
    projeto_id: '',
    kanban_coluna_id: '',
  })

  const activeKanbanColumns = useMemo(() => 
    kanbanColumns.filter((coluna) => coluna.ativo),
    [kanbanColumns]
  )
  
  const defaultKanbanColumnId = useMemo(() => 
    activeKanbanColumns[0]?.id || '',
    [activeKanbanColumns]
  )

  useEffect(() => {
    if (isOpen) {
      loadClientes()
      loadProjetos()
    }
  }, [isOpen])

  async function loadClientes() {
    const supabase = createClient()
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .order('nome')
    
    if (data) {
      setClientes(data)
    }
  }

  async function loadProjetos() {
    const supabase = createClient()
    const { data } = await supabase
      .from('projetos')
      .select('*')
      .order('nome')
    
    if (data) {
      setProjetos(data)
    }
  }

  useEffect(() => {
    if (isOpen && !loading) {
      setFormData((prev) => ({
        nome: '',
        descricao: '',
        data_vencimento: '',
        cliente_id: '',
        projeto_id: '',
        kanban_coluna_id: prev.kanban_coluna_id || defaultKanbanColumnId,
      }))
    }
  }, [isOpen, loading, defaultKanbanColumnId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome.trim()) {
      await alert('O nome da tarefa é obrigatório.', 'Validação')
      return
    }
    
    setLoading(true)

    const supabase = createClient()
    const selectedColumnId = formData.kanban_coluna_id || defaultKanbanColumnId || null
    
    // Converter datetime-local para ISO string com timezone
    let dataVencimentoFormatted: string | null = null
    if (formData.data_vencimento) {
      // datetime-local retorna formato YYYY-MM-DDTHH:mm, precisamos converter para ISO string
      const date = new Date(formData.data_vencimento)
      dataVencimentoFormatted = date.toISOString()
    }
    
    const dataToSave: Record<string, unknown> = {
      nome: formData.nome.trim(),
      descricao: formData.descricao.trim() || null,
      data_vencimento: dataVencimentoFormatted,
      cliente_id: formData.cliente_id || null,
      projeto_id: formData.projeto_id || null,
    }

    if (selectedColumnId) {
      dataToSave.status = selectedColumnId
    }

    const { data: tarefaData, error: insertError } = await supabase
      .from('tarefas')
      .insert([dataToSave])
      .select()
      .single()

    if (!insertError && tarefaData) {
      // Criar atividade de criação
      await supabase
        .from('tarefas_atividades')
        .insert([{
          tarefa_id: tarefaData.id,
          tipo: 'criacao',
          descricao: 'Tarefa criada',
        }])

      // Reset form
      setFormData({
        nome: '',
        descricao: '',
        data_vencimento: '',
        cliente_id: '',
        projeto_id: '',
      })
      onSuccess?.()
      onClose()
    } else {
      await alert(`Erro ao criar tarefa: ${insertError?.message || 'Erro desconhecido'}`, 'Erro')
    }
    setLoading(false)
  }

  const handleClose = () => {
    if (!loading) {
      setFormData({
        nome: '',
        descricao: '',
        data_vencimento: '',
        cliente_id: '',
        projeto_id: '',
      })
      onClose()
    }
  }

  // Filtrar projetos quando um cliente é selecionado
  const projetosFiltrados = formData.cliente_id
    ? projetos.filter(p => p.cliente_principal_id === formData.cliente_id)
    : projetos

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Criar Tarefa">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Tarefa *
            </label>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Digite o nome da tarefa"
            />
          </div>

          {activeKanbanColumns.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status inicial
              </label>
              <select
                value={formData.kanban_coluna_id}
                onChange={(e) =>
                  setFormData({ ...formData, kanban_coluna_id: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {activeKanbanColumns.map((coluna) => (
                  <option key={coluna.id} value={coluna.id}>
                    {coluna.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição da Tarefa
            </label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Digite a descrição da tarefa"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data de Vencimento
            </label>
            <input
              type="datetime-local"
              value={formData.data_vencimento}
              onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conectar a Cliente/Projeto
            </label>
            <div className="space-y-3">
              <select
                value={formData.cliente_id}
                onChange={(e) => {
                  setFormData({ 
                    ...formData, 
                    cliente_id: e.target.value,
                    projeto_id: '' // Limpar projeto quando cliente mudar
                  })
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Nenhum cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>

              {formData.cliente_id && (
                <select
                  value={formData.projeto_id}
                  onChange={(e) => setFormData({ ...formData, projeto_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Nenhum projeto</option>
                  {projetosFiltrados.map((projeto) => (
                    <option key={projeto.id} value={projeto.id}>
                      {projeto.nome}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-500 pt-2">
          * Campos de preenchimento obrigatório.
        </div>

        <div className="flex gap-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 bg-white text-gray-700 px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Criar Tarefa'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

