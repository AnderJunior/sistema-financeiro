'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { Plus, Edit, Trash2, MoreVertical } from 'lucide-react'
import { CategoriaModal } from '@/components/modals/CategoriaModal'
import { useModal } from '@/contexts/ModalContext'

type Categoria = Database['public']['Tables']['financeiro_categorias']['Row']

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'entrada' | 'saida'>('entrada')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null)
  const { alert, confirm } = useModal()

  async function loadCategorias() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('financeiro_categorias')
      .select('*')
      .eq('tipo', activeTab)
      .order('nome', { ascending: true })

    if (error) {
      await alert('Erro ao carregar categorias: ' + error.message, 'Erro')
    } else {
      setCategorias(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    setLoading(true)
    loadCategorias()
  }, [activeTab])

  const handleEdit = (categoria: Categoria) => {
    setEditingCategoria(categoria)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm(
      'Tem certeza que deseja excluir esta categoria?',
      'Confirmar exclusão',
      'Excluir',
      'Cancelar',
      'danger'
    )
    if (!confirmed) return

    const supabase = createClient()
    const { error } = await supabase
      .from('financeiro_categorias')
      .delete()
      .eq('id', id)

    if (error) {
      await alert('Erro ao excluir categoria: ' + error.message, 'Erro')
    } else {
      loadCategorias()
    }
  }

  const handleToggleStatus = async (categoria: Categoria) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('financeiro_categorias')
      .update({ ativo: !categoria.ativo })
      .eq('id', categoria.id)

    if (error) {
      await alert('Erro ao atualizar status: ' + error.message, 'Erro')
    } else {
      loadCategorias()
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingCategoria(null)
  }

  const handleModalSuccess = () => {
    loadCategorias()
    handleModalClose()
  }

  const categoriasFiltradas = categorias.filter(cat => cat.tipo === activeTab)

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Categorias</h1>
            <p className="text-gray-600 mt-2">Gerencie as categorias de receitas e despesas</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Adicionar categoria
          </button>
        </div>
        <Card>
          <Loading isLoading={true} message="Carregando categorias..." />
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Categorias</h1>
          <p className="text-gray-600 mt-2">Gerencie as categorias de receitas e despesas</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Adicionar categoria
        </button>
      </div>

      <Card>
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setActiveTab('entrada')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'entrada'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Receitas
          </button>
          <button
            onClick={() => setActiveTab('saida')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'saida'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Despesas
          </button>
        </div>

        {/* Tabela de Categorias */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Nome</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Descrição</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Situação</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {categoriasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    Nenhuma categoria encontrada
                  </td>
                </tr>
              ) : (
                categoriasFiltradas.map((categoria) => (
                  <tr key={categoria.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium text-gray-900">{categoria.nome}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">
                        {categoria.descricao || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(categoria)}
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          categoria.ativo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {categoria.ativo ? 'Habilitado' : 'Desabilitado'}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(categoria)}
                          className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(categoria.id)}
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
      </Card>

      <CategoriaModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        categoria={editingCategoria}
        tipo={activeTab}
      />
    </div>
  )
}





