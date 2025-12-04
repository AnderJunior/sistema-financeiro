'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import { useModal } from '@/contexts/ModalContext'
import { Database } from '@/types/database.types'

type Lancamento = Database['public']['Tables']['financeiro_lancamentos']['Row']

interface LancamentoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  lancamento?: Lancamento | null
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

export function LancamentoModal({ isOpen, onClose, onSuccess, lancamento }: LancamentoModalProps) {
  const { alert } = useModal()
  const [loading, setLoading] = useState(false)
  const [categorias, setCategorias] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [contasFinanceiras, setContasFinanceiras] = useState<any[]>([])
  const isEditMode = !!lancamento
  const [activeTab, setActiveTab] = useState<'entrada' | 'saida' | 'transferencias'>('entrada')
  
  const [formData, setFormData] = useState({
    tipo: 'entrada' as 'entrada' | 'saida',
    categoria_id: '',
    cliente_id: '',
    descricao: '',
    data_competencia: new Date().toISOString().split('T')[0],
    data_vencimento: '',
    data_pagamento: '',
    valor: '',
    status: 'previsto' as 'previsto' | 'pago' | 'em_atraso' | 'cancelado',
    forma_pagamento: '' as 'pix' | 'boleto' | 'cartao' | 'transferencia' | 'dinheiro' | 'outro' | '',
    conta_id: '',
  })

  const [transferenciaData, setTransferenciaData] = useState({
    banco_origem_id: '',
    banco_recebedor_id: '',
    valor_enviado: '',
    data_transferencia: new Date().toISOString().split('T')[0],
    descricao: '',
  })

  useEffect(() => {
    if (isOpen) {
      async function loadData() {
        const supabase = createClient()
        // Obter usuário atual para buscar categorias coringas + categorias do usuário
        const { data: { user } } = await supabase.auth.getUser()
        
        const [catRes, cliRes, contasRes] = await Promise.all([
          supabase
            .from('financeiro_categorias')
            .select('*')
            .eq('ativo', true)
            .or(`is_coringa.eq.true${user?.id ? ',user_id.eq.' + user.id : ''}`)
            .order('is_coringa', { ascending: false })
            .order('nome', { ascending: true }),
          supabase.from('clientes').select('*').order('nome', { ascending: true }),
          supabase.from('contas_financeiras').select('*').eq('ativo', true),
        ])

        if (catRes.data) setCategorias(catRes.data)
        if (cliRes.data) setClientes(cliRes.data)
        if (contasRes.data) setContasFinanceiras(contasRes.data)
      }

      loadData()
    }
  }, [isOpen])

  // Preencher formulário quando estiver editando
  useEffect(() => {
    if (isOpen && lancamento) {
      // Formatar valor como moeda
      const valorFormatado = lancamento.valor 
        ? formatCurrencyInput((lancamento.valor * 100).toString())
        : ''

      // Formatar datas (remover hora se houver)
      const dataVencimento = lancamento.data_vencimento 
        ? lancamento.data_vencimento.split('T')[0] 
        : ''
      const dataPagamento = lancamento.data_pagamento 
        ? lancamento.data_pagamento.split('T')[0] 
        : ''

      setActiveTab(lancamento.tipo)
      setFormData({
        tipo: lancamento.tipo,
        categoria_id: lancamento.categoria_id || '',
        cliente_id: lancamento.cliente_id || '',
        descricao: lancamento.descricao || '',
        data_competencia: lancamento.data_competencia.split('T')[0] || new Date().toISOString().split('T')[0],
        data_vencimento: dataVencimento,
        data_pagamento: dataPagamento,
        valor: valorFormatado,
        status: lancamento.status,
        forma_pagamento: lancamento.forma_pagamento || '',
        conta_id: lancamento.conta_id || '',
      })
    } else if (isOpen && !lancamento) {
      // Reset form quando não estiver editando
      setActiveTab('entrada')
      setFormData({
        tipo: 'entrada',
        categoria_id: '',
        cliente_id: '',
        descricao: '',
        data_competencia: new Date().toISOString().split('T')[0],
        data_vencimento: '',
        data_pagamento: '',
        valor: '',
        status: 'previsto',
        forma_pagamento: '',
        conta_id: '',
      })
    }
  }, [isOpen, lancamento])

  // Atualizar tipo quando a aba mudar (apenas para entrada/saída)
  useEffect(() => {
    if (activeTab === 'entrada' || activeTab === 'saida') {
      setFormData(prev => ({ ...prev, tipo: activeTab, categoria_id: '' }))
    }
  }, [activeTab])

  const categoriasFiltradas = categorias.filter(c => c.tipo === activeTab)

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value)
    setFormData({ ...formData, valor: formatted })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Se for aba de transferências
    if (activeTab === 'transferencias') {
      const valorNumerico = parseCurrencyValue(transferenciaData.valor_enviado)
      if (valorNumerico <= 0) {
        await alert('O valor deve ser maior que zero', 'Valor inválido')
        setLoading(false)
        return
      }

      if (!transferenciaData.banco_origem_id || !transferenciaData.banco_recebedor_id) {
        await alert('Selecione o banco de origem e o banco recebedor', 'Campos obrigatórios')
        setLoading(false)
        return
      }

      if (transferenciaData.banco_origem_id === transferenciaData.banco_recebedor_id) {
        await alert('O banco de origem e o banco recebedor devem ser diferentes', 'Validação')
        setLoading(false)
        return
      }

      const supabase = createClient()
      const { error } = await supabase
        .from('transferencias_bancarias')
        .insert([{
          banco_origem_id: transferenciaData.banco_origem_id,
          banco_recebedor_id: transferenciaData.banco_recebedor_id,
          valor_enviado: valorNumerico,
          data_transferencia: transferenciaData.data_transferencia,
          descricao: transferenciaData.descricao || null,
        }])

      if (!error) {
        // Reset form
        setTransferenciaData({
          banco_origem_id: '',
          banco_recebedor_id: '',
          valor_enviado: '',
          data_transferencia: new Date().toISOString().split('T')[0],
          descricao: '',
        })
        onSuccess?.()
        onClose()
      } else {
        await alert('Erro ao criar transferência: ' + error.message, 'Erro')
      }
      setLoading(false)
      return
    }

    // Lógica original para entrada/saída
    const valorNumerico = parseCurrencyValue(formData.valor)
    if (valorNumerico <= 0) {
      await alert('O valor deve ser maior que zero', 'Valor inválido')
      setLoading(false)
      return
    }

    // Validação: se o status for pago, conta_id e data_pagamento são obrigatórios
    if (formData.status === 'pago') {
      if (!formData.conta_id) {
        await alert('Ao marcar o lançamento como pago, é obrigatório informar em qual banco o valor caiu.', 'Validação')
        setLoading(false)
        return
      }
      if (!formData.data_pagamento) {
        await alert('Ao marcar o lançamento como pago, é obrigatório informar a data de pagamento.', 'Validação')
        setLoading(false)
        return
      }
    }

    // Formatar data de vencimento (remover hora se houver, pois o campo é DATE)
    let dataVencimentoFormatada = formData.data_vencimento || null
    if (dataVencimentoFormatada && dataVencimentoFormatada.includes('T')) {
      dataVencimentoFormatada = dataVencimentoFormatada.split('T')[0]
    }

    const supabase = createClient()
    
    // Se não estiver pago, remover conta_id e data_pagamento
    let contaIdFinal = formData.conta_id || null
    let dataPagamentoFinal = formData.data_pagamento || null
    if (formData.status !== 'pago') {
      contaIdFinal = null
      dataPagamentoFinal = null
    }

    const updateData = {
      tipo: activeTab,
      categoria_id: formData.categoria_id || null,
      cliente_id: formData.cliente_id || null,
      descricao: formData.descricao,
      data_competencia: formData.data_competencia,
      data_vencimento: dataVencimentoFormatada,
      data_pagamento: dataPagamentoFinal,
      valor: valorNumerico,
      status: formData.status,
      forma_pagamento: formData.forma_pagamento || null,
      conta_id: contaIdFinal,
    }

    let error
    if (isEditMode && lancamento) {
      // Atualizar lançamento existente
      const { error: updateError } = await supabase
        .from('financeiro_lancamentos')
        .update(updateData)
        .eq('id', lancamento.id)
      error = updateError
    } else {
      // Criar novo lançamento
      const { error: insertError } = await supabase
        .from('financeiro_lancamentos')
        .insert([updateData])
      error = insertError
    }

    if (!error) {
      // Reset form
      setFormData({
        tipo: activeTab,
        categoria_id: '',
        cliente_id: '',
        descricao: '',
        data_competencia: new Date().toISOString().split('T')[0],
        data_vencimento: '',
        data_pagamento: '',
        valor: '',
        status: 'previsto',
        forma_pagamento: '',
        conta_id: '',
      })
      onSuccess?.()
      onClose()
    } else {
      await alert(`Erro ao ${isEditMode ? 'atualizar' : 'criar'} lançamento: ` + error.message, 'Erro')
    }
    setLoading(false)
  }

  const handleClose = () => {
    if (!loading) {
      // Reset form apenas se não estiver em modo de edição
      if (!isEditMode) {
        setFormData({
          tipo: activeTab === 'transferencias' ? 'entrada' : activeTab,
          categoria_id: '',
          cliente_id: '',
          descricao: '',
          data_competencia: new Date().toISOString().split('T')[0],
          data_vencimento: '',
          data_pagamento: '',
          valor: '',
          status: 'previsto',
          forma_pagamento: '',
          conta_id: '',
        })
        setTransferenciaData({
          banco_origem_id: '',
          banco_recebedor_id: '',
          valor_enviado: '',
          data_transferencia: new Date().toISOString().split('T')[0],
          descricao: '',
        })
        setActiveTab('entrada')
      }
      onClose()
    }
  }

  const handleValorTransferenciaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value)
    setTransferenciaData({ ...transferenciaData, valor_enviado: formatted })
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEditMode ? "Editar lançamento" : "Adicionar lançamento"}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('entrada')}
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${
              activeTab === 'entrada'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Entrada
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('saida')}
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${
              activeTab === 'saida'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Saída
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('transferencias')}
            className={`px-6 py-3 font-medium text-sm transition-colors relative ${
              activeTab === 'transferencias'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Transferências
          </button>
        </div>

        {/* Form Fields */}
        {activeTab === 'transferencias' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banco Origem *
              </label>
              <select
                required
                value={transferenciaData.banco_origem_id}
                onChange={(e) => setTransferenciaData({ ...transferenciaData, banco_origem_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Selecione o banco de origem</option>
                {contasFinanceiras.map((conta) => (
                  <option key={conta.id} value={conta.id}>{conta.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banco Recebedor *
              </label>
              <select
                required
                value={transferenciaData.banco_recebedor_id}
                onChange={(e) => setTransferenciaData({ ...transferenciaData, banco_recebedor_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Selecione o banco recebedor</option>
                {contasFinanceiras.map((conta) => (
                  <option key={conta.id} value={conta.id}>{conta.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor Enviado *
              </label>
              <input
                type="text"
                required
                value={transferenciaData.valor_enviado}
                onChange={handleValorTransferenciaChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="R$ 0,00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data da Transferência *
              </label>
              <input
                type="date"
                required
                value={transferenciaData.data_transferencia}
                onChange={(e) => setTransferenciaData({ ...transferenciaData, data_transferencia: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição (Opcional)
              </label>
              <textarea
                value={transferenciaData.descricao}
                onChange={(e) => setTransferenciaData({ ...transferenciaData, descricao: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Digite uma descrição (opcional)"
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoria (Opcional)
            </label>
            <select
              value={formData.categoria_id}
              onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Selecione uma categoria</option>
              {categoriasFiltradas.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cliente (Opcional)
            </label>
            <select
              value={formData.cliente_id}
              onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Selecione um cliente</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição *
            </label>
            <input
              type="text"
              required
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Digite a descrição"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data de Competência *
            </label>
            <input
              type="date"
              required
              value={formData.data_competencia}
              onChange={(e) => setFormData({ ...formData, data_competencia: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data de Vencimento (Opcional)
            </label>
            <input
              type="date"
              value={formData.data_vencimento}
              onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
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
              onChange={handleValorChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="R$ 0,00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status *
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) => {
                const newStatus = e.target.value as any
                setFormData({ 
                  ...formData, 
                  status: newStatus,
                  // Se mudar para pago e não tiver data de pagamento, usar data atual
                  data_pagamento: newStatus === 'pago' 
                    ? (formData.data_pagamento || new Date().toISOString().split('T')[0])
                    : '',
                  // Se mudar para não pago, limpar conta_id
                  conta_id: newStatus === 'pago' ? formData.conta_id : '',
                })
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="previsto">Previsto</option>
              <option value="pago">Pago</option>
              <option value="em_atraso">Em Atraso</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          {formData.status === 'pago' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Pagamento *
                </label>
                <input
                  type="date"
                  required
                  value={formData.data_pagamento}
                  onChange={(e) => setFormData({ ...formData, data_pagamento: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banco recebedor *
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
                  Selecione em qual banco o valor foi recebido/pago
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Forma de Pagamento (Opcional)
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
        </div>
        )}

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
            {loading 
              ? (activeTab === 'transferencias' ? 'Adicionando transferência...' : (isEditMode ? 'Salvando...' : 'Adicionando...')) 
              : (activeTab === 'transferencias' ? 'Adicionar transferência' : (isEditMode ? 'Salvar alterações' : 'Adicionar lançamento'))
            }
          </button>
        </div>
      </form>
    </Modal>
  )
}

