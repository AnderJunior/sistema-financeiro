'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Database } from '@/types/database.types'
import { Eye, Search, Settings2, ChevronDown, ChevronUp, List, LayoutGrid, Package } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

type Lancamento = Database['public']['Tables']['financeiro_lancamentos']['Row'] & {
  servicos?: Database['public']['Tables']['servicos']['Row']
  clientes?: Database['public']['Tables']['clientes']['Row']
}

type ViewMode = 'lista' | 'kanban'

type KanbanColuna = {
  id: string
  nome: string
  cor: string
  ordem: number
  status_servico: string | null
  ativo: boolean
}

interface ProjetosTableProps {
  projetos: Lancamento[]
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onProjetosChange?: (projetos: Lancamento[]) => void
}

type ColumnKey = 'servico' | 'cliente' | 'valor' | 'data_vencimento' | 'status_servico'
type SortField = 'cliente' | 'servico' | 'valor' | 'data_vencimento' | 'status_servico' | null
type SortDirection = 'asc' | 'desc'

interface ColumnConfig {
  key: ColumnKey
  label: string
  defaultVisible: boolean
}

const STORAGE_KEY = 'projetos_table_visible_columns'

const availableColumns: ColumnConfig[] = [
  { key: 'cliente', label: 'Cliente', defaultVisible: true },
  { key: 'servico', label: 'Serviço', defaultVisible: true },
  { key: 'valor', label: 'Valor', defaultVisible: true },
  { key: 'data_vencimento', label: 'Data Vencimento', defaultVisible: true },
  { key: 'status_servico', label: 'Status', defaultVisible: true },
]

