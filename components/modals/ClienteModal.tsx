'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Combobox } from '@/components/ui/Combobox'
import { createClient } from '@/lib/supabase/client'
import { maskCPFCNPJ } from '@/lib/utils'
import { useModal } from '@/contexts/ModalContext'

interface ClienteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  cliente?: {
    id: string
    nome: string
    tipo_pessoa: 'PF' | 'PJ'
    cpf_cnpj: string | null
    email: string | null
    telefone: string | null
    status: 'a_iniciar' | 'em_andamento' | 'finalizado'
    origem: string | null
    observacoes: string | null
  } | null
}

export function ClienteModal({ isOpen, onClose, onSuccess, cliente }: ClienteModalProps) {
  const isEditMode = !!cliente
  const { alert } = useModal()
  const [loading, setLoading] = useState(false)
  const [origensDisponiveis, setOrigensDisponiveis] = useState<string[]>([])
  const [formData, setFormData] = useState({
    nome: '',
    tipo_pessoa: 'PF' as 'PF' | 'PJ',
    cpf_cnpj: '',
    email: '',
    telefone: '',
    status: 'a_iniciar' as 'a_iniciar' | 'em_andamento' | 'finalizado',
    origem: '',
    observacoes: '',
  })

  // Carregar origens disponíveis
  useEffect(() => {
    if (isOpen) {
      loadOrigensDisponiveis()
    }
  }, [isOpen])

  async function loadOrigensDisponiveis() {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('clientes')
      .select('origem')
      .not('origem', 'is', null)

    if (!error && data) {
      // Extrair valores únicos e não nulos
      const origensUnicas = Array.from(
        new Set(data.map(c => c.origem).filter(Boolean) as string[])
      ).sort()
      setOrigensDisponiveis(origensUnicas)
    }
  }

  // Atualizar formData quando cliente mudar ou quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      if (cliente) {
        setFormData({
          nome: cliente.nome || '',
          tipo_pessoa: cliente.tipo_pessoa || 'PF',
          cpf_cnpj: cliente.cpf_cnpj || '',
          email: cliente.email || '',
          telefone: cliente.telefone || '',
          status: cliente.status || 'a_iniciar',
          origem: cliente.origem || '',
          observacoes: cliente.observacoes || '',
        })
      } else {
        setFormData({
          nome: '',
          tipo_pessoa: 'PF',
          cpf_cnpj: '',
          email: '',
          telefone: '',
          status: 'a_iniciar',
          origem: '',
          observacoes: '',
        })
      }
    }
  }, [cliente, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const dataToSave = {
      nome: formData.nome,
      tipo_pessoa: formData.tipo_pessoa,
      cpf_cnpj: formData.cpf_cnpj || null,
      email: formData.email || null,
      telefone: formData.telefone || null,
      status: formData.status,
      origem: formData.origem || null,
      observacoes: formData.observacoes || null,
    }
    
    let error
    let newClienteId: string | null = null
    
    if (isEditMode && cliente) {
      // Atualizar cliente existente
      const { error: updateError } = await supabase
        .from('clientes')
        .update(dataToSave)
        .eq('id', cliente.id)
      error = updateError
      newClienteId = cliente.id
    } else {
      // Criar novo cliente
      const { data: insertedData, error: insertError } = await supabase
        .from('clientes')
        .insert([dataToSave])
        .select('id')
        .single()
      error = insertError
      newClienteId = insertedData?.id || null
    }

    if (!error && newClienteId) {
      // Reset form
      setFormData({
        nome: '',
        tipo_pessoa: 'PF',
        cpf_cnpj: '',
        email: '',
        telefone: '',
          status: 'a_iniciar',
        origem: '',
        observacoes: '',
      })
      // Recarregar origens disponíveis após salvar
      await loadOrigensDisponiveis()
      onSuccess?.()
      onClose()
    } else {
      await alert(`Erro ao ${isEditMode ? 'atualizar' : 'criar'} cliente: ` + (error?.message || 'Erro desconhecido'), 'Erro')
    }
    setLoading(false)
  }

  const handleClose = () => {
    if (!loading) {
      if (cliente) {
        setFormData({
          nome: cliente.nome || '',
          tipo_pessoa: cliente.tipo_pessoa || 'PF',
          cpf_cnpj: cliente.cpf_cnpj || '',
          email: cliente.email || '',
          telefone: cliente.telefone || '',
          status: cliente.status || 'a_iniciar',
          origem: cliente.origem || '',
          observacoes: cliente.observacoes || '',
        })
      } else {
        setFormData({
          nome: '',
          tipo_pessoa: 'PF',
          cpf_cnpj: '',
          email: '',
          telefone: '',
          status: 'a_iniciar',
          origem: '',
          observacoes: '',
        })
      }
      onClose()
    }
  }

  const handleCPFCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const masked = maskCPFCNPJ(value, formData.tipo_pessoa)
    setFormData({ ...formData, cpf_cnpj: masked })
  }

  const handleTipoPessoaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTipo = e.target.value as 'PF' | 'PJ'
    const masked = maskCPFCNPJ(formData.cpf_cnpj, newTipo)
    setFormData({ ...formData, tipo_pessoa: newTipo, cpf_cnpj: masked })
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEditMode ? "Editar cliente" : "Adicionar cliente"}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              Tipo de Pessoa *
            </label>
            <select
              required
              value={formData.tipo_pessoa}
              onChange={handleTipoPessoaChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="PF">Pessoa Física</option>
              <option value="PJ">Pessoa Jurídica</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CPF/CNPJ (Opcional)
            </label>
            <input
              type="text"
              value={formData.cpf_cnpj}
              onChange={handleCPFCNPJChange}
              maxLength={formData.tipo_pessoa === 'PF' ? 14 : 18}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={formData.tipo_pessoa === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-mail (Opcional)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Digite o e-mail"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone (Opcional)
            </label>
            <input
              type="tel"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Digite o telefone"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status *
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'a_iniciar' | 'em_andamento' | 'finalizado' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="a_iniciar">A iniciar</option>
              <option value="em_andamento">Em andamento</option>
              <option value="finalizado">Finalizado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Origem (Opcional)
            </label>
            <Combobox
              value={formData.origem}
              onChange={(value) => setFormData({ ...formData, origem: value })}
              options={origensDisponiveis}
              placeholder="Ex: Indicação, Site, etc."
              onCreateNew={(newOrigem) => {
                // Adicionar nova origem à lista local
                if (!origensDisponiveis.includes(newOrigem)) {
                  setOrigensDisponiveis([...origensDisponiveis, newOrigem].sort())
                }
              }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observações (Opcional)
          </label>
          <textarea
            value={formData.observacoes}
            onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Digite observações sobre o cliente"
          />
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
            {loading ? (isEditMode ? 'Salvando...' : 'Adicionando...') : (isEditMode ? 'Salvar alterações' : 'Adicionar cliente')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

