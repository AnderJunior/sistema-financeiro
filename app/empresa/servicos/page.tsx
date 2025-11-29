'use client'

import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { formatCurrency } from '@/lib/utils'
import { Plus, Search } from 'lucide-react'
import { ServicosTable } from '@/components/ServicosTable'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import { ServicoModal } from '@/components/modals/ServicoModal'

type Servico = Database['public']['Tables']['servicos']['Row']

export default function ServicosPage() {
  const [servicos, setServicos] = useState<Servico[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [servicoEditando, setServicoEditando] = useState<Servico | null>(null)

  async function loadServicos() {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('servicos')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setServicos(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadServicos()

    // Configurar subscription Realtime
    const supabase = createClient()
    const channel = supabase
      .channel('servicos_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'servicos',
        },
        async () => {
          await loadServicos()
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
            <h1 className="text-3xl font-bold text-gray-900">Serviços</h1>
            <p className="text-gray-600 mt-2">Gerencie seus serviços e planos</p>
          </div>
          <button
            onClick={() => {
              setServicoEditando(null)
              setIsModalOpen(true)
            }}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Serviço
          </button>
        </div>
        <Card>
          <Loading isLoading={true} message="Carregando serviços..." />
        </Card>
        <ServicoModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setServicoEditando(null)
          }}
          onSuccess={() => {
            loadServicos()
            setServicoEditando(null)
          }}
          servico={servicoEditando}
        />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Serviços</h1>
          <p className="text-gray-600 mt-2">Gerencie seus serviços e planos</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Serviço
        </button>
      </div>

      <Card>
        <ServicosTable 
          servicos={servicos} 
          onEdit={(servico) => {
            setServicoEditando(servico)
            setIsModalOpen(true)
          }}
          onDelete={loadServicos}
        />
      </Card>

      <ServicoModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setServicoEditando(null)
        }}
        onSuccess={() => {
          loadServicos()
          setServicoEditando(null)
        }}
        servico={servicoEditando}
      />
    </div>
  )
}







