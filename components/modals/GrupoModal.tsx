'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import { useModal } from '@/contexts/ModalContext'

type Grupo = Database['public']['Tables']['grupos']['Row']

interface GrupoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  grupo?: Grupo | null
}

export function GrupoModal({ isOpen, onClose, onSuccess, grupo }: GrupoModalProps) {
  const isEditMode = !!grupo
  const { alert } = useModal()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    status: 'ativo' as 'ativo' | 'encerrado' | 'em_andamento',
  })

  // Atualizar formData quando grupo mudar ou quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      if (grupo) {
        setFormData({
          nome: grupo.nome || '',
          descricao: grupo.descricao || '',
          status: grupo.status || 'ativo',
        })
      } else {
        setFormData({
          nome: '',
          descricao: '',
          status: 'ativo',
        })
      }
    }
  }, [grupo, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const dataToSave = {
      nome: formData.nome,
      descricao: formData.descricao || null,
      status: formData.status,
    }
    
    let error
    if (isEditMode && grupo) {
      // Atualizar grupo existente
      const { error: updateError } = await supabase
        .from('grupos')
        .update(dataToSave)
        .eq('id', grupo.id)
      error = updateError
    } else {
      // Criar novo grupo
      const { error: insertError } = await supabase.from('grupos').insert([dataToSave])
      error = insertError
    }

    if (!error) {
      // Reset form
      setFormData({
        nome: '',
        descricao: '',
        status: 'ativo',
      })
      onSuccess?.()
      onClose()
    } else {
      await alert(`Erro ao ${isEditMode ? 'atualizar' : 'criar'} grupo: ` + error.message, 'Erro')
    }
    setLoading(false)
  }

  const handleClose = () => {
    if (!loading) {
      if (grupo) {
        setFormData({
          nome: grupo.nome || '',
          descricao: grupo.descricao || '',
          status: grupo.status || 'ativo',
        })
      } else {
        setFormData({
          nome: '',
          descricao: '',
          status: 'ativo',
        })
      }
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEditMode ? "Editar grupo" : "Adicionar grupo"}>
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
              Descrição:
            </label>
            <input
              type="text"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Digite a descrição"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status *
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="ativo">Ativo</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="encerrado">Encerrado</option>
            </select>
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
            {loading ? (isEditMode ? 'Salvando...' : 'Adicionando...') : (isEditMode ? 'Salvar alterações' : 'Adicionar grupo')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

