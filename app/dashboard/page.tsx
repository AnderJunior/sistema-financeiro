'use client'

import { StatCard } from '@/components/ui/StatCard'
import { Loading } from '@/components/ui/Loading'
import { formatCurrency } from '@/lib/utils'
import { 
  Users, 
  CheckCircle2,
  Clock,
  DollarSign
} from 'lucide-react'
import { ClientesPorMesChart } from '@/components/dashboard/ClientesPorMesChart'
import { ValorPorTipoServicoChart } from '@/components/dashboard/ValorPorTipoServicoChart'
import { ServicosProximosVencimento } from '@/components/dashboard/ServicosProximosVencimento'
import { ClientesPorMesPorGrupoChart } from '@/components/dashboard/ClientesPorMesPorGrupoChart'
import { DateRangePicker } from '@/components/ui/DateRangePicker'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { startOfMonth, endOfMonth } from 'date-fns'
import { verificarServicosAtrasados } from '@/lib/utils/notificacoes-servicos'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // Verificar autenticação no cliente como fallback
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.log('❌ Sem sessão no dashboard, redirecionando para login')
        router.push('/login?redirectTo=/dashboard')
      }
    }
    checkAuth()
  }, [router, supabase])
  const [clientesMesAtual, setClientesMesAtual] = useState(0)
  const [clientesFinalizados, setClientesFinalizados] = useState(0)
  const [clientesPendentes, setClientesPendentes] = useState(0)
  const [entradasMes, setEntradasMes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  })

  async function loadData() {
    if (!dateRange.start || !dateRange.end) {
      setLoading(false)
      return
    }

    const supabase = createClient()
    
    // Usar o dateRange selecionado
    const startDate = new Date(dateRange.start)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(dateRange.end)
    endDate.setHours(23, 59, 59, 999)

    // Buscar todos os dados em paralelo
    const [
      clientesMesResult,
      clientesFinalizadosResult,
      clientesPendentesResult,
      entradasResult
    ] = await Promise.all([
      // Clientes cadastrados no período selecionado
      supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .gte('data_cadastro', startDate.toISOString())
        .lte('data_cadastro', endDate.toISOString()),
      // Clientes finalizados no período selecionado
      supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'finalizado')
        .gte('data_cadastro', startDate.toISOString())
        .lte('data_cadastro', endDate.toISOString()),
      // Clientes pendentes no período selecionado
      supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'a_iniciar')
        .gte('data_cadastro', startDate.toISOString())
        .lte('data_cadastro', endDate.toISOString()),
      // Entradas do período selecionado
      supabase
        .from('financeiro_lancamentos')
        .select('valor')
        .eq('tipo', 'entrada')
        .eq('status', 'pago')
        .gte('data_competencia', startDate.toISOString().split('T')[0])
        .lte('data_competencia', endDate.toISOString().split('T')[0])
    ])

    setClientesMesAtual(clientesMesResult.count || 0)
    setClientesFinalizados(clientesFinalizadosResult.count || 0)
    setClientesPendentes(clientesPendentesResult.count || 0)
    
    const entradas = entradasResult.data || []
    setEntradasMes(entradas.reduce((acc, item) => acc + Number(item.valor), 0))
    
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // Verificar serviços atrasados ao carregar o dashboard
    verificarServicosAtrasados()

    // Configurar subscriptions Realtime
    const supabase = createClient()
    const channel1 = supabase
      .channel('dashboard_financeiro_changes')
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

    const channel2 = supabase
      .channel('dashboard_clientes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clientes',
        },
        async () => {
          await loadData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel1)
      supabase.removeChannel(channel2)
    }
  }, [dateRange])

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Visão geral do seu negócio</p>
        </div>
        <Loading isLoading={true} message="Carregando dados do dashboard..." />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Visão geral do seu negócio</p>
        </div>
        <div className="flex justify-end">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Clientes Cadastrados"
          value={clientesMesAtual}
          icon={Users}
          iconColor="text-blue-600"
        />
        <StatCard
          title="Clientes Finalizados"
          value={clientesFinalizados}
          icon={CheckCircle2}
          iconColor="text-green-600"
        />
        <StatCard
          title="Clientes Pendentes"
          value={clientesPendentes}
          icon={Clock}
          iconColor="text-orange-600"
        />
        <StatCard
          title="Entradas do Mês"
          value={formatCurrency(entradasMes)}
          icon={DollarSign}
          iconColor="text-green-600"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="space-y-6">
          <ClientesPorMesChart />
          <ServicosProximosVencimento />
        </div>
        <div className="space-y-6">
          <ValorPorTipoServicoChart dateRange={dateRange} />
          <ClientesPorMesPorGrupoChart />
        </div>
      </div>
    </div>
  )
}
