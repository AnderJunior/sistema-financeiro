'use client'

import { Edit, Trash2, Search } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useModal } from '@/contexts/ModalContext'
import { FluxoAutomacao, TipoAutomacao } from '@/app/automacoes/page'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

interface FluxosAutomacaoTableProps {
  fluxos: FluxoAutomacao[]
  onEdit?: (fluxo: FluxoAutomacao) => void
  onDelete?: () => void
  onToggleStatus?: () => void
}

const tipoAutomacaoLabels: Record<TipoAutomacao, string> = {
  notificacao: 'Notificação',
  cobranca: 'Cobrança',
  relatorio: 'Relatório',
  integracao: 'Integração',
  backup: 'Backup',
  limpeza: 'Limpeza',
  sincronizacao: 'Sincronização',
  outro: 'Outro'
}

const tipoAutomacaoColors: Record<TipoAutomacao, string> = {
  notificacao: 'bg-blue-100 text-blue-800',
  cobranca: 'bg-green-100 text-green-800',
  relatorio: 'bg-purple-100 text-purple-800',
  integracao: 'bg-orange-100 text-orange-800',
  backup: 'bg-yellow-100 text-yellow-800',
  limpeza: 'bg-red-100 text-red-800',
  sincronizacao: 'bg-indigo-100 text-indigo-800',
  outro: 'bg-gray-100 text-gray-800'
}

// Componente de Toggle Switch
interface ToggleSwitchProps {
  checked: boolean
  onChange: () => void
  label?: string
}

function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <div className="flex items-center gap-3">
      {label && (
        <span className={`text-sm font-medium transition-colors ${
          checked ? 'text-green-600' : 'text-gray-300'
        }`}>
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
          checked ? 'bg-green-600' : 'bg-gray-800'
        }`}
        role="switch"
        aria-checked={checked}
        aria-label={checked ? 'Ativo' : 'Inativo'}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

export function FluxosAutomacaoTable({ 
  fluxos: initialFluxos, 
  onEdit, 
  onDelete,
  onToggleStatus 
}: FluxosAutomacaoTableProps) {
  const { confirm } = useModal()
  const [fluxos, setFluxos] = useState(initialFluxos)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    setFluxos(initialFluxos)
  }, [initialFluxos])

  const filteredFluxos = fluxos.filter(fluxo =>
    fluxo.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fluxo.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tipoAutomacaoLabels[fluxo.tipo_automacao].toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    const confirmed = await confirm(
      'Tem certeza que deseja excluir este fluxo de automação?',
      'Confirmar exclusão',
      'Excluir',
      'Cancelar',
      'danger'
    )
    if (!confirmed) return

    const supabase = createClient()
    const { error } = await supabase
      .from('fluxos_automacao')
      .delete()
      .eq('id', id)

    if (!error) {
      setFluxos(fluxos.filter(f => f.id !== id))
      onDelete?.()
    }
  }

  const handleToggleStatus = async (fluxo: FluxoAutomacao) => {
    const supabase = createClient()
    const novoStatus = fluxo.status === 'ativo' ? 'inativo' : 'ativo'
    
    const { error } = await supabase
      .from('fluxos_automacao')
      .update({ status: novoStatus })
      .eq('id', fluxo.id)

    if (!error) {
      setFluxos(fluxos.map(f => 
        f.id === fluxo.id ? { ...f, status: novoStatus as any } : f
      ))
      onToggleStatus?.()
    }
  }

  return (
    <div>
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar fluxos..."
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
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Criado em</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredFluxos.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  Nenhum fluxo encontrado
                </td>
              </tr>
            ) : (
              filteredFluxos.map((fluxo) => (
                <tr key={fluxo.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <Link href={`/automacoes/${fluxo.id}`} className="block hover:opacity-80 transition-opacity">
                      <div>
                        <p className="text-sm font-medium text-gray-900 hover:text-primary-600 cursor-pointer">{fluxo.nome}</p>
                        {fluxo.descricao && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-1">{fluxo.descricao}</p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      tipoAutomacaoColors[fluxo.tipo_automacao]
                    }`}>
                      {tipoAutomacaoLabels[fluxo.tipo_automacao]}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <ToggleSwitch
                      checked={fluxo.status === 'ativo'}
                      onChange={() => handleToggleStatus(fluxo)}
                      label={fluxo.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    />
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {formatDate(fluxo.created_at)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit?.(fluxo)}
                        className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(fluxo.id)}
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

