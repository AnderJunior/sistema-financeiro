'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'
import { Eye, Edit, Trash2, Search, List, LayoutGrid, Calendar, MoreVertical, Wallet } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ClienteModal } from './modals/ClienteModal'
import { useModal } from '@/contexts/ModalContext'
import { formatCurrency, formatDate } from '@/lib/utils'

type Cliente = Database['public']['Tables']['clientes']['Row']
type Grupo = Database['public']['Tables']['grupos']['Row']
type Lancamento = Database['public']['Tables']['financeiro_lancamentos']['Row']

type ClienteComGrupos = Cliente & {
  grupos?: Array<{
    grupos: Grupo
    data_saida?: string | null
  }>
  valorVendido?: number
  valorCobrancasAtivas?: number
  proximaDataVencimento?: string | null
}

type ViewMode = 'lista' | 'kanban'

interface ClientesKanbanProps {
  clientes: ClienteComGrupos[]
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

type StatusType = 'a_iniciar' | 'em_andamento' | 'finalizado'

const statusConfig: Record<StatusType, { label: string; color: string; bgColor: string; borderColor: string }> = {
  a_iniciar: {
    label: 'A iniciar',
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-500'
  },
  em_andamento: {
    label: 'Em andamento',
    color: 'text-blue-800',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500'
  },
  finalizado: {
    label: 'Finalizado',
    color: 'text-green-800',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-500'
  }
}

export function ClientesKanban({ clientes: initialClientes, viewMode, onViewModeChange }: ClientesKanbanProps) {
  const router = useRouter()
  const { alert, confirm } = useModal()
  const [clientes, setClientes] = useState<ClienteComGrupos[]>(initialClientes)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
  const [draggedClienteId, setDraggedClienteId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<StatusType | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Buscar dados financeiros dos clientes - OTIMIZADO: uma query agregada em vez de N queries
  useEffect(() => {
    async function loadDadosFinanceiros() {
      if (initialClientes.length === 0) {
        setClientes(initialClientes)
        return
      }

      const supabase = createClient()
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      const hojeStr = hoje.toISOString().split('T')[0]

      // Buscar TODOS os lançamentos de uma vez para todos os clientes
      const clienteIds = initialClientes.map(c => c.id)

      // Query única para buscar todos os lançamentos relevantes
      const { data: todosLancamentos } = await supabase
        .from('financeiro_lancamentos')
        .select('cliente_id, valor, status, data_vencimento, tipo')
        .in('cliente_id', clienteIds)
        .eq('tipo', 'entrada')

      if (!todosLancamentos) {
        setClientes(initialClientes)
        return
      }

      // Processar dados no cliente (agregação em memória)
      const dadosPorCliente = new Map<string, {
        valorVendido: number
        valorCobrancasAtivas: number
        proximaDataVencimento: string | null
      }>()

      // Inicializar todos os clientes
      initialClientes.forEach(cliente => {
        dadosPorCliente.set(cliente.id, {
          valorVendido: 0,
          valorCobrancasAtivas: 0,
          proximaDataVencimento: null
        })
      })

      // Processar lançamentos
      todosLancamentos.forEach(lancamento => {
        if (!lancamento.cliente_id) return

        const dados = dadosPorCliente.get(lancamento.cliente_id)
        if (!dados) return

        const valor = Number(lancamento.valor || 0)

        if (lancamento.status === 'pago') {
          // Lançamentos pagos = valor vendido
          dados.valorVendido += valor
        } else {
          // Lançamentos não pagos = cobranças ativas
          dados.valorCobrancasAtivas += valor

          // Verificar próxima data de vencimento
          if (lancamento.data_vencimento) {
            const dataVenc = lancamento.data_vencimento
            if (dataVenc >= hojeStr) {
              if (!dados.proximaDataVencimento || dataVenc < dados.proximaDataVencimento) {
                dados.proximaDataVencimento = dataVenc
              }
            }
          }
        }
      })

      // Combinar dados com clientes
      const clientesComDados = initialClientes.map(cliente => {
        const dados = dadosPorCliente.get(cliente.id) || {
          valorVendido: 0,
          valorCobrancasAtivas: 0,
          proximaDataVencimento: null
        }

        return {
          ...cliente,
          valorVendido: dados.valorVendido,
          valorCobrancasAtivas: dados.valorCobrancasAtivas,
          proximaDataVencimento: dados.proximaDataVencimento
        }
      })

      setClientes(clientesComDados)
    }

    loadDadosFinanceiros()
  }, [initialClientes])

  // Função para obter inicial do nome
  const getInicial = (nome: string) => {
    return nome.charAt(0).toUpperCase()
  }

  // Função para obter cor do avatar baseado no nome (começando com verde como na imagem)
  const getAvatarColor = (nome: string) => {
    const cores = [
      'bg-green-100 text-green-800',
      'bg-blue-100 text-blue-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-yellow-100 text-yellow-800',
      'bg-indigo-100 text-indigo-800',
      'bg-red-100 text-red-800',
      'bg-teal-100 text-teal-800',
    ]
    const hash = nome.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return cores[hash % cores.length]
  }

  const filteredClientes = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.cpf_cnpj?.includes(searchTerm)
  )

  const clientesPorStatus = {
    a_iniciar: filteredClientes.filter(c => c.status === 'a_iniciar'),
    em_andamento: filteredClientes.filter(c => c.status === 'em_andamento'),
    finalizado: filteredClientes.filter(c => c.status === 'finalizado')
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const confirmed = await confirm(
      'Tem certeza que deseja excluir este cliente? Esta ação excluirá o cliente do sistema.',
      'Confirmar exclusão',
      'Excluir',
      'Cancelar',
      'danger'
    )
    if (!confirmed) return

    const supabase = createClient()

    // Exclui no banco de dados
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id)

    if (!error) {
      setClientes(clientes.filter(c => c.id !== id))
    } else {
      await alert('Erro ao excluir cliente: ' + error.message, 'Erro')
    }
  }

