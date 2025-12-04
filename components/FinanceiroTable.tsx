'use client'

import { formatCurrency, formatDate } from '@/lib/utils'
import { Database } from '@/types/database.types'
import { Edit, Trash2, ArrowUpRight, ArrowDownRight, Copy, ArrowRight, ChevronUp, ChevronDown } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useModal } from '@/contexts/ModalContext'
import { LancamentoModal } from '@/components/modals/LancamentoModal'

type Cliente = Database['public']['Tables']['clientes']['Row']

type Categoria = Database['public']['Tables']['financeiro_categorias']['Row']

type Lancamento = Database['public']['Tables']['financeiro_lancamentos']['Row'] & {
  invoice_url?: string | null
  clientes?: Cliente | null
  financeiro_categorias?: Categoria | null
}

type ContaFinanceira = Database['public']['Tables']['contas_financeiras']['Row']

type Transferencia = Database['public']['Tables']['transferencias_bancarias']['Row'] & {
  banco_origem?: ContaFinanceira | null
  banco_recebedor?: ContaFinanceira | null
}

interface FinanceiroTableProps {
  lancamentos: Lancamento[]
  transferencias?: Transferencia[]
}

type SortFieldLancamento = 'cliente' | 'categoria' | 'data' | 'vencimento' | 'status' | 'valor' | null
type SortFieldTransferencia = 'conta_origem' | 'conta_destino' | 'data' | 'descricao' | 'valor' | null
type SortDirection = 'asc' | 'desc'

