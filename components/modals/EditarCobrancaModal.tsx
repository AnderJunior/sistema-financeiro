'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import { useModal } from '@/contexts/ModalContext'

type Lancamento = Database['public']['Tables']['financeiro_lancamentos']['Row'] & {
  servicos?: Database['public']['Tables']['servicos']['Row']
}

interface EditarCobrancaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  cobranca: Lancamento | null
}

// Helper para formatar valor em R$
function formatCurrencyInput(value: string): string {
  // Remove tudo que não é dígito
  const numbers = value.replace(/\D/g, '')
  
  if (!numbers) return ''
  
  // Converte para número e divide por 100 para ter centavos
  const amount = parseFloat(numbers) / 100
  
  // Formata como moeda brasileira
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Helper para extrair o valor numérico do formato de moeda
function parseCurrencyValue(formattedValue: string): number {
  const numbers = formattedValue.replace(/\D/g, '')
  if (!numbers) return 0
  return parseFloat(numbers) / 100
}

type ContaFinanceira = Database['public']['Tables']['contas_financeiras']['Row']

export function EditarCobrancaModal({ isOpen, onClose, onSuccess, cobranca }: EditarCobrancaModalProps) {
  const { alert } = useModal()
  const [loading, setLoading] = useState(false)
  const [servico, setServico] = useState<Database['public']['Tables']['servicos']['Row'] | null>(null)
  const [contasFinanceiras, setContasFinanceiras] = useState<ContaFinanceira[]>([])
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    data_vencimento: '',
    data_proxima_assinatura: '',
    data_pagamento: '',
    status: 'previsto' as 'previsto' | 'pago' | 'em_atraso',
    forma_pagamento: '' as 'pix' | 'boleto' | 'cartao' | 'transferencia' | 'dinheiro' | 'outro' | '',
    observacoes: '',
    unidade_cobranca: 'mensal' as 'mensal' | 'semestral' | 'anual' | 'projeto',
    conta_id: '',
  })

  const isAssinatura = servico?.tipo === 'assinatura'

  // Carregar contas financeiras quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      async function loadContasFinanceiras() {
        const supabase = createClient()
        const { data } = await supabase
          .from('contas_financeiras')
          .select('*')
          .eq('ativo', true)
          .order('nome', { ascending: true })
        
        if (data) {
          setContasFinanceiras(data)
        }
      }
      loadContasFinanceiras()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && cobranca) {
      const supabase = createClient()
      
      // Buscar serviço relacionado se houver servico_id
      if (cobranca.servico_id) {
        supabase
          .from('servicos')
          .select('*')
          .eq('id', cobranca.servico_id)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              setServico(data)
            }
          })
      } else if (cobranca.servicos) {
        // Se o serviço já vier no objeto cobranca
        setServico(cobranca.servicos)
      } else {
        setServico(null)
      }

      // Verificar se está atrasado automaticamente
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      const vencimento = cobranca.data_vencimento ? new Date(cobranca.data_vencimento) : null
      let status = cobranca.status

      // Se a data de vencimento for menor que hoje e o status não for 'pago', marcar como atrasado
      if (vencimento && vencimento < hoje && status !== 'pago') {
        status = 'em_atraso'
      }

      // Se for assinatura, usar data_vencimento como data_proxima_assinatura
      const isAssinaturaServico = cobranca.servicos?.tipo === 'assinatura'
      const dataProximaAssinatura = isAssinaturaServico && cobranca.data_vencimento
        ? cobranca.data_vencimento.split('T')[0]
        : ''

      // Formatar valor como moeda
      const valorFormatado = cobranca.valor 
        ? formatCurrencyInput((cobranca.valor * 100).toString())
        : ''

      setFormData({
        descricao: cobranca.descricao || '',
        valor: valorFormatado,
        data_vencimento: cobranca.data_vencimento ? cobranca.data_vencimento.split('T')[0] : '',
        data_proxima_assinatura: dataProximaAssinatura,
        data_pagamento: cobranca.data_pagamento ? cobranca.data_pagamento.split('T')[0] : '',
        status: status as 'previsto' | 'pago' | 'em_atraso',
        forma_pagamento: cobranca.forma_pagamento || '',
        observacoes: '',
        unidade_cobranca: (cobranca.servicos?.unidade_cobranca || 'mensal') as 'mensal' | 'semestral' | 'anual' | 'projeto',
        conta_id: cobranca.conta_id || '',
      })
    }
  }, [isOpen, cobranca])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (!cobranca) {
      setLoading(false)
      return
    }

    // Validação: se for assinatura, data_proxima_assinatura é obrigatória
    if (isAssinatura && !formData.data_proxima_assinatura) {
      await alert('Para serviços de assinatura, é obrigatório informar a Data da Próxima Assinatura.', 'Validação')
      setLoading(false)
      return
    }

    // Validação: se o status for pago, conta_id é obrigatória
    if (formData.status === 'pago' && !formData.conta_id) {
      await alert('Ao marcar a cobrança como paga, é obrigatório informar em qual banco o valor caiu.', 'Validação')
      setLoading(false)
      return
    }

    const supabase = createClient()
    
    // Verificar se está atrasado automaticamente
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const vencimento = formData.data_vencimento ? new Date(formData.data_vencimento) : null
    let statusFinal = formData.status

    // Se a data de vencimento for menor que hoje e o status não for 'pago', marcar como atrasado
    if (vencimento && vencimento < hoje && formData.status !== 'pago') {
      statusFinal = 'em_atraso'
    }

    // Se marcar como pago e não tiver data de pagamento, usar data atual
    let dataPagamento = formData.data_pagamento || null
    if (statusFinal === 'pago' && !dataPagamento) {
      dataPagamento = new Date().toISOString().split('T')[0]
    }

    // Se não estiver pago, remover data de pagamento e conta_id
    let contaIdFinal = formData.conta_id || null
    if (statusFinal !== 'pago') {
      dataPagamento = null
      contaIdFinal = null
    }

    // Para assinaturas, usar data_proxima_assinatura como data_vencimento
    let dataVencimentoFinal = isAssinatura && formData.data_proxima_assinatura
      ? formData.data_proxima_assinatura
      : formData.data_vencimento
    
    // Garantir que se a data não tiver hora, seja 09:00
    if (dataVencimentoFinal) {
      // Se for apenas data (YYYY-MM-DD), adicionar hora 09:00
      if (dataVencimentoFinal.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dataVencimentoFinal = `${dataVencimentoFinal}T09:00:00`
      }
    }

    // Converter valor formatado para número
    const valorNumerico = parseCurrencyValue(formData.valor)

    const { error } = await supabase
      .from('financeiro_lancamentos')
      .update({
        descricao: formData.descricao,
        valor: valorNumerico,
        data_vencimento: dataVencimentoFinal || null,
        data_pagamento: dataPagamento,
        status: statusFinal,
        forma_pagamento: formData.forma_pagamento || null,
        conta_id: contaIdFinal,
      })
      .eq('id', cobranca.id)

    if (error) {
      await alert('Erro ao atualizar cobrança: ' + error.message, 'Erro')
      setLoading(false)
      return
    }

    onSuccess?.()
    onClose()
    setLoading(false)
  }

  const handleStatusChange = (newStatus: 'previsto' | 'pago' | 'em_atraso') => {
    setFormData({
      ...formData,
      status: newStatus,
      // Se marcar como pago e não tiver data de pagamento, usar data atual
      data_pagamento: newStatus === 'pago' && !formData.data_pagamento 
        ? new Date().toISOString().split('T')[0] 
        : formData.data_pagamento,
      // Se mudar para não pago, limpar conta_id
      conta_id: newStatus === 'pago' ? formData.conta_id : '',
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Cobrança">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição *
          </label>
          <input
            type="text"
            required
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor *
          </label>
          <input
            type="text"
            required
            value={formData.valor}
            onChange={(e) => {
              const formatted = formatCurrencyInput(e.target.value)
              setFormData({ ...formData, valor: formatted })
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="R$ 0,00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data de Vencimento {isAssinatura ? '(Relacionado ao serviço)' : '*'}
          </label>
          <input
            type="date"
            required={!isAssinatura}
            value={formData.data_vencimento}
            onChange={(e) => {
              const newDate = e.target.value
              setFormData({ ...formData, data_vencimento: newDate })
              
              // Verificar se está atrasado automaticamente
              const hoje = new Date()
              hoje.setHours(0, 0, 0, 0)
              const vencimento = newDate ? new Date(newDate) : null
              
              if (vencimento && vencimento < hoje && formData.status !== 'pago') {
                setFormData(prev => ({ ...prev, data_vencimento: newDate, status: 'em_atraso' }))
              }
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {isAssinatura && (
            <p className="text-xs text-gray-500 mt-1">
              Data final que o serviço precisa ser entregue
            </p>
          )}
        </div>

        {isAssinatura && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data da Próxima Assinatura *
              </label>
              <input
                type="date"
                required
                value={formData.data_proxima_assinatura}
                onChange={(e) => setFormData({ ...formData, data_proxima_assinatura: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Data de vencimento da próxima fatura
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unidade de Cobrança *
              </label>
              <select
                required
                value={formData.unidade_cobranca}
                onChange={(e) => setFormData({ ...formData, unidade_cobranca: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="mensal">Mensal</option>
                <option value="semestral">Semestral</option>
                <option value="anual">Anual</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Frequência de cobrança da assinatura
              </p>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status *
          </label>
          <select
            required
            value={formData.status}
            onChange={(e) => handleStatusChange(e.target.value as 'previsto' | 'pago' | 'em_atraso')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="previsto">Pendente</option>
            <option value="pago">Pago</option>
            <option value="em_atraso">Atrasado</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            O status será automaticamente alterado para &quot;Atrasado&quot; se a data de vencimento for menor que a data atual.
          </p>
        </div>

        {formData.status === 'pago' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Pagamento
              </label>
              <input
                type="date"
                value={formData.data_pagamento}
                onChange={(e) => setFormData({ ...formData, data_pagamento: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banco onde o valor caiu *
              </label>
              <select
                required
                value={formData.conta_id}
                onChange={(e) => setFormData({ ...formData, conta_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Selecione o banco</option>
                {contasFinanceiras.map((conta) => (
                  <option key={conta.id} value={conta.id}>
                    {conta.nome}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Selecione em qual banco o valor foi recebido
              </p>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Forma de Pagamento
          </label>
          <select
            value={formData.forma_pagamento}
            onChange={(e) => setFormData({ ...formData, forma_pagamento: e.target.value as any })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Selecione</option>
            <option value="pix">PIX</option>
            <option value="boleto">Boleto</option>
            <option value="cartao">Cartão</option>
            <option value="transferencia">Transferência</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="outro">Outro</option>
          </select>
        </div>

        <div className="flex gap-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
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
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </Modal>
  )
}


