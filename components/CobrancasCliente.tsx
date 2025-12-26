'use client'

import { useModal } from '@/contexts/ModalContext'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Database } from '@/types/database.types'
import { AlertCircle, CheckCircle2, Clock, Copy } from 'lucide-react'

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

  const loadCobrancas = useCallback(async () => {
    const supabase = createClient()
    
    // OTIMIZADO: Buscar apenas campos necessários e usar select específico
    const { data } = await supabase
      .from('financeiro_lancamentos')
      .select(`
        id,
        valor,
        status,
        data_vencimento,
        data_pagamento,
        descricao,
        invoice_url,
        servicos (
          id,
          nome,
          descricao
        )
      `)
      .eq('cliente_id', clienteId)
      .eq('tipo', 'entrada')
      .in('status', ['previsto', 'em_atraso', 'pago'])
      .order('data_vencimento', { ascending: true })
    
    if (data) {
      // Verificar e atualizar status automático para "Atrasado"
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      
      // OTIMIZADO: Filtrar e atualizar em uma única passada
      const cobrancasParaAtualizar: string[] = []
      const cobrancasAtualizadas = data.map((cobranca: any) => {
        // Garantir que invoice_url está incluído
        if (!cobranca.invoice_url) {
          cobranca.invoice_url = null
        }
        
        if (cobranca.status === 'pago') {
          return cobranca
        }
        
        const vencimento = cobranca.data_vencimento ? new Date(cobranca.data_vencimento) : null
        if (vencimento && vencimento < hoje && cobranca.status !== 'em_atraso') {
          cobrancasParaAtualizar.push(cobranca.id)
          return { ...cobranca, status: 'em_atraso' as const }
        }
        return cobranca
      })

      // OTIMIZADO: Atualizar apenas se houver cobranças para atualizar
      if (cobrancasParaAtualizar.length > 0) {
        // Não aguardar a atualização para não bloquear a UI
        supabase
          .from('financeiro_lancamentos')
          .update({ status: 'em_atraso' })
          .in('id', cobrancasParaAtualizar)
          .then(() => {
            // Atualização em background, não precisa recarregar
          })
      }
      
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
                      <p className="font-medium text-gray-900" style={{ fontSize: '14px' }}>
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
                    {cobranca.invoice_url && (
                      <button
                        onClick={() => handleCopyLink(cobranca.invoice_url!)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Copiar link de pagamento"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </Card>
    </div>
  )
}