export function FinanceiroTable({ lancamentos: initialLancamentos, transferencias = [] }: FinanceiroTableProps) {
  const { alert, confirm } = useModal()
  const [lancamentos, setLancamentos] = useState(initialLancamentos)
  const [filter, setFilter] = useState<'all' | 'entrada' | 'saida' | 'transferencia'>('all')
  const [editingLancamento, setEditingLancamento] = useState<Lancamento | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [sortFieldLancamento, setSortFieldLancamento] = useState<SortFieldLancamento>(null)
  const [sortFieldTransferencia, setSortFieldTransferencia] = useState<SortFieldTransferencia>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Sincronizar com mudanças do parent component
  useEffect(() => {
    setLancamentos(initialLancamentos)
  }, [initialLancamentos])

  const handleEdit = (lancamento: Lancamento) => {
    setEditingLancamento(lancamento)
    setIsEditModalOpen(true)
  }

  const handleEditSuccess = () => {
    setIsEditModalOpen(false)
    setEditingLancamento(null)
    // Recarregar a página para atualizar os dados
    window.location.reload()
  }

  const handleEditClose = () => {
    setIsEditModalOpen(false)
    setEditingLancamento(null)
  }

  const filteredLancamentos = useMemo(() => {
    let filtered = filter === 'all'
      ? lancamentos
      : lancamentos.filter(l => l.tipo === filter)

    if (sortFieldLancamento) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: string | number | null = null
        let bValue: string | number | null = null

        switch (sortFieldLancamento) {
          case 'cliente':
            aValue = a.clientes?.nome?.toLowerCase() || ''
            bValue = b.clientes?.nome?.toLowerCase() || ''
            break
          case 'categoria':
            aValue = a.financeiro_categorias?.nome?.toLowerCase() || ''
            bValue = b.financeiro_categorias?.nome?.toLowerCase() || ''
            break
          case 'data':
            aValue = a.data_competencia ? new Date(a.data_competencia).getTime() : null
            bValue = b.data_competencia ? new Date(b.data_competencia).getTime() : null
            break
          case 'vencimento':
            aValue = a.data_vencimento ? new Date(a.data_vencimento).getTime() : null
            bValue = b.data_vencimento ? new Date(b.data_vencimento).getTime() : null
            break
          case 'status':
            // Ordenar status: previsto (1), pago (2), em_atraso (3), cancelado (4)
            const statusOrder: Record<string, number> = {
              'previsto': 1,
              'pago': 2,
              'em_atraso': 3,
              'cancelado': 4,
            }
            aValue = statusOrder[a.status] || 9999
            bValue = statusOrder[b.status] || 9999
            break
          case 'valor':
            aValue = a.valor ? Number(a.valor) : null
            bValue = b.valor ? Number(b.valor) : null
            break
        }

        // Valores nulos/vazios sempre vão para o final
        // Para status, valores não encontrados (9999) já vão para o final
        if (sortFieldLancamento === 'status') {
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
  }, [lancamentos, filter, sortFieldLancamento, sortDirection])

  const sortedTransferencias = useMemo(() => {
    if (!sortFieldTransferencia) return transferencias

    return [...transferencias].sort((a, b) => {
      let aValue: string | number | null = null
      let bValue: string | number | null = null

      switch (sortFieldTransferencia) {
        case 'conta_origem':
          aValue = a.banco_origem?.nome?.toLowerCase() || ''
          bValue = b.banco_origem?.nome?.toLowerCase() || ''
          break
        case 'conta_destino':
          aValue = a.banco_recebedor?.nome?.toLowerCase() || ''
          bValue = b.banco_recebedor?.nome?.toLowerCase() || ''
          break
        case 'data':
          aValue = a.data_transferencia ? new Date(a.data_transferencia).getTime() : null
          bValue = b.data_transferencia ? new Date(b.data_transferencia).getTime() : null
          break
        case 'descricao':
          aValue = a.descricao?.toLowerCase() || ''
          bValue = b.descricao?.toLowerCase() || ''
          break
        case 'valor':
          aValue = a.valor_enviado ? Number(a.valor_enviado) : null
          bValue = b.valor_enviado ? Number(b.valor_enviado) : null
          break
      }

      // Valores nulos/vazios sempre vão para o final
      if (aValue === null || aValue === '') return 1
      if (bValue === null || bValue === '') return -1

      // Comparação normal
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [transferencias, sortFieldTransferencia, sortDirection])

  const handleSortLancamento = (field: SortFieldLancamento) => {
    if (sortFieldLancamento === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortFieldLancamento(field)
      setSortDirection('asc')
    }
    // Resetar ordenação de transferências quando ordenar lançamentos
    setSortFieldTransferencia(null)
  }

  const handleSortTransferencia = (field: SortFieldTransferencia) => {
    if (sortFieldTransferencia === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortFieldTransferencia(field)
      setSortDirection('asc')
    }
    // Resetar ordenação de lançamentos quando ordenar transferências
    setSortFieldLancamento(null)
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm(
      'Tem certeza que deseja excluir este lançamento?',
      'Confirmar exclusão',
      'Excluir',
      'Cancelar',
      'danger'
    )
    if (!confirmed) return

    const supabase = createClient()
    const { error } = await supabase
      .from('financeiro_lancamentos')
      .delete()
      .eq('id', id)

    if (!error) {
      setLancamentos(lancamentos.filter(l => l.id !== id))
    }
  }

  const handleDeleteTransferencia = async (id: string) => {
    const confirmed = await confirm(
      'Tem certeza que deseja excluir esta transferência?',
      'Confirmar exclusão',
      'Excluir',
      'Cancelar',
      'danger'
    )
    if (!confirmed) return

    const supabase = createClient()
    const { error } = await supabase
      .from('transferencias_bancarias')
      .delete()
      .eq('id', id)

    if (!error) {
      // Recarregar a página para atualizar os dados
      window.location.reload()
    } else {
      await alert('Erro ao excluir transferência: ' + (error?.message || 'Erro desconhecido'), 'Erro')
    }
  }

  const handleCopyLink = async (invoiceUrl: string) => {
    try {
      await navigator.clipboard.writeText(invoiceUrl)
      // Feedback visual simples
      const button = document.activeElement as HTMLElement
      const originalTitle = button.title
      button.title = 'Link copiado!'
      setTimeout(() => {
        button.title = originalTitle
      }, 2000)
    } catch (err) {
      await alert('Erro ao copiar link. Tente novamente.', 'Erro')
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pago: 'bg-green-100 text-green-800',
      previsto: 'bg-yellow-100 text-yellow-800',
      em_atraso: 'bg-red-100 text-red-800',
      cancelado: 'bg-gray-100 text-gray-800',
    }
    return styles[status as keyof typeof styles] || styles.previsto
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter('entrada')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'entrada'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Entradas
        </button>
        <button
          onClick={() => setFilter('saida')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'saida'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Saídas
        </button>
        <button
          onClick={() => setFilter('transferencia')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'transferencia'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Transferência
        </button>
      </div>

      {filter === 'transferencia' ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th 
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => handleSortTransferencia('conta_origem')}
                >
                  <div className="flex items-center gap-2">
                    <span>Conta de Origem</span>
                    {sortFieldTransferencia === 'conta_origem' && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4 text-primary-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-primary-600" />
                      )
                    )}
                  </div>
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600"></th>
                <th 
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => handleSortTransferencia('conta_destino')}
                >
                  <div className="flex items-center gap-2">
                    <span>Conta de Destino</span>
                    {sortFieldTransferencia === 'conta_destino' && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4 text-primary-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-primary-600" />
                      )
                    )}
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => handleSortTransferencia('data')}
                >
                  <div className="flex items-center gap-2">
                    <span>Data</span>
                    {sortFieldTransferencia === 'data' && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4 text-primary-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-primary-600" />
                      )
                    )}
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => handleSortTransferencia('descricao')}
                >
                  <div className="flex items-center gap-2">
                    <span>Descrição</span>
                    {sortFieldTransferencia === 'descricao' && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4 text-primary-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-primary-600" />
                      )
                    )}
                  </div>
                </th>
                <th 
                  className="text-right py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => handleSortTransferencia('valor')}
                >
                  <div className="flex items-center justify-end gap-2">
                    <span>Valor</span>
                    {sortFieldTransferencia === 'valor' && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4 text-primary-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-primary-600" />
                      )
                    )}
                  </div>
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sortedTransferencias.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Nenhuma transferência encontrada
                  </td>
                </tr>
              ) : (
                sortedTransferencias.map((transferencia) => (
                  <tr key={transferencia.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-gray-900">
                        {transferencia.banco_origem?.nome || 'Conta não encontrada'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {transferencia.banco_origem?.tipo === 'bancaria' && 'Bancária'}
                        {transferencia.banco_origem?.tipo === 'carteira_digital' && 'Carteira Digital'}
                        {transferencia.banco_origem?.tipo === 'caixa_fisico' && 'Caixa Físico'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <ArrowRight className="w-5 h-5 text-primary-600" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-gray-900">
                        {transferencia.banco_recebedor?.nome || 'Conta não encontrada'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {transferencia.banco_recebedor?.tipo === 'bancaria' && 'Bancária'}
                        {transferencia.banco_recebedor?.tipo === 'carteira_digital' && 'Carteira Digital'}
                        {transferencia.banco_recebedor?.tipo === 'caixa_fisico' && 'Caixa Físico'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(transferencia.data_transferencia)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {transferencia.descricao || '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-semibold text-primary-600">
                      {formatCurrency(Number(transferencia.valor_enviado))}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDeleteTransferencia(transferencia.id)}
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
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th 
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => handleSortLancamento('cliente')}
                >
                  <div className="flex items-center gap-2">
                    <span>Cliente</span>
                    {sortFieldLancamento === 'cliente' && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4 text-primary-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-primary-600" />
                      )
                    )}
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => handleSortLancamento('categoria')}
                >
                  <div className="flex items-center gap-2">
                    <span>Categoria</span>
                    {sortFieldLancamento === 'categoria' && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4 text-primary-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-primary-600" />
                      )
                    )}
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => handleSortLancamento('data')}
                >
                  <div className="flex items-center gap-2">
                    <span>Data</span>
                    {sortFieldLancamento === 'data' && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4 text-primary-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-primary-600" />
                      )
                    )}
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => handleSortLancamento('vencimento')}
                >
                  <div className="flex items-center gap-2">
                    <span>Vencimento</span>
                    {sortFieldLancamento === 'vencimento' && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4 text-primary-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-primary-600" />
                      )
                    )}
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => handleSortLancamento('status')}
                >
                  <div className="flex items-center gap-2">
                    <span>Status</span>
                    {sortFieldLancamento === 'status' && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4 text-primary-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-primary-600" />
                      )
                    )}
                  </div>
                </th>
                <th 
                  className="text-right py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => handleSortLancamento('valor')}
                >
                  <div className="flex items-center justify-end gap-2">
                    <span>Valor</span>
                    {sortFieldLancamento === 'valor' && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4 text-primary-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-primary-600" />
                      )
                    )}
                  </div>
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredLancamentos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Nenhum lançamento encontrado
                  </td>
                </tr>
              ) : (
                filteredLancamentos.map((lancamento) => (
                  <tr key={lancamento.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {lancamento.tipo === 'entrada' ? (
                          <ArrowUpRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-600" />
                        )}
                        <span className="text-sm text-gray-600">
                          {lancamento.clientes?.nome || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {lancamento.financeiro_categorias?.nome || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(lancamento.data_competencia)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {lancamento.data_vencimento ? formatDate(lancamento.data_vencimento) : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(lancamento.status)}`}>
                        {lancamento.status === 'pago' ? 'Pago' : 
                         lancamento.status === 'em_atraso' ? 'Atrasado' : 
                         lancamento.status === 'cancelado' ? 'Cancelado' : 'Previsto'}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-right text-sm font-semibold ${
                      lancamento.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {lancamento.tipo === 'entrada' ? '+' : '-'}
                      {formatCurrency(Number(lancamento.valor))}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {lancamento.tipo === 'entrada' && lancamento.invoice_url && (
                          <button
                            onClick={() => handleCopyLink(lancamento.invoice_url!)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Copiar link de pagamento"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(lancamento)}
                          className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(lancamento.id)}
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
      )}

      <LancamentoModal
        isOpen={isEditModalOpen}
        onClose={handleEditClose}
        onSuccess={handleEditSuccess}
        lancamento={editingLancamento}
      />
    </div>
  )
}

