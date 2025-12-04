'use client'

import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { Plus } from 'lucide-react'
import { GruposTable } from '@/components/GruposTable'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import { GrupoModal } from '@/components/modals/GrupoModal'
import { useAssinaturaAtiva } from '@/lib/hooks/useAssinaturaAtiva'

type Grupo = Database['public']['Tables']['grupos']['Row']

export interface GrupoComEstatisticas extends Grupo {
  quantidade_clientes: number
  valor_recebido: number
}

export default function GruposPage() {
  // Verificar assinatura ativa (bloqueia acesso se não tiver)
  const { loading: loadingAssinatura } = useAssinaturaAtiva()
  
  const [grupos, setGrupos] = useState<GrupoComEstatisticas[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  async function loadGrupos() {
    const supabase = createClient()
    
    // Buscar todos os grupos
    const { data: gruposData, error: gruposError } = await supabase
      .from('grupos')
      .select('*')
      .order('created_at', { ascending: false })

    if (gruposError || !gruposData) {
      setLoading(false)
      return
    }

    // Para cada grupo, buscar quantidade de clientes e valor recebido
    const gruposComEstatisticas = await Promise.all(
      gruposData.map(async (grupo) => {
        // Buscar IDs dos clientes do grupo (apenas os que não saíram)
        const { data: clientesGrupo } = await supabase
          .from('clientes_grupos')
          .select('cliente_id')
          .eq('grupo_id', grupo.id)
          .is('data_saida', null)

        const clienteIds = clientesGrupo?.map(cg => cg.cliente_id) || []
        const quantidadeClientes = clienteIds.length

        // Calcular valor total de cobranças pagas dos clientes do grupo
        let valorRecebido = 0
        if (clienteIds.length > 0) {
          const { data: cobrancasPagas } = await supabase
            .from('financeiro_lancamentos')
            .select('valor')
            .in('cliente_id', clienteIds)
            .eq('tipo', 'entrada')
            .eq('status', 'pago')

          valorRecebido = cobrancasPagas?.reduce((sum, cobranca) => sum + (cobranca.valor || 0), 0) || 0
        }

        return {
          ...grupo,
          quantidade_clientes: quantidadeClientes,
          valor_recebido: valorRecebido,
        }
      })
    )

    setGrupos(gruposComEstatisticas)
    setLoading(false)
  }

  useEffect(() => {
    loadGrupos()

    // Configurar subscription Realtime
    const supabase = createClient()
    const channel = supabase
      .channel('grupos_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grupos',
        },
        async () => {
          await loadGrupos()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Grupos</h1>
            <p className="text-gray-600 mt-2">Gerencie grupos, planos e turmas</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Grupo
          </button>
        </div>
        <Card>
          <Loading isLoading={true} message="Carregando grupos..." />
        </Card>
        <GrupoModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={loadGrupos}
        />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Grupos</h1>
          <p className="text-gray-600 mt-2">Gerencie grupos, planos e turmas</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Grupo
        </button>
      </div>

      <Card>
        <GruposTable grupos={grupos} onDelete={loadGrupos} onEdit={loadGrupos} />
      </Card>

      <GrupoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadGrupos}
      />
    </div>
  )
}