  const handleEditClick = (cliente: Cliente, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingCliente(cliente)
    setIsEditModalOpen(true)
  }

  const handleEditSuccess = () => {
    router.refresh()
    setIsEditModalOpen(false)
    setEditingCliente(null)
  }

  const handleStatusChange = async (clienteId: string, newStatus: StatusType) => {
    setUpdatingStatusId(clienteId)
    const supabase = createClient()
    
    const { error } = await supabase
      .from('clientes')
      .update({ status: newStatus })
      .eq('id', clienteId)

    if (!error) {
      setClientes(clientes.map(c => 
        c.id === clienteId ? { ...c, status: newStatus } : c
      ))
      router.refresh()
    } else {
      await alert('Erro ao atualizar status: ' + error.message, 'Erro')
    }
    
    setUpdatingStatusId(null)
  }

  const handleDragStart = (e: React.DragEvent, clienteId: string) => {
    // Verifica se o evento foi iniciado em um botão ou link
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('a')) {
      e.preventDefault()
      return
    }
    
    setIsDragging(true)
    setDraggedClienteId(clienteId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', clienteId)
    // Adiciona uma classe ao elemento sendo arrastado
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false)
    setDraggedClienteId(null)
    setDragOverStatus(null)
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
  }

  const handleDragOver = (e: React.DragEvent, status: StatusType) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStatus(status)
  }

  const handleDragLeave = () => {
    setDragOverStatus(null)
  }

  const handleDrop = async (e: React.DragEvent, targetStatus: StatusType) => {
    e.preventDefault()
    setDragOverStatus(null)
    setIsDragging(false)
    
    const clienteId = draggedClienteId || e.dataTransfer.getData('text/html')
    
    if (!clienteId) {
      setDraggedClienteId(null)
      return
    }

    const cliente = clientes.find(c => c.id === clienteId)
    if (!cliente || cliente.status === targetStatus) {
      setDraggedClienteId(null)
      return
    }

    await handleStatusChange(clienteId, targetStatus)
    setDraggedClienteId(null)
  }

  return (
    <div>
      <div className="mb-4 flex gap-4 items-center">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar clientes..."
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
              viewMode === 'lista'
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Visualização em lista"
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={() => onViewModeChange('kanban')}
            className={`h-9 w-9 flex items-center justify-center rounded transition-colors ${
              viewMode === 'kanban'
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Visualização em kanban"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(statusConfig) as StatusType[]).map((status) => {
          const config = statusConfig[status]
          const clientesNaColuna = clientesPorStatus[status]
          
          // Calcular valor total da coluna (soma das cobranças ativas de todos os clientes)
          const valorTotalColuna = clientesNaColuna.reduce((sum, cliente) => {
            return sum + (cliente.valorCobrancasAtivas || 0)
          }, 0)

          return (
            <div
              key={status}
              className={`rounded-lg bg-white border-t-4 ${config.borderColor} border border-gray-200 p-4 min-h-[400px] transition-colors ${
                dragOverStatus === status ? 'ring-2 ring-primary-500 ring-offset-2' : ''
              }`}
            >
              {/* Cabeçalho da coluna */}
              <div className="mb-4">
                {/* Nome da coluna + Botão de opções */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-semibold ${config.color} text-base`}>
                    {config.label}
                  </h3>
                  <button
                    className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                    title="Opções"
                    onClick={(e) => {
                      e.stopPropagation()
                      // TODO: Implementar menu de opções
                    }}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
                {/* Valor total + Quantidade de clientes */}
                <div className="flex items-center justify-between" style={{ marginTop: '-10px' }}>
                  <span className={`text-sm font-medium`} style={{ color: '#4a4a4a' }}>
                    {formatCurrency(valorTotalColuna)}
                  </span>
                  <span className={`text-sm bg-white px-2 py-1 rounded-full font-medium`} style={{ color: '#4a4a4a' }}>
                    {clientesNaColuna.length} {clientesNaColuna.length === 1 ? 'cliente' : 'clientes'}
                  </span>
                </div>
              </div>

              <div 
                className="space-y-3 min-h-[200px]"
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
              >
                {clientesNaColuna.length === 0 ? (
                  <div className={`text-center py-8 text-gray-400 text-sm rounded-lg border-2 border-dashed transition-colors ${
                    dragOverStatus === status ? 'border-primary-400 bg-primary-50' : 'border-gray-200'
                  }`}>
                    {dragOverStatus === status ? 'Solte aqui' : 'Nenhum cliente'}
                  </div>
                ) : (
                  clientesNaColuna.map((cliente) => (
                    <div
                      key={cliente.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, cliente.id)}
                      onDragEnd={handleDragEnd}
                      className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${
                        draggedClienteId === cliente.id ? 'opacity-50' : 'opacity-100'
                      }`}
                      onClick={(e) => {
                        // Só navega se não estiver arrastando
                        if (!isDragging && !draggedClienteId) {
                          router.push(`/clientes/${cliente.id}`)
                        }
                      }}
                    >
                      {/* Foto + Nome */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-full ${getAvatarColor(cliente.nome)} flex items-center justify-center flex-shrink-0 font-semibold text-base`}>
                          {getInicial(cliente.nome)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/clientes/${cliente.id}`}
                            className="font-semibold text-gray-900 hover:text-primary-600 text-base block truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {cliente.nome}
                          </Link>
                        </div>
                        <div 
                          className="flex items-center gap-1 flex-shrink-0" 
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          draggable={false}
                        >
                          <Link
                            href={`/clientes/${cliente.id}`}
                            className="p-1.5 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={(e) => handleEditClick(cliente, e)}
                            className="p-1.5 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(cliente.id, e)}
                            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {/* Valor das cobranças ativas */}
                        <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
                          <Wallet className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900" style={{ color: '#4a4a4a' }}>
                            {formatCurrency(cliente.valorCobrancasAtivas || 0)}
                          </span>
                        </div>

                        {/* Data de vencimento */}
                        {cliente.proximaDataVencimento && (
                          <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
                            <Calendar className="w-4 h-4 text-gray-600 flex-shrink-0" />
                            <span className="text-sm text-gray-600" style={{ color: '#4a4a4a' }}>
                              {formatDate(cliente.proximaDataVencimento)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Separador */}
                      {(cliente.origem || (cliente.grupos && cliente.grupos.length > 0)) && (
                        <div className="border-t border-gray-200 my-3"></div>
                      )}

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2" onMouseDown={(e) => e.stopPropagation()}>
                        {cliente.origem && (
                          <span className="text-xs bg-blue-500 text-white px-2.5 py-1 rounded font-medium">
                            {cliente.origem}
                          </span>
                        )}
                        {cliente.grupos && cliente.grupos
                          .filter(cg => cg.grupos && !cg.data_saida)
                          .map((cg, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-gray-200 text-gray-800 px-2.5 py-1 rounded"
                            >
                              {cg.grupos?.nome}
                            </span>
                          ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      <ClienteModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingCliente(null)
        }}
        onSuccess={handleEditSuccess}
        cliente={editingCliente}
      />
    </div>
  )
}

