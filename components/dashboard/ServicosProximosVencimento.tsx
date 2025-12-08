'use client'

import { Card } from '@/components/ui/Card'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Database } from '@/types/database.types'
import { Calendar, Package, Receipt, CheckSquare } from 'lucide-react'
import { differenceInDays } from 'date-fns'
import { useRouter } from 'next/navigation'

type Lancamento = Database['public']['Tables']['financeiro_lancamentos']['Row'] & {
  servicos?: Database['public']['Tables']['servicos']['Row']
  clientes?: Database['public']['Tables']['clientes']['Row']
  invoice_url?: string | null
}

type Tarefa = Database['public']['Tables']['tarefas']['Row'] & {
  clientes?: Database['public']['Tables']['clientes']['Row'] | null
  projetos?: Database['public']['Tables']['projetos']['Row'] | null
}

type TabType = 'servicos' | 'faturas' | 'tarefas'

export function ServicosProximosVencimento() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('servicos')
  const [servicos, setServicos] = useState<Lancamento[]>([])
  const [faturas, setFaturas] = useState<Lancamento[]>([])
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadServicos() {
      const supabase = createClient()
      
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      const dataLimite = new Date(hoje)
      dataLimite.setDate(dataLimite.getDate() + 10) // 10 dias à frente
      
      // Buscar vencidos e próximos do vencimento (até 10 dias à frente)
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
        // Filtrar apenas os próximos do vencimento e vencidos (até 10 dias à frente)
        const servicosFiltrados = data.filter((servico) => {
          if (!servico.data_vencimento) return false
          const dataVencimento = new Date(servico.data_vencimento)
          dataVencimento.setHours(0, 0, 0, 0)
          const diasDiferenca = differenceInDays(dataVencimento, hoje)
          // Incluir vencidos e próximos do vencimento (até 10 dias à frente)
          return diasDiferenca <= 10
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
      dataLimite.setDate(dataLimite.getDate() + 10) // 10 dias à frente
      
      // Buscar vencidos e próximos do vencimento (até 10 dias à frente)
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
        // Filtrar apenas os próximos do vencimento e vencidos (até 10 dias à frente)
        const faturasFiltradas = data.filter((fatura) => {
          if (!fatura.data_vencimento) return false
          const dataVencimento = new Date(fatura.data_vencimento)
          dataVencimento.setHours(0, 0, 0, 0)
          const diasDiferenca = differenceInDays(dataVencimento, hoje)
          // Incluir vencidos e próximos do vencimento (até 10 dias à frente)
          return diasDiferenca <= 10
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

    async function loadTarefas() {
      const supabase = createClient()
      
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      const dataLimite = new Date(hoje)
      dataLimite.setDate(dataLimite.getDate() + 10) // 10 dias à frente
      
      // Buscar colunas do kanban para identificar quais são concluídas/canceladas
      const { data: colunas } = await supabase
        .from('tarefas_kanban_colunas')
        .select('id, nome')
        .eq('ativo', true)
      
      if (!colunas) return
      
      // Identificar IDs das colunas concluídas, finalizadas e canceladas
      const colunasFinalizadasIds = colunas
        .filter(col => {
          const nomeLower = col.nome.toLowerCase()
          return nomeLower.includes('concluíd') || 
                 nomeLower.includes('cancelad') || 
                 nomeLower.includes('finalizado') ||
                 nomeLower.includes('finalizada')
        })
        .map(col => col.id)
      
      // Buscar todas as tarefas
      const { data } = await supabase
        .from('tarefas')
        .select(`
          *,
          clientes (*),
          projetos (*)
        `)
        .order('data_vencimento', { ascending: true, nullsFirst: false })
        .limit(100)

      if (data) {
        // Filtrar tarefas pendentes (não finalizadas/canceladas) e que não têm data de vencimento ou que não venceram nos próximos 10 dias
        const tarefasFiltradas = data.filter((tarefa) => {
          // Excluir tarefas finalizadas, concluídas ou canceladas
          if (colunasFinalizadasIds.includes(tarefa.status)) return false
          
          // Se não tem data de vencimento, incluir (tarefas pendentes sem prazo)
          if (!tarefa.data_vencimento) return true
          
          const dataVencimento = new Date(tarefa.data_vencimento)
          dataVencimento.setHours(0, 0, 0, 0)
          const diasDiferenca = differenceInDays(dataVencimento, hoje)
          // Incluir tarefas que não venceram ou que venceram nos próximos 10 dias
          return diasDiferenca <= 10
        })
        
        // Ordenar: sem data primeiro, depois por data de vencimento
        tarefasFiltradas.sort((a, b) => {
          if (!a.data_vencimento && !b.data_vencimento) return 0
          if (!a.data_vencimento) return -1
          if (!b.data_vencimento) return 1
          const dataA = new Date(a.data_vencimento)
          const dataB = new Date(b.data_vencimento)
          return dataA.getTime() - dataB.getTime()
        })
        
        setTarefas(tarefasFiltradas.slice(0, 5) as Tarefa[])
      }
    }

    async function loadData() {
      setLoading(true)
      await Promise.all([loadServicos(), loadFaturas(), loadTarefas()])
      setLoading(false)
    }

    loadData()

    // Configurar subscription Realtime
    const supabase = createClient()
    const channel1 = supabase
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

    const channel2 = supabase
      .channel('tarefas_proximos_vencimento_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tarefas',
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

  const handleFaturaClick = (fatura: Lancamento) => {
    if (!fatura.cliente_id) return

    // Navegar diretamente para a página do cliente com hash para scroll automático
    router.push(`/clientes/${fatura.cliente_id}#cobrancas`)
  }

  const handleTarefaClick = (tarefa: Tarefa) => {
    router.push(`/tarefas?tarefa=${tarefa.id}`)
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

  const renderTarefas = () => {
    if (tarefas.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          Nenhuma tarefa pendente ou próxima do vencimento encontrada
        </div>
      )
    }

    return tarefas.map((tarefa) => {
      const dias = tarefa.data_vencimento ? getDiasRestantes(tarefa.data_vencimento) : null
      const statusColor = dias === null 
        ? 'text-gray-600 bg-gray-50'
        : dias < 0 
        ? 'text-red-600 bg-red-50'
        : dias <= 3 
        ? 'text-red-600 bg-red-50'
        : dias <= 7 
        ? 'text-orange-600 bg-orange-50'
        : 'text-blue-600 bg-blue-50'
      
      return (
        <div
          key={tarefa.id}
          onClick={() => handleTarefaClick(tarefa)}
          className="flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors max-h-[80px] cursor-pointer"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="p-1.5 bg-purple-50 rounded-lg flex-shrink-0">
              <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">
                {tarefa.nome}
              </p>
              <p className="text-xs text-gray-600 truncate">
                {tarefa.clientes?.nome || tarefa.projetos?.nome || tarefa.descricao || 'Sem descrição'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {tarefa.data_vencimento && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(tarefa.data_vencimento)}</span>
                  </div>
                )}
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${statusColor}`}>
                  {dias === null
                    ? 'Sem prazo'
                    : dias < 0 
                    ? `Vencida há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'dia' : 'dias'}`
                    : dias === 0 
                    ? 'Vence hoje' 
                    : dias === 1 
                    ? 'Vence amanhã' 
                    : `${dias} dias restantes`}
                </span>
              </div>
            </div>
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
          <button
            onClick={() => setActiveTab('tarefas')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'tarefas'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Tarefas
          </button>
        </nav>
      </div>

      {/* Conteúdo das abas */}
      <div className="h-[415px] overflow-y-auto space-y-2">
        {activeTab === 'servicos' && renderServicos()}
        {activeTab === 'faturas' && renderFaturas()}
        {activeTab === 'tarefas' && renderTarefas()}
      </div>
    </Card>
  )
}

