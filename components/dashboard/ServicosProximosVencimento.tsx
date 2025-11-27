'use client'

import { Card } from '@/components/ui/Card'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Database } from '@/types/database.types'
import { Calendar, Package, Receipt } from 'lucide-react'
import { differenceInDays } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useModal } from '@/contexts/ModalContext'

type Lancamento = Database['public']['Tables']['financeiro_lancamentos']['Row'] & {
  servicos?: Database['public']['Tables']['servicos']['Row']
  clientes?: Database['public']['Tables']['clientes']['Row']
  invoice_url?: string | null
}

type TabType = 'servicos' | 'faturas'

export function ServicosProximosVencimento() {
  const router = useRouter()
  const { alert } = useModal()
  const [activeTab, setActiveTab] = useState<TabType>('servicos')
  const [servicos, setServicos] = useState<Lancamento[]>([])
  const [faturas, setFaturas] = useState<Lancamento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadServicos() {
      const supabase = createClient()
      
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      const dataLimite = new Date(hoje)
      dataLimite.setDate(dataLimite.getDate() + 30) // 30 dias à frente
      
      // Buscar vencidos e próximos do vencimento (até 30 dias à frente)
      const { data } = await supabase
        .from('financeiro_lancamentos')
        .select(`
          *,
          servicos (*),
          clientes (*)
        `)
        .not('servico_id', 'is', null)
        .not('data_vencimento', 'is', null)
        .lte('data_vencimento', dataLimite.toISOString().split('T')[0])
        .order('data_vencimento', { ascending: true })
        .limit(50)

      if (data) {
        // Filtrar apenas os próximos do vencimento e vencidos (até 30 dias à frente)
        const servicosFiltrados = data.filter((servico) => {
          if (!servico.data_vencimento) return false
          const dataVencimento = new Date(servico.data_vencimento)
          dataVencimento.setHours(0, 0, 0, 0)
          const diasDiferenca = differenceInDays(dataVencimento, hoje)
          // Incluir vencidos e próximos do vencimento (até 30 dias à frente)
          return diasDiferenca <= 30
        })
        
        // Ordenar: vencidos primeiro (mais antigos primeiro), depois próximos do vencimento
        servicosFiltrados.sort((a, b) => {
          if (!a.data_vencimento || !b.data_vencimento) return 0
          const dataA = new Date(a.data_vencimento)
          const dataB = new Date(b.data_vencimento)
          return dataA.getTime() - dataB.getTime()
        })
        
        setServicos(servicosFiltrados.slice(0, 5) as Lancamento[])
      }
    }

    async function loadFaturas() {
      const supabase = createClient()
      
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      const dataLimite = new Date(hoje)
      dataLimite.setDate(dataLimite.getDate() + 30) // 30 dias à frente
      
      // Buscar vencidos e próximos do vencimento (até 30 dias à frente)
      const { data } = await supabase
        .from('financeiro_lancamentos')
        .select(`
          *,
          clientes (*)
        `)
        .eq('tipo', 'entrada')
        .in('status', ['previsto', 'em_atraso'])
        .not('data_vencimento', 'is', null)
        .lte('data_vencimento', dataLimite.toISOString().split('T')[0])
        .order('data_vencimento', { ascending: true })
        .limit(50)

      if (data) {
        // Filtrar apenas os próximos do vencimento e vencidos (até 30 dias à frente)
        const faturasFiltradas = data.filter((fatura) => {
          if (!fatura.data_vencimento) return false
          const dataVencimento = new Date(fatura.data_vencimento)
          dataVencimento.setHours(0, 0, 0, 0)
          const diasDiferenca = differenceInDays(dataVencimento, hoje)
          // Incluir vencidos e próximos do vencimento (até 30 dias à frente)
          return diasDiferenca <= 30
        })
        
        // Ordenar: vencidos primeiro (mais antigos primeiro), depois próximos do vencimento
        faturasFiltradas.sort((a, b) => {
          if (!a.data_vencimento || !b.data_vencimento) return 0
          const dataA = new Date(a.data_vencimento)
          const dataB = new Date(b.data_vencimento)
          return dataA.getTime() - dataB.getTime()
        })
        
        // Garantir que invoice_url está incluído
        const faturasComUrl = faturasFiltradas.slice(0, 5).map((item: any) => ({
          ...item,
          invoice_url: item.invoice_url || null
        }))
        setFaturas(faturasComUrl as Lancamento[])
      }
    }

    async function loadData() {
      setLoading(true)
      await Promise.all([loadServicos(), loadFaturas()])
      setLoading(false)
    }

    loadData()

    // Configurar subscription Realtime
    const supabase = createClient()
    const channel = supabase
      .channel('servicos_proximos_vencimento_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financeiro_lancamentos',
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

  const getDiasRestantes = (dataVencimento: string) => {
    return differenceInDays(new Date(dataVencimento), new Date())
  }

  const getStatusColor = (dias: number) => {
    if (dias < 0) return 'text-red-600 bg-red-50' // Vencidos
    if (dias <= 3) return 'text-red-600 bg-red-50'
    if (dias <= 7) return 'text-orange-600 bg-orange-50'
    return 'text-blue-600 bg-blue-50'
  }

  const handleServicoClick = (servico: Lancamento) => {
    if (servico.cliente_id) {
      router.push(`/clientes/${servico.cliente_id}`)
    }
  }

  const handleFaturaClick = async (fatura: Lancamento) => {
    if (!fatura.cliente_id) return

    // Copiar link de pagamento se existir
    if (fatura.invoice_url) {
      try {
        await navigator.clipboard.writeText(fatura.invoice_url)
        await alert('Link de pagamento copiado para a área de transferência!', 'Link copiado')
      } catch (err) {
        await alert('Erro ao copiar link. Tente novamente.', 'Erro')
      }
    } else {
      await alert('Esta fatura não possui link de pagamento disponível.', 'Aviso')
    }

    // Navegar para a página do cliente com hash para scroll automático
    router.push(`/clientes/${fatura.cliente_id}#cobrancas`)
  }

  const renderServicos = () => {
    if (servicos.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          Nenhum serviço vencido ou próximo do vencimento encontrado
        </div>
      )
    }

    return servicos.map((servico) => {
      const dias = servico.data_vencimento ? getDiasRestantes(servico.data_vencimento) : 0
      
      return (
        <div
          key={servico.id}
          onClick={() => handleServicoClick(servico)}
          className="flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors max-h-[80px] cursor-pointer"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="p-1.5 bg-blue-50 rounded-lg flex-shrink-0">
              <Package className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">
                {servico.clientes?.nome || 'Cliente não encontrado'}
              </p>
              <p className="text-xs text-gray-600 truncate">
                {servico.servicos?.nome || 'Serviço não encontrado'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  <span>{servico.data_vencimento ? formatDate(servico.data_vencimento) : '-'}</span>
                </div>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${getStatusColor(dias)}`}>
                  {dias < 0 
                    ? `Vencido há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'dia' : 'dias'}`
                    : dias === 0 
                    ? 'Vence hoje' 
                    : dias === 1 
                    ? 'Vence amanhã' 
                    : `${dias} dias restantes`}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0 ml-2">
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(Number(servico.valor))}
            </p>
          </div>
        </div>
      )
    })
  }

  const renderFaturas = () => {
    if (faturas.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          Nenhuma fatura vencida ou próxima do vencimento encontrada
        </div>
      )
    }

    return faturas.map((fatura) => {
      const dias = fatura.data_vencimento ? getDiasRestantes(fatura.data_vencimento) : 0
      const statusColor = fatura.status === 'em_atraso' 
        ? 'text-red-600 bg-red-50' 
        : getStatusColor(dias)
      
      return (
        <div
          key={fatura.id}
          onClick={() => handleFaturaClick(fatura)}
          className="flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors max-h-[80px] cursor-pointer"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="p-1.5 bg-green-50 rounded-lg flex-shrink-0">
              <Receipt className="w-3.5 h-3.5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">
                {fatura.clientes?.nome || 'Cliente não encontrado'}
              </p>
              <p className="text-xs text-gray-600 truncate">
                {fatura.descricao}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  <span>{fatura.data_vencimento ? formatDate(fatura.data_vencimento) : '-'}</span>
                </div>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${statusColor}`}>
                  {fatura.status === 'em_atraso' 
                    ? 'Em atraso' 
                    : dias < 0
                    ? `Vencido há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'dia' : 'dias'}`
                    : dias === 0 
                    ? 'Vence hoje' 
                    : dias === 1 
                    ? 'Vence amanhã' 
                    : `${dias} dias restantes`}
                </span>
                {fatura.status === 'em_atraso' && (
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded-full text-red-600 bg-red-50">
                    Pendente
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0 ml-2">
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(Number(fatura.valor))}
            </p>
          </div>
        </div>
      )
    })
  }

  if (loading) {
    return (
      <Card title="Vencidos e Próximos do Vencimento">
        <div className="text-center py-8 text-gray-500">Carregando...</div>
      </Card>
    )
  }

  return (
    <Card title="Vencidos e Próximos do Vencimento">
      {/* Abas */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="flex gap-1" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('servicos')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'servicos'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Serviços
          </button>
          <button
            onClick={() => setActiveTab('faturas')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'faturas'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Faturas
          </button>
        </nav>
      </div>

      {/* Conteúdo das abas */}
      <div className="h-[415px] overflow-y-auto space-y-2">
        {activeTab === 'servicos' ? renderServicos() : renderFaturas()}
      </div>
    </Card>
  )
}

