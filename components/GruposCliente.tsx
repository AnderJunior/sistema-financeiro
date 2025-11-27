'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'
import { Plus, X } from 'lucide-react'
import { Database } from '@/types/database.types'
import { Modal } from '@/components/ui/Modal'
import { useModal } from '@/contexts/ModalContext'

type Grupo = Database['public']['Tables']['grupos']['Row']
type ClienteGrupo = Database['public']['Tables']['clientes_grupos']['Row'] & {
  grupos?: Grupo
}

interface GruposClienteProps {
  clienteId: string
}

export function GruposCliente({ clienteId }: GruposClienteProps) {
  const { alert, confirm } = useModal()
  const [grupos, setGrupos] = useState<ClienteGrupo[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [gruposDisponiveis, setGruposDisponiveis] = useState<Grupo[]>([])

  const loadGrupos = useCallback(async () => {
    const supabase = createClient()
    
    const { data } = await supabase
      .from('clientes_grupos')
      .select(`
        *,
        grupos (*)
      `)
      .eq('cliente_id', clienteId)
      .is('data_saida', null)
      .order('data_entrada', { ascending: false })

    if (data) {
      setGrupos(data as ClienteGrupo[])
    }
    setLoading(false)
  }, [clienteId])

  const loadGruposDisponiveis = useCallback(async () => {
    const supabase = createClient()
    
    // Buscar todos os grupos ativos
    const { data: todosGrupos } = await supabase
      .from('grupos')
      .select('*')
      .in('status', ['ativo', 'em_andamento'])
      .order('nome')

    // Buscar IDs dos grupos que o cliente já está
    const { data: gruposCliente } = await supabase
      .from('clientes_grupos')
      .select('grupo_id')
      .eq('cliente_id', clienteId)
      .is('data_saida', null)

    const idsGruposCliente = gruposCliente?.map(cg => cg.grupo_id) || []
    
    // Filtrar grupos disponíveis (que o cliente não está)
    const disponiveis = todosGrupos?.filter(g => !idsGruposCliente.includes(g.id)) || []
    
    setGruposDisponiveis(disponiveis)
  }, [clienteId])

  useEffect(() => {
    loadGrupos()
    loadGruposDisponiveis()
  }, [clienteId, loadGrupos, loadGruposDisponiveis])

  const handleRemoverGrupo = async (clienteGrupoId: string) => {
    const confirmed = await confirm(
      'Tem certeza que deseja remover este cliente do grupo?',
      'Confirmar remoção',
      'Remover',
      'Cancelar',
      'danger'
    )
    if (!confirmed) return

    const supabase = createClient()
    // Deletar o registro completamente para permitir adicionar novamente
    const { error } = await supabase
      .from('clientes_grupos')
      .delete()
      .eq('id', clienteGrupoId)

    if (!error) {
      loadGrupos()
      loadGruposDisponiveis()
    } else {
      await alert('Erro ao remover cliente do grupo: ' + error.message, 'Erro')
    }
  }

  if (loading) {
    return (
      <Card title="Grupos">
        <div className="text-center py-8 text-gray-500">Carregando...</div>
      </Card>
    )
  }

  return (
    <>
      <Card 
        title="Grupos"
        action={
          gruposDisponiveis.length > 0 && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
            >
              <Plus className="w-4 h-4" />
              Adicionar a Grupo
            </button>
          )
        }
      >
        {grupos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Cliente não está em nenhum grupo
          </div>
        ) : (
          <div className="space-y-3">
            {grupos.map((cg) => (
              <div
                key={cg.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {cg.grupos?.nome || 'Grupo não encontrado'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Entrada: {formatDate(cg.data_entrada)}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoverGrupo(cg.id)}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remover do grupo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <AdicionarGrupoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          loadGrupos()
          loadGruposDisponiveis()
          setIsModalOpen(false)
        }}
        clienteId={clienteId}
        gruposDisponiveis={gruposDisponiveis}
      />
    </>
  )
}

interface AdicionarGrupoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  clienteId: string
  gruposDisponiveis: Grupo[]
}

function AdicionarGrupoModal({
  isOpen,
  onClose,
  onSuccess,
  clienteId,
  gruposDisponiveis,
}: AdicionarGrupoModalProps) {
  const { alert } = useModal()
  const [loading, setLoading] = useState(false)
  const [selectedGrupoId, setSelectedGrupoId] = useState<string | null>(null)

  const handleGrupoClick = (grupoId: string) => {
    setSelectedGrupoId(grupoId)
  }

  const handleSubmit = async () => {
    if (!selectedGrupoId) {
      await alert('Por favor, selecione um grupo', 'Aviso')
      return
    }

    setLoading(true)

    const supabase = createClient()
    
    // Verificar se já existe um registro (mesmo com data_saida)
    const { data: existing } = await supabase
      .from('clientes_grupos')
      .select('id')
      .eq('cliente_id', clienteId)
      .eq('grupo_id', selectedGrupoId)
      .maybeSingle()

    let error = null

    if (existing) {
      // Se existe, atualizar (remover data_saida e atualizar data_entrada)
      const { error: updateError } = await supabase
        .from('clientes_grupos')
        .update({
          data_entrada: new Date().toISOString().split('T')[0],
          data_saida: null,
        })
        .eq('id', existing.id)
      
      error = updateError
    } else {
      // Se não existe, inserir novo registro
      const dataToInsert = {
        cliente_id: clienteId,
        grupo_id: selectedGrupoId,
        data_entrada: new Date().toISOString().split('T')[0],
      }

      const { error: insertError } = await supabase
        .from('clientes_grupos')
        .insert([dataToInsert])
      
      error = insertError
    }

    if (!error) {
      setSelectedGrupoId(null)
      onSuccess()
    } else {
      await alert('Erro ao adicionar cliente ao grupo: ' + error.message, 'Erro')
    }
    setLoading(false)
  }

  const handleClose = () => {
    setSelectedGrupoId(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Adicionar a Grupo">
      <div className="space-y-6">
        {gruposDisponiveis.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhum grupo disponível
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Nome</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {gruposDisponiveis.map((grupo) => (
                    <tr
                      key={grupo.id}
                      onClick={() => handleGrupoClick(grupo.id)}
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${
                        selectedGrupoId === grupo.id
                          ? 'bg-primary-50 border-primary-300'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              selectedGrupoId === grupo.id
                                ? 'border-primary-600 bg-primary-600'
                                : 'border-gray-300'
                            }`}
                          >
                            {selectedGrupoId === grupo.id && (
                              <div className="w-2 h-2 bg-white rounded-full" />
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{grupo.nome}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          grupo.status === 'ativo'
                            ? 'bg-green-100 text-green-800'
                            : grupo.status === 'em_andamento'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {grupo.status === 'ativo' ? 'Ativo' : 
                           grupo.status === 'em_andamento' ? 'Em Andamento' : 
                           'Encerrado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                type="button"
                onClick={handleSubmit}
                disabled={loading || !selectedGrupoId}
                className="flex-1 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adicionando...' : 'Adicionar ao Grupo'}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

