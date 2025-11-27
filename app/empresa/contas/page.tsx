'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import { ContasCarousel } from '@/components/ContasCarousel'
import { TransferenciasList } from '@/components/TransferenciasList'
import { ContaModal } from '@/components/modals/ContaModal'
import { Wallet, Plus } from 'lucide-react'

type ContaFinanceira = Database['public']['Tables']['contas_financeiras']['Row']
type Transferencia = Database['public']['Tables']['transferencias_bancarias']['Row'] & {
  banco_origem: ContaFinanceira
  banco_recebedor: ContaFinanceira
}

export default function ContasPage() {
  const [contas, setContas] = useState<ContaFinanceira[]>([])
  const [transferencias, setTransferencias] = useState<Transferencia[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [contaEditando, setContaEditando] = useState<ContaFinanceira | null>(null)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      
      // Carregar contas financeiras
      const { data: contasData } = await supabase
        .from('contas_financeiras')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true })

      // Carregar transferências com relacionamentos
      const { data: transferenciasData } = await supabase
        .from('transferencias_bancarias')
        .select(`
          *,
          banco_origem:contas_financeiras!banco_origem_id(*),
          banco_recebedor:contas_financeiras!banco_recebedor_id(*)
        `)
        .order('data_transferencia', { ascending: false })

      if (contasData) {
        setContas(contasData)
      }

      if (transferenciasData) {
        setTransferencias(transferenciasData as Transferencia[])
      }

      setLoading(false)
    }

    loadData()

    // Configurar subscription Realtime
    const supabase = createClient()
    const channel = supabase
      .channel('contas_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contas_financeiras',
        },
        async () => {
          await loadData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transferencias_bancarias',
        },
        async () => {
          await loadData()
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Contas</h1>
          <p className="text-gray-600 mt-2">Visualize suas contas e transferências</p>
        </div>
        <Card>
          <Loading isLoading={true} message="Carregando contas..." />
        </Card>
      </div>
    )
  }

  const handleOpenModal = () => {
    setContaEditando(null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setContaEditando(null)
  }

  const handleSuccess = async () => {
    // Recarregar dados
    const supabase = createClient()
    
    const { data: contasData } = await supabase
      .from('contas_financeiras')
      .select('*')
      .eq('ativo', true)
      .order('nome', { ascending: true })

    if (contasData) {
      setContas(contasData)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="w-8 h-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900">Contas</h1>
          </div>
          <p className="text-gray-600 mt-2">Visualize suas contas e transferências entre elas</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Conta
        </button>
      </div>

      {/* Carrossel de Contas */}
      <div className="mb-8">
        <ContasCarousel 
          contas={contas} 
          onEdit={(conta) => {
            setContaEditando(conta)
            setIsModalOpen(true)
          }}
        />
      </div>

      {/* Lista de Transferências */}
      <div>
        <TransferenciasList transferencias={transferencias} />
      </div>

      {/* Modal de Cadastro/Edição */}
      <ContaModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        conta={contaEditando}
      />
    </div>
  )
}





