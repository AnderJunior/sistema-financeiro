'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import { useModal } from '@/contexts/ModalContext'
import { Database } from '@/types/database.types'
import { BANCOS_BRASILEIROS, getBancoByCodigo, getBancoByNome } from '@/lib/bancos-brasileiros'
import { Building2, Trash2 } from 'lucide-react'

type ContaFinanceira = Database['public']['Tables']['contas_financeiras']['Row']

interface ContaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  conta?: ContaFinanceira | null
}

export function ContaModal({ isOpen, onClose, onSuccess, conta }: ContaModalProps) {
  const isEditMode = !!conta
  const { alert, confirm } = useModal()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    agencia: '',
    conta: '',
    banco_id: '',
    cor: '#3B82F6', // Cor padrão (azul)
  })

  // Atualizar formData quando conta mudar ou quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      if (conta) {
        // Tentar detectar banco pelo nome se não tiver banco_id
        let bancoId = conta.banco_id || ''
        if (!bancoId && conta.nome) {
          const bancoDetectado = getBancoByNome(conta.nome)
          if (bancoDetectado) {
            bancoId = bancoDetectado.codigo
          }
        }

        setFormData({
          nome: conta.nome || '',
          agencia: conta.agencia || '',
          conta: conta.conta || '',
          banco_id: bancoId,
          cor: conta.cor || (bancoId ? getBancoByCodigo(bancoId)?.cor || '#3B82F6' : '#3B82F6'),
        })
      } else {
        setFormData({
          nome: '',
          agencia: '',
          conta: '',
          banco_id: '',
          cor: '#3B82F6',
        })
      }
    }
  }, [conta, isOpen])

  // Atualizar cor quando banco for selecionado
  useEffect(() => {
    if (formData.banco_id) {
      const banco = getBancoByCodigo(formData.banco_id)
      if (banco) {
        setFormData(prev => ({ ...prev, cor: banco.cor }))
      }
    }
  }, [formData.banco_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome.trim()) {
      await alert('Por favor, preencha o nome da conta.', 'Validação')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const dataToSave = {
      nome: formData.nome.trim(),
      tipo: 'bancaria' as const,
      agencia: formData.agencia.trim() || null,
      conta: formData.conta.trim() || null,
      banco_id: formData.banco_id || null,
      cor: formData.cor || null,
    }
    
    let error
    if (isEditMode && conta) {
      // Atualizar conta existente
      const { error: updateError } = await supabase
        .from('contas_financeiras')
        .update(dataToSave)
        .eq('id', conta.id)
      error = updateError
    } else {
      // Criar nova conta
      const { error: insertError } = await supabase
        .from('contas_financeiras')
        .insert([dataToSave])
      error = insertError
    }

    if (!error) {
      // Reset form
      setFormData({
        nome: '',
        agencia: '',
        conta: '',
        banco_id: '',
        cor: '#3B82F6',
      })
      onSuccess?.()
      onClose()
    } else {
      await alert(`Erro ao ${isEditMode ? 'atualizar' : 'criar'} conta: ` + (error?.message || 'Erro desconhecido'), 'Erro')
    }
    setLoading(false)
  }

  const handleClose = () => {
    if (!loading) {
      if (conta) {
        let bancoId = conta.banco_id || ''
        if (!bancoId && conta.nome) {
          const bancoDetectado = getBancoByNome(conta.nome)
          if (bancoDetectado) {
            bancoId = bancoDetectado.codigo
          }
        }
        setFormData({
          nome: conta.nome || '',
          agencia: conta.agencia || '',
          conta: conta.conta || '',
          banco_id: bancoId,
          cor: conta.cor || '#3B82F6',
        })
      } else {
        setFormData({
          nome: '',
          agencia: '',
          conta: '',
          banco_id: '',
          cor: '#3B82F6',
        })
      }
      onClose()
    }
  }

  const handleDelete = async () => {
    if (!conta) return

    const confirmed = await confirm(
      `Tem certeza que deseja excluir a conta "${conta.nome}"? Esta ação não pode ser desfeita.`,
      'Confirmar exclusão',
      'Excluir',
      'Cancelar',
      'danger'
    )

    if (!confirmed) return

    setDeleting(true)

    const supabase = createClient()
    const { error } = await supabase
      .from('contas_financeiras')
      .update({ ativo: false })
      .eq('id', conta.id)

    if (!error) {
      onSuccess?.()
      onClose()
    } else {
      await alert('Erro ao excluir conta: ' + (error?.message || 'Erro desconhecido'), 'Erro')
    }

    setDeleting(false)
  }

  const bancoSelecionado = getBancoByCodigo(formData.banco_id)

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? 'Editar Conta' : 'Nova Conta'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nome da Conta */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome da Conta <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.nome}
            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Ex: Conta Corrente Banco do Brasil"
            required
            disabled={loading}
          />
        </div>

        {/* Banco */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Banco
          </label>
          <select
            value={formData.banco_id}
            onChange={(e) => setFormData({ ...formData, banco_id: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={loading}
          >
            <option value="">Selecione um banco</option>
            {BANCOS_BRASILEIROS.map((banco) => (
              <option key={banco.codigo} value={banco.codigo}>
                {banco.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Cor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cor do Card
          </label>
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={formData.cor}
              onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
              className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer p-1" style={{ paddingLeft: '10px', paddingRight: '10px' }}
              disabled={loading}
            />
            <input
              type="text"
              value={formData.cor}
              onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="#3B82F6"
              disabled={loading}
            />
          </div>
          {bancoSelecionado && (
            <p className="text-xs text-gray-500 mt-1">
              Cor padrão do {bancoSelecionado.nome}: {bancoSelecionado.cor}
            </p>
          )}
        </div>

        {/* Agência */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Agência
          </label>
          <input
            type="number"
            value={formData.agencia}
            onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Ex: 1234"
            disabled={loading}
          />
        </div>

        {/* Conta */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Conta
          </label>
          <input
            type="text"
            value={formData.conta}
            onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Ex: 12345-6"
            disabled={loading}
          />
        </div>

        {/* Botões */}
        <div className={`flex ${isEditMode ? 'justify-between' : 'justify-end'} items-center pt-4 border-t border-gray-200`}>
          {isEditMode && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading || deleting}
              className="flex items-center gap-2 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Excluindo...' : 'Excluir Conta'}
            </button>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading || deleting}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || deleting}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : isEditMode ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