export function ProjetosTable({ projetos: initialProjetos, viewMode, onViewModeChange, onProjetosChange }: ProjetosTableProps) {
  const router = useRouter()
  const [projetos, setProjetos] = useState(initialProjetos)
  const [searchTerm, setSearchTerm] = useState('')
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const savedColumns = JSON.parse(saved) as string[]
          const savedSet = new Set<ColumnKey>(savedColumns.filter(col => 
            availableColumns.some(ac => ac.key === col)
          ) as ColumnKey[])
          if (savedSet.size > 0) {
            return savedSet
          }
        }
      } catch (error) {
        console.error('Erro ao carregar preferências de colunas:', error)
      }
    }
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
  const [colunasKanban, setColunasKanban] = useState<KanbanColuna[]>([])
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  useEffect(() => {
    setProjetos(initialProjetos)
  }, [initialProjetos])

  useEffect(() => {
    loadColunasKanban()
  }, [])

  // OTIMIZADO: Subscription realtime com debounce e atualização incremental
  useEffect(() => {
    const supabase = createClient()
    let debounceTimer: NodeJS.Timeout | null = null
    
    const channel = supabase
      .channel('projetos_table_status_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // OTIMIZADO: Apenas UPDATE, não todos os eventos
          schema: 'public',
          table: 'financeiro_lancamentos',
          filter: 'servico_id=not.is.null',
        },
        (payload) => {
          // Debounce para evitar múltiplas atualizações rápidas
          if (debounceTimer) {
            clearTimeout(debounceTimer)
          }
          
          debounceTimer = setTimeout(() => {
            const updatedLancamento = payload.new as any
            const oldLancamento = payload.old as any
            
            // Verificar se o status_servico realmente mudou
            if (updatedLancamento.status_servico !== oldLancamento?.status_servico) {
              if (updatedLancamento.servico_id && updatedLancamento.cliente_id) {
                // Atualização incremental - apenas o registro específico
                setProjetos(prevProjetos => {
                  const updated = prevProjetos.map(p =>
                    (p.servico_id === updatedLancamento.servico_id && 
                     p.cliente_id === updatedLancamento.cliente_id)
                      ? { ...p, status_servico: updatedLancamento.status_servico }
                      : p
                  )
                  
                  // Notificar componente pai se necessário
                  if (onProjetosChange) {
                    onProjetosChange(updated)
                  }
                  
                  return updated
                })
              }
            }
          }, 100) // Debounce de 100ms
        }
      )
      .subscribe()

    // Listener para eventos customizados de outros componentes
    const handleCustomEvent = (e: CustomEvent) => {
      const { servicoId, clienteId, newStatus } = e.detail
      setProjetos(prevProjetos => {
        const updated = prevProjetos.map(p => 
          (p.servico_id === servicoId && p.cliente_id === clienteId)
            ? { ...p, status_servico: newStatus }
            : p
        )
        
        if (onProjetosChange) {
          onProjetosChange(updated)
        }
        
        return updated
      })
    }

    window.addEventListener('projetoStatusChanged', handleCustomEvent as EventListener)

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      supabase.removeChannel(channel)
      window.removeEventListener('projetoStatusChanged', handleCustomEvent as EventListener)
    }
  }, [onProjetosChange])

  async function loadColunasKanban() {
    // OTIMIZADO: Verificar cache primeiro (colunas kanban raramente mudam)
    const cacheKey = 'kanban_colunas_ativo'
    const cached = sessionStorage.getItem(cacheKey)
    
    if (cached) {
      try {
        const data = JSON.parse(cached) as KanbanColuna[]
        setColunasKanban(data)
        return
      } catch (e) {
        // Se cache inválido, continuar com query
      }
    }
    
    const supabase = createClient()
    // OTIMIZADO: Selecionar apenas campos necessários
    const { data, error } = await supabase
      .from('kanban_colunas')
      .select('id, nome, cor, ordem, ativo, status_servico')
      .eq('ativo', true)
      .order('ordem', { ascending: true })

    if (!error && data) {
      setColunasKanban(data as KanbanColuna[])
      // Cachear por 5 minutos
      sessionStorage.setItem(cacheKey, JSON.stringify(data))
    }
  }

  const filteredProjetos = useMemo(() => {
    let filtered = projetos.filter(projeto =>
      projeto.servicos?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projeto.clientes?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      projeto.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: string | number | null = null
        let bValue: string | number | null = null

        switch (sortField) {
          case 'cliente':
            aValue = a.clientes?.nome?.toLowerCase() || ''
            bValue = b.clientes?.nome?.toLowerCase() || ''
            break
          case 'servico':
            aValue = a.servicos?.nome?.toLowerCase() || ''
            bValue = b.servicos?.nome?.toLowerCase() || ''
            break
          case 'valor':
            aValue = a.valor ? Number(a.valor) : null
            bValue = b.valor ? Number(b.valor) : null
            break
          case 'data_vencimento':
            aValue = a.data_vencimento ? new Date(a.data_vencimento).getTime() : null
            bValue = b.data_vencimento ? new Date(b.data_vencimento).getTime() : null
            break
          case 'status_servico':
            // Usar a ordem do kanban ao invés do nome alfabeticamente
            const aColuna = colunasKanban.find(c => c.id === a.status_servico)
            const bColuna = colunasKanban.find(c => c.id === b.status_servico)
            // Se não encontrar a coluna, usar um número alto para ir para o final
            aValue = aColuna ? aColuna.ordem : 9999
            bValue = bColuna ? bColuna.ordem : 9999
            break
        }

        // Valores nulos/vazios sempre vão para o final
        // Para status, valores não encontrados (9999) já vão para o final
        if (sortField === 'status_servico') {
          // Para status, já tratamos valores não encontrados com 9999
          if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
          if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
          return 0
        }
        
        // Para outros campos, tratar valores nulos/vazios
        if (aValue === null || aValue === '') return 1
        if (bValue === null || bValue === '') return -1

        // Comparação normal
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [projetos, searchTerm, sortField, sortDirection, colunasKanban])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Se já está ordenando por este campo, inverte a direção
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Se é um novo campo, ordena ascendente
      setSortField(field)
      setSortDirection('asc')
    }
  }

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

  const handleStatusChange = async (projeto: Lancamento, colunaId: string) => {
    if (!projeto.servico_id || !projeto.cliente_id) return
    
    const oldStatus = projeto.status_servico
    setUpdatingStatusId(projeto.id)
    const supabase = createClient()
    
    // Atualizar estado local imediatamente para feedback visual instantâneo
    setProjetos(prevProjetos => 
      prevProjetos.map(p => 
        (p.servico_id === projeto.servico_id && p.cliente_id === projeto.cliente_id)
          ? { ...p, status_servico: colunaId as any }
          : p
      )
    )
    
    // Atualizar status_servico com o ID da coluna do kanban
    // Isso vai disparar a subscription realtime que atualizará o kanban automaticamente
    const { error } = await supabase
      .from('financeiro_lancamentos')
      .update({ status_servico: colunaId })
      .eq('servico_id', projeto.servico_id)
      .eq('cliente_id', projeto.cliente_id)

    if (error) {
      // Se houver erro, reverter a mudança local
      setProjetos(prevProjetos => 
        prevProjetos.map(p => 
          (p.servico_id === projeto.servico_id && p.cliente_id === projeto.cliente_id)
            ? { ...p, status_servico: oldStatus }
            : p
        )
      )
      console.error('Erro ao atualizar status:', error)
    } else {
      // Disparar evento customizado para sincronizar com outros componentes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('projetoStatusChanged', {
          detail: {
            servicoId: projeto.servico_id,
            clienteId: projeto.cliente_id,
            newStatus: colunaId
          }
        }))
      }
    }
    
    setUpdatingStatusId(null)
  }

  const getStatusBadge = (statusId: string | null) => {
    // Buscar a coluna do kanban pelo ID
    const coluna = colunasKanban.find(c => c.id === statusId)
    if (coluna) {
      // Converter cor hexadecimal para classes Tailwind aproximadas
      // Se a cor for conhecida, usar classes específicas, senão usar estilo inline
      const corLower = coluna.cor.toLowerCase()
      if (corLower === '#fcd34d' || corLower.includes('yellow')) {
        return 'bg-yellow-100 text-yellow-800'
      } else if (corLower === '#3b82f6' || corLower.includes('blue')) {
        return 'bg-blue-100 text-blue-800'
      } else if (corLower === '#10b981' || corLower.includes('green')) {
        return 'bg-green-100 text-green-800'
      }
      // Para cores personalizadas, usar estilo inline
      return ''
    }
    // Fallback para status antigos ou não encontrados
    return 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (statusId: string | null) => {
    // Buscar a coluna do kanban pelo ID
    const coluna = colunasKanban.find(c => c.id === statusId)
    return coluna ? coluna.nome : 'Sem Status'
  }

  const getStatusStyle = (statusId: string | null) => {
    const coluna = colunasKanban.find(c => c.id === statusId)
    if (coluna) {
      const corLower = coluna.cor.toLowerCase()
      // Se não for uma das cores padrão, usar estilo inline
      if (!['#fcd34d', '#3b82f6', '#10b981'].includes(corLower) && 
          !corLower.includes('yellow') && 
          !corLower.includes('blue') && 
          !corLower.includes('green')) {
        return {
          backgroundColor: `${coluna.cor}20`,
          color: coluna.cor,
        }
      }
    }
    return {}
  }

  const visibleColumnsArray = availableColumns.filter(col => visibleColumns.has(col.key))
  const colSpanCount = visibleColumnsArray.length + 1

  return (
    <div>
      <div className="mb-4 flex gap-4 items-center">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar projetos..."
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
              {visibleColumns.has('cliente') && (
                <th 
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => handleSort('cliente')}
                >
                  <div className="flex items-center gap-2">
                    <span>Cliente</span>
                    {sortField === 'cliente' && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4 text-primary-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-primary-600" />
                      )
                    )}
                  </div>
                </th>
              )}
              {visibleColumns.has('servico') && (
                <th 
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => handleSort('servico')}
                >
                  <div className="flex items-center gap-2">
                    <span>Serviço</span>
                    {sortField === 'servico' && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4 text-primary-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-primary-600" />
                      )
                    )}
                  </div>
                </th>
              )}
              {visibleColumns.has('valor') && (
                <th 
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => handleSort('valor')}
                >
                  <div className="flex items-center gap-2">
                    <span>Valor</span>
                    {sortField === 'valor' && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4 text-primary-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-primary-600" />
                      )
                    )}
                  </div>
                </th>
              )}
              {visibleColumns.has('data_vencimento') && (
                <th 
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => handleSort('data_vencimento')}
                >
                  <div className="flex items-center gap-2">
                    <span>Data Vencimento</span>
                    {sortField === 'data_vencimento' && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4 text-primary-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-primary-600" />
                      )
                    )}
                  </div>
                </th>
              )}
              {visibleColumns.has('status_servico') && (
                <th 
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => handleSort('status_servico')}
                >
                  <div className="flex items-center gap-2">
                    <span>Status</span>
                    {sortField === 'status_servico' && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4 text-primary-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-primary-600" />
                      )
                    )}
                  </div>
                </th>
              )}
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjetos.length === 0 ? (
              <tr>
                <td colSpan={colSpanCount} className="text-center py-8 text-gray-500">
                  Nenhum projeto encontrado
                </td>
              </tr>
            ) : (
              filteredProjetos.map((projeto) => (
                <tr 
                  key={`${projeto.servico_id}-${projeto.cliente_id}`}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => projeto.cliente_id && router.push(`/clientes/${projeto.cliente_id}`)}
                >
                  {visibleColumns.has('cliente') && (
                    <td className="py-3 px-4">
                      <Link
                        href={projeto.cliente_id ? `/clientes/${projeto.cliente_id}` : '#'}
                        className="text-sm font-semibold text-gray-900 hover:text-primary-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {projeto.clientes?.nome || 'Cliente não encontrado'}
                      </Link>
                    </td>
                  )}
                  {visibleColumns.has('servico') && (
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary-600" />
                        <span className="text-sm font-medium text-gray-900">
                          {projeto.servicos?.nome || 'Serviço não encontrado'}
                        </span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.has('valor') && (
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {formatCurrency(Number(projeto.valor))}
                    </td>
                  )}
                  {visibleColumns.has('data_vencimento') && (
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {projeto.data_vencimento ? formatDate(projeto.data_vencimento) : '-'}
                    </td>
                  )}
                  {visibleColumns.has('status_servico') && (
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      {colunasKanban.length > 0 ? (
                        <select
                          value={projeto.status_servico || colunasKanban[0]?.id || ''}
                          onChange={(e) => handleStatusChange(projeto, e.target.value)}
                          disabled={updatingStatusId === projeto.id}
                          className={`text-xs font-medium rounded-full px-3 py-1 border-0 cursor-pointer focus:ring-2 focus:ring-primary-500 focus:outline-none appearance-none ${getStatusBadge(projeto.status_servico || colunasKanban[0]?.id)} ${updatingStatusId === projeto.id ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'} transition-opacity`}
                          style={{
                            backgroundImage: updatingStatusId !== projeto.id ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23374151' d='M6 9L1 4h10z'/%3E%3C/svg%3E")` : 'none',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.5rem center',
                            paddingRight: updatingStatusId !== projeto.id ? '2rem' : '0.75rem',
                            ...getStatusStyle(projeto.status_servico || colunasKanban[0]?.id),
                          }}
                        >
                          {colunasKanban.map((coluna) => (
                            <option key={coluna.id} value={coluna.id}>
                              {coluna.nome}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-gray-500">Carregando...</span>
                      )}
                    </td>
                  )}
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      {projeto.cliente_id && (
                        <Link
                          href={`/clientes/${projeto.cliente_id}`}
                          className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


