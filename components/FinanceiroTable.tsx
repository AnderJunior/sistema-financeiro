'use client'

import { formatCurrency, formatDate } from '@/lib/utils'
import { Database } from '@/types/database.types'
import { Edit, Trash2, ArrowUpRight, ArrowDownRight, Copy, ArrowRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useModal } from '@/contexts/ModalContext'

type Lancamento = Database['public']['Tables']['financeiro_lancamentos']['Row'] & {
  invoice_url?: string | null
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

export function FinanceiroTable({ lancamentos: initialLancamentos, transferencias = [] }: FinanceiroTableProps) {
  const { alert, confirm } = useModal()
  const [lancamentos, setLancamentos] = useState(initialLancamentos)
  const [filter, setFilter] = useState<'all' | 'entrada' | 'saida' | 'transferencia'>('all')

  // Sincronizar com mudanças do parent component
  useEffect(() => {
    setLancamentos(initialLancamentos)
  }, [initialLancamentos])

  const filteredLancamentos = filter === 'all'
    ? lancamentos
    : lancamentos.filter(l => l.tipo === filter)

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
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Conta de Origem</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600"></th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Conta de Destino</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Data</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Descrição</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Valor</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {transferencias.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    Nenhuma transferência encontrada
                  </td>
                </tr>
              ) : (
                transferencias.map((transferencia) => (
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
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Tipo</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Descrição</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Data</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Vencimento</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Valor</th>
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
                      {lancamento.tipo === 'entrada' ? (
                        <div className="flex items-center gap-2">
                          <ArrowUpRight className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-gray-700">Entrada</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <ArrowDownRight className="w-4 h-4 text-red-600" />
                          <span className="text-sm text-gray-700">Saída</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">{lancamento.descricao}</td>
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
                        <Link
                          href={`/empresa/${lancamento.id}/editar`}
                          className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
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
    </div>
  )
}

