'use client'

import { useModal } from '@/contexts/ModalContext'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Database } from '@/types/database.types'
import { AlertCircle, CheckCircle2, Clock, Edit, Copy } from 'lucide-react'
import { EditarCobrancaModal } from './modals/EditarCobrancaModal'

type Lancamento = Database['public']['Tables']['financeiro_lancamentos']['Row'] & {
  servicos?: Database['public']['Tables']['servicos']['Row']
  invoice_url?: string | null
}

type StatusCobranca = 'previsto' | 'pago' | 'em_atraso'

interface CobrancasClienteProps {
  clienteId: string
}

export function CobrancasCliente({ clienteId }: CobrancasClienteProps) {
  const { alert } = useModal()
  const [cobrancas, setCobrancas] = useState<Lancamento[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCobranca, setEditingCobranca] = useState<Lancamento | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const loadCobrancas = useCallback(async () => {
    const supabase = createClient()
    
    const { data } = await supabase
      .from('financeiro_lancamentos')
      .select(`
        *,
        servicos (*)
      `)
      .eq('cliente_id', clienteId)
      .eq('tipo', 'entrada')
      .in('status', ['previsto', 'em_atraso', 'pago'])
      .order('data_vencimento', { ascending: true })
    
    // Garantir que invoice_url está incluído (pode não estar no tipo do banco ainda)
    if (data) {
      data.forEach((item: any) => {
        if (!item.invoice_url) {
          item.invoice_url = null
        }
      })
    }

    if (data) {
      // Verificar e atualizar status automático para "Atrasado"
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      
      // Atualizar cobranças atrasadas em lote
      const cobrancasParaAtualizar = data.filter((cobranca) => {
        if (cobranca.status === 'pago') {
          return false
        }
        const vencimento = cobranca.data_vencimento ? new Date(cobranca.data_vencimento) : null
        return vencimento && vencimento < hoje && cobranca.status !== 'em_atraso'
      })

      if (cobrancasParaAtualizar.length > 0) {
        const idsParaAtualizar = cobrancasParaAtualizar.map(c => c.id)
        await supabase
          .from('financeiro_lancamentos')
          .update({ status: 'em_atraso' })
          .in('id', idsParaAtualizar)
      }

      // Atualizar o estado local das cobranças
      const cobrancasAtualizadas = data.map((cobranca) => {
        if (cobranca.status === 'pago') {
          return cobranca
        }
        const vencimento = cobranca.data_vencimento ? new Date(cobranca.data_vencimento) : null
        if (vencimento && vencimento < hoje && cobranca.status !== 'em_atraso') {
          return { ...cobranca, status: 'em_atraso' as const }
        }
        return cobranca
      })
      
      setCobrancas(cobrancasAtualizadas as Lancamento[])
    }
    setLoading(false)
  }, [clienteId])

  useEffect(() => {
    loadCobrancas()
  }, [loadCobrancas])

  useEffect(() => {
    // Escutar eventos de mudança de status ou exclusão de serviço
    const handleStatusChange = () => {
      loadCobrancas()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('servicoStatusChanged', handleStatusChange)
      window.addEventListener('servicoDeleted', handleStatusChange)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('servicoStatusChanged', handleStatusChange)
        window.removeEventListener('servicoDeleted', handleStatusChange)
      }
    }
  }, [loadCobrancas])

  const getStatusInfo = (lancamento: Lancamento) => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const vencimento = lancamento.data_vencimento ? new Date(lancamento.data_vencimento) : null
    
    // Determinar status real (considerando atraso automático)
    let statusReal: StatusCobranca = lancamento.status as StatusCobranca
    if (vencimento && vencimento < hoje && lancamento.status !== 'pago') {
      statusReal = 'em_atraso'
    }
    
    if (statusReal === 'pago') {
      return {
        icon: CheckCircle2,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        text: 'Paga',
        subtitle: lancamento.data_pagamento 
          ? `Pago em ${formatDate(lancamento.data_pagamento)}` 
          : 'Pagamento confirmado',
        status: 'pago' as StatusCobranca,
      }
    }

    if (statusReal === 'em_atraso') {
      return {
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        text: 'Atrasado',
        subtitle: vencimento 
          ? `Vencida em ${formatDate(lancamento.data_vencimento!)}` 
          : 'Pagamento em atraso',
        status: 'em_atraso' as StatusCobranca,
      }
    }

    return {
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      text: 'Pendente',
      subtitle: vencimento 
        ? `Prevista para ${formatDate(lancamento.data_vencimento!)}` 
        : 'Aguardando pagamento',
      status: 'previsto' as StatusCobranca,
    }
  }

  const handleStatusChange = async (cobranca: Lancamento, newStatus: StatusCobranca) => {
    const supabase = createClient()
    
    // Verificar se está atrasado automaticamente
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const vencimento = cobranca.data_vencimento ? new Date(cobranca.data_vencimento) : null
    let statusFinal = newStatus

    // Se a data de vencimento for menor que hoje e o status não for 'pago', marcar como atrasado
    if (vencimento && vencimento < hoje && newStatus !== 'pago') {
      statusFinal = 'em_atraso'
    }

    // Se marcar como pago e não tiver data de pagamento, usar data atual
    let dataPagamento = cobranca.data_pagamento || null
    if (statusFinal === 'pago' && !dataPagamento) {
      dataPagamento = new Date().toISOString().split('T')[0]
    }

    // Se não estiver pago, remover data de pagamento
    if (statusFinal !== 'pago') {
      dataPagamento = null
    }

    const { error } = await supabase
      .from('financeiro_lancamentos')
      .update({
        status: statusFinal,
        data_pagamento: dataPagamento,
      })
      .eq('id', cobranca.id)

    if (!error) {
      loadCobrancas()
    } else {
      await alert('Erro ao atualizar status: ' + error.message, 'Erro')
    }
  }

  const handleEditClick = (cobranca: Lancamento) => {
    setEditingCobranca(cobranca)
    setIsEditModalOpen(true)
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

  const getStatusColor = (status: StatusCobranca) => {
    switch (status) {
      case 'previsto':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'pago':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'em_atraso':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <Card title="Cobranças Ativas">
        <div className="text-center py-8 text-gray-500">Carregando...</div>
      </Card>
    )
  }

  const cobrancasAtivas = cobrancas.filter(c => c.status !== 'cancelado')

  return (
    <div id="cobrancas">
      <Card title="Cobranças Ativas">
      {cobrancasAtivas.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Nenhuma cobrança encontrada
        </div>
      ) : (
        <div className="space-y-3">
          {cobrancasAtivas.map((cobranca) => {
            const statusInfo = getStatusInfo(cobranca)
            const Icon = statusInfo.icon

            return (
              <div
                key={cobranca.id}
                className={`p-4 border border-gray-200 rounded-lg ${statusInfo.bgColor}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className={`w-5 h-5 ${statusInfo.color} mt-0.5 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">
                        {cobranca.servicos?.nome || cobranca.descricao}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {statusInfo.subtitle}
                      </p>
                      {cobranca.servicos?.descricao && (
                        <p className="text-xs text-gray-500 mt-1">
                          {cobranca.servicos.descricao}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className={`font-semibold ${statusInfo.color}`}>
                        {formatCurrency(Number(cobranca.valor))}
                      </p>
                    </div>
                    <select
                      value={statusInfo.status}
                      onChange={(e) => handleStatusChange(cobranca, e.target.value as StatusCobranca)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 cursor-pointer ${getStatusColor(statusInfo.status)}`}
                      title="Status da cobrança"
                    >
                      <option value="previsto">Pendente</option>
                      <option value="pago">Pago</option>
                      <option value="em_atraso">Atrasado</option>
                    </select>
                    {cobranca.invoice_url && (
                      <button
                        onClick={() => handleCopyLink(cobranca.invoice_url!)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Copiar link de pagamento"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEditClick(cobranca)}
                      className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Editar cobrança"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <EditarCobrancaModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingCobranca(null)
        }}
        onSuccess={() => {
          loadCobrancas()
          setIsEditModalOpen(false)
          setEditingCobranca(null)
        }}
        cobranca={editingCobranca}
      />
      </Card>
    </div>
  )
}




