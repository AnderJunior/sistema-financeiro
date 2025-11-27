'use client'

import { formatCurrency } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GrupoComEstatisticas } from '@/app/grupos/page'
import { Edit, Trash2 } from 'lucide-react'
import { GrupoModal } from '@/components/modals/GrupoModal'
import { Database } from '@/types/database.types'
import { useModal } from '@/contexts/ModalContext'

type Grupo = Database['public']['Tables']['grupos']['Row']

interface GruposTableProps {
  grupos: GrupoComEstatisticas[]
  onDelete?: () => void
  onEdit?: () => void
}

export function GruposTable({ grupos: initialGrupos, onDelete, onEdit }: GruposTableProps) {
  const { alert, confirm } = useModal()
  const [grupos, setGrupos] = useState(initialGrupos)
  const [editingGrupo, setEditingGrupo] = useState<Grupo | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Sincronizar com mudanças do parent component
  useEffect(() => {
    setGrupos(initialGrupos)
  }, [initialGrupos])

  const handleDelete = async (id: string) => {
    const confirmed = await confirm(
      'Tem certeza que deseja excluir este grupo?',
      'Confirmar exclusão',
      'Excluir',
      'Cancelar',
      'danger'
    )
    if (!confirmed) return

    const supabase = createClient()
    const { error } = await supabase
      .from('grupos')
      .delete()
      .eq('id', id)

    if (!error) {
      setGrupos(grupos.filter(g => g.id !== id))
      onDelete?.()
    } else {
      await alert('Erro ao excluir grupo: ' + error.message, 'Erro')
    }
  }

  const handleEditClick = (grupo: GrupoComEstatisticas, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingGrupo(grupo)
    setIsEditModalOpen(true)
  }

  const handleEditSuccess = () => {
    setIsEditModalOpen(false)
    setEditingGrupo(null)
    onEdit?.()
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Nome</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Quantidade de Clientes</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Valor Recebido (R$)</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Ações</th>
          </tr>
        </thead>
        <tbody>
          {grupos.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center py-8 text-gray-500">
                Nenhum grupo encontrado
              </td>
            </tr>
          ) : (
            grupos.map((grupo) => (
              <tr key={grupo.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{grupo.nome}</p>
                    {grupo.descricao && (
                      <p className="text-xs text-gray-600 mt-1">{grupo.descricao}</p>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-gray-700">
                  {grupo.quantidade_clientes}
                </td>
                <td className="py-3 px-4 text-sm text-gray-700 font-medium">
                  {formatCurrency(grupo.valor_recebido)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => handleEditClick(grupo, e)}
                      className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(grupo.id)}
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

      <GrupoModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setEditingGrupo(null)
        }}
        onSuccess={handleEditSuccess}
        grupo={editingGrupo}
      />
    </div>
  )
}

