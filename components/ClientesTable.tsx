'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { Database } from '@/types/database.types'
import { Eye, Edit, Trash2, Search, Settings2, ChevronDown, List, LayoutGrid } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ClienteModal } from './modals/ClienteModal'
import { useModal } from '@/contexts/ModalContext'

type Cliente = Database['public']['Tables']['clientes']['Row']
type Grupo = Database['public']['Tables']['grupos']['Row']

type ClienteComGrupos = Cliente & {
  grupos?: Array<{
    grupos: Grupo
    data_saida?: string | null
  }>
}

type ViewMode = 'lista' | 'kanban'

interface ClientesTableProps {
  clientes: ClienteComGrupos[]
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

type ColumnKey = 'nome' | 'tipo_pessoa' | 'cpf_cnpj' | 'email' | 'status' | 'data_cadastro' | 'telefone' | 'origem' | 'grupo'

interface ColumnConfig {
  key: ColumnKey
  label: string
  defaultVisible: boolean
}

const STORAGE_KEY = 'clientes_table_visible_columns'

const availableColumns: ColumnConfig[] = [
  { key: 'nome', label: 'Nome', defaultVisible: true },
  { key: 'tipo_pessoa', label: 'Tipo', defaultVisible: true },
  { key: 'cpf_cnpj', label: 'CPF/CNPJ', defaultVisible: true },
  { key: 'email', label: 'Email', defaultVisible: true },
  { key: 'telefone', label: 'Telefone', defaultVisible: false },
  { key: 'status', label: 'Status', defaultVisible: true },
  { key: 'data_cadastro', label: 'Data Cadastro', defaultVisible: true },
  { key: 'origem', label: 'Origem', defaultVisible: false },
  { key: 'grupo', label: 'Grupo', defaultVisible: false },
]

export function ClientesTable({ clientes: initialClientes, viewMode, onViewModeChange }: ClientesTableProps) {
  const router = useRouter()
  const { alert, confirm } = useModal()
  const [clientes, setClientes] = useState(initialClientes)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => {
    // Carregar preferências salvas do localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const savedColumns = JSON.parse(saved) as string[]
          const savedSet = new Set<ColumnKey>(savedColumns.filter(col => 
            availableColumns.some(ac => ac.key === col)
          ) as ColumnKey[])
          // Se houver preferências salvas válidas, usar elas
          if (savedSet.size > 0) {
            return savedSet
          }
        }
      } catch (error) {
        console.error('Erro ao carregar preferências de colunas:', error)
      }
    }
    // Fallback para padrão
    const defaultVisible = new Set<ColumnKey>()
    availableColumns.forEach(col => {
      if (col.defaultVisible) {
        defaultVisible.add(col.key)
      }
    })
    return defaultVisible
  })
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)

  // Sincronizar com mudanças do parent component
  useEffect(() => {
    setClientes(initialClientes)
  }, [initialClientes])

  const filteredClientes = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.cpf_cnpj?.includes(searchTerm)
  )

  const handleDelete = async (id: string) => {
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
    // Recarregar a lista de clientes
    router.refresh()
    setIsEditModalOpen(false)
    setEditingCliente(null)
  }

  // Salvar preferências no localStorage sempre que mudarem
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const columnsArray = Array.from(visibleColumns)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(columnsArray))
      } catch (error) {
        console.error('Erro ao salvar preferências de colunas:', error)
      }
    }
  }, [visibleColumns])

  const toggleColumn = (columnKey: ColumnKey) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey)
      } else {
        newSet.add(columnKey)
      }
      return newSet
    })
  }

  const handleStatusChange = async (clienteId: string, newStatus: 'a_iniciar' | 'em_andamento' | 'finalizado') => {
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

  const getStatusBadge = (status: string) => {
    const styles = {
      a_iniciar: 'bg-yellow-100 text-yellow-800',
      em_andamento: 'bg-blue-100 text-blue-800',
      finalizado: 'bg-green-100 text-green-800',
    }
    return styles[status as keyof typeof styles] || styles.a_iniciar
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      a_iniciar: 'A iniciar',
      em_andamento: 'Em andamento',
      finalizado: 'Finalizado',
    }
    return labels[status as keyof typeof labels] || status
  }

  const visibleColumnsArray = availableColumns.filter(col => visibleColumns.has(col.key))
  const colSpanCount = visibleColumnsArray.length + 1 // +1 para coluna de ações

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
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
              className="flex items-center gap-2 h-10 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Settings2 className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-700">Colunas</span>
              <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isColumnMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          {isColumnMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsColumnMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-2">
                <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1 mb-1">
                  Mostrar colunas
                </div>
                {availableColumns.map((column) => (
                  <label
                    key={column.key}
                    className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(column.key)}
                      onChange={() => toggleColumn(column.key)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{column.label}</span>
                  </label>
                ))}
              </div>
            </>
          )}
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              {visibleColumns.has('nome') && (
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Nome</th>
              )}
              {visibleColumns.has('tipo_pessoa') && (
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Tipo</th>
              )}
              {visibleColumns.has('cpf_cnpj') && (
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">CPF/CNPJ</th>
              )}
              {visibleColumns.has('email') && (
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Email</th>
              )}
              {visibleColumns.has('telefone') && (
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Telefone</th>
              )}
              {visibleColumns.has('status') && (
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
              )}
              {visibleColumns.has('data_cadastro') && (
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Data Cadastro</th>
              )}
              {visibleColumns.has('origem') && (
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Origem</th>
              )}
              {visibleColumns.has('grupo') && (
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Grupo</th>
              )}
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredClientes.length === 0 ? (
              <tr>
                <td colSpan={colSpanCount} className="text-center py-8 text-gray-500">
                  Nenhum cliente encontrado
                </td>
              </tr>
            ) : (
              filteredClientes.map((cliente) => (
                <tr 
                  key={cliente.id} 
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/clientes/${cliente.id}`)}
                >
                  {visibleColumns.has('nome') && (
                    <td className="py-3 px-4">
                      <Link
                        href={`/clientes/${cliente.id}`}
                        className="text-sm font-medium text-primary-600 hover:text-primary-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {cliente.nome}
                      </Link>
                    </td>
                  )}
                  {visibleColumns.has('tipo_pessoa') && (
                    <td className="py-3 px-4 text-sm text-gray-700">{cliente.tipo_pessoa}</td>
                  )}
                  {visibleColumns.has('cpf_cnpj') && (
                    <td className="py-3 px-4 text-sm text-gray-700">{cliente.cpf_cnpj || '-'}</td>
                  )}
                  {visibleColumns.has('email') && (
                    <td className="py-3 px-4 text-sm text-gray-700">{cliente.email || '-'}</td>
                  )}
                  {visibleColumns.has('telefone') && (
                    <td className="py-3 px-4 text-sm text-gray-700">{cliente.telefone || '-'}</td>
                  )}
                  {visibleColumns.has('status') && (
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={cliente.status}
                        onChange={(e) => handleStatusChange(cliente.id, e.target.value as 'a_iniciar' | 'em_andamento' | 'finalizado')}
                        disabled={updatingStatusId === cliente.id}
                        className={`text-xs font-medium rounded-full px-3 py-1 border-0 cursor-pointer focus:ring-2 focus:ring-primary-500 focus:outline-none appearance-none ${getStatusBadge(cliente.status)} ${updatingStatusId === cliente.id ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'} transition-opacity`}
                        style={{
                          backgroundImage: updatingStatusId !== cliente.id ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")` : 'none',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 0.5rem center',
                          paddingRight: updatingStatusId !== cliente.id ? '2rem' : '0.75rem',
                        }}
                      >
                        <option value="a_iniciar">A iniciar</option>
                        <option value="em_andamento">Em andamento</option>
                        <option value="finalizado">Finalizado</option>
                      </select>
                    </td>
                  )}
                  {visibleColumns.has('data_cadastro') && (
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(cliente.data_cadastro)}
                    </td>
                  )}
                  {visibleColumns.has('origem') && (
                    <td className="py-3 px-4 text-sm text-gray-700">{cliente.origem || '-'}</td>
                  )}
                  {visibleColumns.has('grupo') && (
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {cliente.grupos && cliente.grupos.length > 0
                        ? cliente.grupos
                            .filter(cg => cg.grupos)
                            .map(cg => cg.grupos.nome)
                            .join(', ')
                        : '-'}
                    </td>
                  )}
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/clientes/${cliente.id}`}
                        className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={(e) => handleEditClick(cliente, e)}
                        className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cliente.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

