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
import { ConfiguracoesIniciais } from '@/components/dashboard/ConfiguracoesIniciais'
import { DateRangePicker } from '@/components/ui/DateRangePicker'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { startOfMonth, endOfMonth } from 'date-fns'
import { verificarServicosAtrasados } from '@/lib/utils/notificacoes-servicos'
import { useAssinaturaAtiva } from '@/lib/hooks/useAssinaturaAtiva'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // Verificar assinatura ativa (bloqueia acesso se não tiver)
  const { loading: loadingAssinatura, hasAssinaturaAtiva, assinaturaInfo } = useAssinaturaAtiva()
  
  // Verificar autenticação no cliente como fallback
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
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

    // OTIMIZADO: Buscar todos os dados em paralelo com queries otimizadas
    const [
      clientesMesResult,
      clientesFinalizadosResult,
      clientesPendentesResult,
      entradasResult
    ] = await Promise.all([
      // OTIMIZADO: Usar count apenas, sem buscar dados
      supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .gte('data_cadastro', startDate.toISOString())
        .lte('data_cadastro', endDate.toISOString()),
      // OTIMIZADO: Usar count apenas, sem buscar dados
      supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'finalizado')
        .gte('data_cadastro', startDate.toISOString())
        .lte('data_cadastro', endDate.toISOString()),
      // OTIMIZADO: Usar count apenas, sem buscar dados
      supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'a_iniciar')
        .gte('data_cadastro', startDate.toISOString())
        .lte('data_cadastro', endDate.toISOString()),
      // OTIMIZADO: Buscar apenas campo valor necessário
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
    // OTIMIZADO: Verificar serviços atrasados em background (não bloquear UI)
    verificarServicosAtrasados().catch(console.error)

    // OTIMIZADO: Consolidar subscriptions em um único canal com debounce
    const supabase = createClient()
    let debounceTimer: NodeJS.Timeout | null = null
    
    const channel = supabase
      .channel('dashboard_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'financeiro_lancamentos',
        },
        () => {
          // OTIMIZADO: Debounce para evitar múltiplas atualizações rápidas
          if (debounceTimer) {
            clearTimeout(debounceTimer)
          }
          debounceTimer = setTimeout(() => {
            loadData()
          }, 300)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'clientes',
        },
        () => {
          // OTIMIZADO: Debounce para evitar múltiplas atualizações rápidas
          if (debounceTimer) {
            clearTimeout(debounceTimer)
          }
          debounceTimer = setTimeout(() => {
            loadData()
          }, 300)
        }
      )
      .subscribe()

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      supabase.removeChannel(channel)
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

      {/* Container de Mini Tarefas para Configurações Iniciais */}
      <ConfiguracoesIniciais />

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
