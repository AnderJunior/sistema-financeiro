'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import { useModal } from '@/contexts/ModalContext'

type Servico = Database['public']['Tables']['servicos']['Row']

interface ServicoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  servico?: Servico | null
}

export function ServicoModal({ isOpen, onClose, onSuccess, servico }: ServicoModalProps) {
  const isEditMode = !!servico
  const { alert } = useModal()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo: 'recorrente' as 'recorrente' | 'assinatura' | 'avulso' | 'projeto',
    valor_base: '',
    unidade_cobranca: 'mensal' as 'mensal' | 'semestral' | 'anual' | 'projeto',
    data_vencimento_faturas: '',
    ativo: true,
    observacoes: '',
  })

  // Atualizar formData quando servico mudar ou quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      if (servico) {
        setFormData({
          nome: servico.nome || '',
          descricao: servico.descricao || '',
          tipo: servico.tipo || 'recorrente',
          valor_base: servico.valor_base?.toString() || '',
          unidade_cobranca: servico.unidade_cobranca || 'mensal',
          data_vencimento_faturas: servico.data_vencimento_faturas ? servico.data_vencimento_faturas.split('T')[0] : '',
          ativo: servico.ativo ?? true,
          observacoes: servico.observacoes || '',
        })
      } else {
        setFormData({
          nome: '',
          descricao: '',
          tipo: 'recorrente',
          valor_base: '',
          unidade_cobranca: 'mensal',
          data_vencimento_faturas: '',
          ativo: true,
          observacoes: '',
        })
      }
    }
  }, [servico, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validação: se tipo for assinatura, data_vencimento_faturas é obrigatória
    if (formData.tipo === 'assinatura' && !formData.data_vencimento_faturas) {
      await alert('Para serviços do tipo Assinatura, é obrigatório informar a Data de Vencimento das Faturas.', 'Validação')
      return
    }
    
    setLoading(true)

    const supabase = createClient()
    const dataToSave = {
      nome: formData.nome,
      descricao: formData.descricao || null,
      tipo: formData.tipo,
      valor_base: parseFloat(formData.valor_base) || 0,
      unidade_cobranca: formData.unidade_cobranca,
      data_vencimento_faturas: formData.data_vencimento_faturas || null,
      ativo: formData.ativo,
      observacoes: formData.observacoes || null,
    }

    let error
    if (isEditMode && servico) {
      // Atualizar serviço existente
      const { error: updateError } = await supabase
        .from('servicos')
        .update(dataToSave)
        .eq('id', servico.id)
      error = updateError
    } else {
      // Criar novo serviço
      const { error: insertError } = await supabase.from('servicos').insert([dataToSave])
      error = insertError
    }

    if (!error) {
      // Reset form
      setFormData({
        nome: '',
        descricao: '',
        tipo: 'recorrente',
        valor_base: '',
        unidade_cobranca: 'mensal',
        data_vencimento_faturas: '',
        ativo: true,
        observacoes: '',
      })
      onSuccess?.()
      onClose()
    } else {
      await alert(`Erro ao ${isEditMode ? 'atualizar' : 'criar'} serviço: ` + error.message, 'Erro')
    }
    setLoading(false)
  }

  const handleClose = () => {
    if (!loading) {
      if (servico) {
        setFormData({
          nome: servico.nome || '',
          descricao: servico.descricao || '',
          tipo: servico.tipo || 'recorrente',
          valor_base: servico.valor_base?.toString() || '',
          unidade_cobranca: servico.unidade_cobranca || 'mensal',
          data_vencimento_faturas: servico.data_vencimento_faturas ? servico.data_vencimento_faturas.split('T')[0] : '',
          ativo: servico.ativo ?? true,
          observacoes: servico.observacoes || '',
        })
      } else {
        setFormData({
          nome: '',
          descricao: '',
          tipo: 'recorrente',
          valor_base: '',
          unidade_cobranca: 'mensal',
          data_vencimento_faturas: '',
          ativo: true,
          observacoes: '',
        })
      }
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEditMode ? "Editar serviço" : "Adicionar serviço"}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome *
            </label>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Digite o nome"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição (Opcional)
            </label>
            <input
              type="text"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Digite a descrição"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo *
              </label>
              <select
                required
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="recorrente">Recorrente</option>
                <option value="assinatura">Assinatura</option>
                <option value="avulso">Avulso</option>
                <option value="projeto">Projeto</option>
              </select>
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
                <option value="projeto">Projeto</option>
                <option value="mensal">Mensal</option>
                <option value="semestral">Semestral</option>
                <option value="anual">Anual</option>
              </select>
            </div>

            {formData.tipo === 'assinatura' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Vendi. Faturas *
                </label>
                <input
                  type="date"
                  required={formData.tipo === 'assinatura'}
                  value={formData.data_vencimento_faturas}
                  onChange={(e) => setFormData({ ...formData, data_vencimento_faturas: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Data que o cliente deseja para vencer as próximas faturas
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor Base *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.valor_base}
                onChange={(e) => setFormData({ ...formData, valor_base: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                required
                value={formData.ativo ? 'ativo' : 'inativo'}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.value === 'ativo' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações (Opcional)
              </label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Digite observações"
              />
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
            {loading ? (isEditMode ? 'Salvando...' : 'Adicionando...') : (isEditMode ? 'Salvar alterações' : 'Adicionar serviço')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

