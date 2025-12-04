'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { Plus, Edit, Trash2, MoreVertical, ChevronDown, ChevronUp } from 'lucide-react'
import { CategoriaModal } from '@/components/modals/CategoriaModal'
import { useModal } from '@/contexts/ModalContext'
import { useAssinaturaAtiva } from '@/lib/hooks/useAssinaturaAtiva'

type Categoria = Database['public']['Tables']['financeiro_categorias']['Row']

export default function CategoriasPage() {
  // Verificar assinatura ativa (bloqueia acesso se não tiver)
  const { loading: loadingAssinatura } = useAssinaturaAtiva()
  
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'entrada' | 'saida'>('entrada')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null)
  const [expandedCoringas, setExpandedCoringas] = useState(true)
  const [expandedPersonalizadas, setExpandedPersonalizadas] = useState(true)
  const { alert, confirm } = useModal()

  async function loadCategorias() {
    const supabase = createClient()
    // Obter usuário atual
    const { data: { user } } = await supabase.auth.getUser()
    
    // Buscar categorias coringas (is_coringa = true) e categorias do usuário atual
    const { data, error } = await supabase
      .from('financeiro_categorias')
      .select('*')
      .eq('tipo', activeTab)
      .or(`is_coringa.eq.true${user?.id ? ',user_id.eq.' + user.id : ''}`)
      .order('is_coringa', { ascending: false })
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
    // Não permitir editar categorias coringas
    if (categoria.is_coringa) {
      alert('Não é possível editar categorias coringas (padrão do sistema).', 'Aviso')
      return
    }
    setEditingCategoria(categoria)
    setIsModalOpen(true)
  }

  const handleDelete = async (categoria: Categoria) => {
    // Não permitir excluir categorias coringas
    if (categoria.is_coringa) {
      await alert('Não é possível excluir categorias coringas (padrão do sistema).', 'Aviso')
      return
    }

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
      .eq('id', categoria.id)

    if (error) {
      await alert('Erro ao excluir categoria: ' + error.message, 'Erro')
    } else {
      loadCategorias()
    }
  }

  const handleToggleStatus = async (categoria: Categoria) => {
    // Não permitir alterar status de categorias coringas
    if (categoria.is_coringa) {
      await alert('Não é possível alterar o status de categorias coringas (padrão do sistema).', 'Aviso')
      return
    }

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
  const categoriasCoringas = categoriasFiltradas.filter(cat => cat.is_coringa)
  const categoriasPersonalizadas = categoriasFiltradas.filter(cat => !cat.is_coringa)

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

        {/* Tabela de Categorias Coringas - Sanfona */}
        {categoriasCoringas.length > 0 && (
          <div className="mb-8">
            <button
              onClick={() => setExpandedCoringas(!expandedCoringas)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors mb-4"
            >
              <h2 className="text-lg font-semibold text-gray-900">
                Categorias Padrão
              </h2>
              {expandedCoringas ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
            {expandedCoringas && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Nome</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Descrição</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Situação</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoriasCoringas.map((categoria) => (
                      <tr key={categoria.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{categoria.nome}</span>
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              Padrão
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600">
                            {categoria.descricao || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            categoria.ativo
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {categoria.ativo ? 'Habilitado' : 'Desabilitado'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm text-gray-500">Somente leitura</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tabela de Categorias Personalizadas - Sanfona */}
        <div>
          <button
            onClick={() => setExpandedPersonalizadas(!expandedPersonalizadas)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors mb-4"
          >
            <h2 className="text-lg font-semibold text-gray-900">
              Suas Categorias Personalizadas
            </h2>
            {expandedPersonalizadas ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>
          {expandedPersonalizadas && (
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
                  {categoriasPersonalizadas.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-gray-500">
                        Nenhuma categoria personalizada encontrada. Clique em "Adicionar categoria" para criar uma.
                      </td>
                    </tr>
                  ) : (
                    categoriasPersonalizadas.map((categoria) => (
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
                              onClick={() => handleDelete(categoria)}
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
          )}
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







