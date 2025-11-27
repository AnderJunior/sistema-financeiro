'use client'

import { formatCurrency } from '@/lib/utils'
import { Database } from '@/types/database.types'
import { Edit, Trash2, Search } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useModal } from '@/contexts/ModalContext'

type Servico = Database['public']['Tables']['servicos']['Row']

interface ServicosTableProps {
  servicos: Servico[]
  onEdit?: (servico: Servico) => void
  onDelete?: () => void
}

export function ServicosTable({ servicos: initialServicos, onEdit, onDelete }: ServicosTableProps) {
  const { confirm } = useModal()
  const [servicos, setServicos] = useState(initialServicos)
  const [searchTerm, setSearchTerm] = useState('')

  // Sincronizar com mudanças do parent component
  useEffect(() => {
    setServicos(initialServicos)
  }, [initialServicos])

  const filteredServicos = servicos.filter(servico =>
    servico.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    servico.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    const confirmed = await confirm(
      'Tem certeza que deseja excluir este serviço?',
      'Confirmar exclusão',
      'Excluir',
      'Cancelar',
      'danger'
    )
    if (!confirmed) return

    const supabase = createClient()
    const { error } = await supabase
      .from('servicos')
      .delete()
      .eq('id', id)

    if (!error) {
      setServicos(servicos.filter(s => s.id !== id))
      onDelete?.()
    }
  }

  return (
    <div>
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar serviços..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-500"
          />
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Nome</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Tipo</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Valor Base</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Unidade</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredServicos.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  Nenhum serviço encontrado
                </td>
              </tr>
            ) : (
              filteredServicos.map((servico) => (
                <tr key={servico.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{servico.nome}</p>
                      {servico.descricao && (
                        <p className="text-xs text-gray-600 mt-1">{servico.descricao}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 capitalize">{servico.tipo}</td>
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">
                    {formatCurrency(Number(servico.valor_base))}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700 capitalize">{servico.unidade_cobranca}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      servico.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {servico.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit?.(servico)}
                        className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(servico.id)}
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
    </div>
  )
}

