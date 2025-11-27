'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import { useModal } from '@/contexts/ModalContext'

type Categoria = Database['public']['Tables']['financeiro_categorias']['Row']

interface CategoriaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  categoria?: Categoria | null
  tipo: 'entrada' | 'saida'
}

export function CategoriaModal({ isOpen, onClose, onSuccess, categoria, tipo }: CategoriaModalProps) {
  const isEditMode = !!categoria
  const { alert } = useModal()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    ativo: true,
  })

  useEffect(() => {
    if (isOpen) {
      if (categoria) {
        setFormData({
          nome: categoria.nome || '',
          descricao: categoria.descricao || '',
          ativo: categoria.ativo ?? true,
        })
      } else {
        setFormData({
          nome: '',
          descricao: '',
          ativo: true,
        })
      }
    }
  }, [categoria, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const dataToSave = {
      tipo,
      nome: formData.nome,
      descricao: formData.descricao || null,
      ativo: formData.ativo,
    }

    let error
    if (isEditMode && categoria) {
      const { error: updateError } = await supabase
        .from('financeiro_categorias')
        .update(dataToSave)
        .eq('id', categoria.id)
      error = updateError
    } else {
      const { error: insertError } = await supabase
        .from('financeiro_categorias')
        .insert([dataToSave])
      error = insertError
    }

    if (!error) {
      setFormData({
        nome: '',
        descricao: '',
        ativo: true,
      })
      onSuccess?.()
      onClose()
    } else {
      await alert(`Erro ao ${isEditMode ? 'atualizar' : 'criar'} categoria: ` + error.message, 'Erro')
    }
    setLoading(false)
  }

  const handleClose = () => {
    if (!loading) {
      if (categoria) {
        setFormData({
          nome: categoria.nome || '',
          descricao: categoria.descricao || '',
          ativo: categoria.ativo ?? true,
        })
      } else {
        setFormData({
          nome: '',
          descricao: '',
          ativo: true,
        })
      }
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEditMode ? 'Editar categoria' : 'Adicionar categoria'}>
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
              placeholder="Digite o nome da categoria"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Digite a descrição da categoria"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">Categoria ativa</span>
            </label>
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
            {loading ? (isEditMode ? 'Salvando...' : 'Adicionando...') : (isEditMode ? 'Salvar alterações' : 'Adicionar categoria')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

