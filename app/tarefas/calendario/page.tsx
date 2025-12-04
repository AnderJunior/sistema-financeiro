'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import { CalendarView } from '@/components/calendar/CalendarView'
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar'
import { formatDate, parseDateForCalendar } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { startOfWeek, endOfWeek } from 'date-fns'

// Tipagem local para Tarefa (evita problemas com tipos do Database)
type Tarefa = {
  id: string
  nome: string
  descricao: string | null
  data_inicio: string | null
  data_vencimento: string | null
  cliente_id: string | null
  projeto_id: string | null
  prioridade: 'urgente' | 'alta' | 'normal' | 'baixa' | null
  status: string
  created_at: string
  updated_at: string
  clientes?: Database['public']['Tables']['clientes']['Row'] | null
  projetos?: Database['public']['Tables']['projetos']['Row'] | null
}

type Projeto = Database['public']['Tables']['projetos']['Row'] & {
  clientes?: Database['public']['Tables']['clientes']['Row'] | null
}

type Cobranca = Database['public']['Tables']['financeiro_lancamentos']['Row'] & {
  clientes?: Database['public']['Tables']['clientes']['Row'] | null
  servicos?: Database['public']['Tables']['servicos']['Row'] | null
}

export type CalendarEvent = {
  id: string
  title: string
  date: Date
  type: 'tarefa' | 'projeto' | 'cobranca'
  color: string
  data: Tarefa | Projeto | Cobranca
  time?: string
}

type ViewMode = 'daily' | 'weekly' | 'monthly'

export default function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('weekly')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    tarefas: true,
    projetos: true,
    cobrancas: true,
  })
  const isLoadingRef = useRef(false)

  // Remover overflow do main para evitar scroll duplo
  useEffect(() => {
    const mainElement = document.querySelector('main')
    if (mainElement) {
      mainElement.style.overflow = 'hidden'
    }
    return () => {
      if (mainElement) {
        mainElement.style.overflow = ''
      }
    }
  }, [])

  const loadEvents = useCallback(async () => {
    // Prevenir múltiplas chamadas simultâneas
    if (isLoadingRef.current) {
      return
    }

    isLoadingRef.current = true
    setLoading(true)
    const supabase = createClient()
    const allEvents: CalendarEvent[] = []
    const eventIds = new Set<string>() // Para evitar duplicatas

    // Carregar configurações de colunas finalizadas
    const [tarefasFinalizadoConfig, projetosFinalizadoConfig] = await Promise.all([
      supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('chave', 'tarefas_coluna_finalizado_id')
        .single(),
      supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('chave', 'projetos_coluna_finalizado_id')
        .single()
    ])
    
    const tarefasColunaFinalizadoId = tarefasFinalizadoConfig.data?.valor || null
    const projetosColunaFinalizadoId = projetosFinalizadoConfig.data?.valor || null

    // OTIMIZADO: Fazer todas as queries em paralelo com Promise.all
    const queries: Promise<any>[] = []

    if (filters.tarefas) {
      queries.push(
        supabase
          .from('tarefas')
          .select(`
            *,
            clientes (*),
            projetos (*)
          `)
          .not('data_vencimento', 'is', null)
          .then(({ data }) => ({ type: 'tarefas', data }))
      )
    }

    if (filters.projetos) {
      queries.push(
        supabase
          .from('projetos')
          .select('*')
          .not('data_fim_prevista', 'is', null)
          .then(({ data }) => ({ type: 'projetos', data }))
      )
    }

    if (filters.cobrancas) {
      queries.push(
        supabase
          .from('financeiro_lancamentos')
          .select(`
            *,
            clientes (*),
            servicos (*)
          `)
          .eq('tipo', 'entrada')
          .not('data_vencimento', 'is', null)
          .then(({ data }) => ({ type: 'cobrancas', data }))
      )
    }

    // Executar todas as queries em paralelo
    const results = await Promise.all(queries)

    // Processar resultados
    let projetosData: Projeto[] = []
    const clienteIdsSet = new Set<string>()

    for (const result of results) {
      if (result.type === 'tarefas' && result.data) {
        // Usar Map para garantir deduplicação eficiente por ID
        const tarefasMap = new Map<string, Tarefa>()
        result.data.forEach((tarefa: Tarefa) => {
          if (!tarefasMap.has(tarefa.id)) {
            tarefasMap.set(tarefa.id, tarefa as Tarefa)
          }
        })
        const uniqueTarefas = Array.from(tarefasMap.values())

        uniqueTarefas.forEach((tarefa) => {
          // Ocultar tarefas que estão na coluna finalizado
          if (tarefasColunaFinalizadoId && tarefa.status === tarefasColunaFinalizadoId) {
            return
          }
          
          if (tarefa.data_vencimento) {
            const eventKey = `tarefa-${tarefa.id}`
            // Verificar se já foi adicionada para evitar duplicatas
            if (!eventIds.has(eventKey)) {
              const eventDate = parseDateForCalendar(tarefa.data_vencimento)
              if (eventDate) {
                eventIds.add(eventKey)
                allEvents.push({
                  id: tarefa.id,
                  title: tarefa.nome,
                  date: eventDate,
                  type: 'tarefa',
                  color: '#2563EB',
                  data: tarefa,
                })
              }
            }
          }
        })
      }

      if (result.type === 'projetos' && result.data) {
        // Usar Map para garantir deduplicação eficiente por ID
        const projetosMap = new Map<string, Projeto>()
        result.data.forEach((projeto: Projeto) => {
          if (!projetosMap.has(projeto.id)) {
            projetosMap.set(projeto.id, projeto)
            if (projeto.cliente_principal_id) {
              clienteIdsSet.add(projeto.cliente_principal_id)
            }
          }
        })
        projetosData = Array.from(projetosMap.values())
      }

      if (result.type === 'cobrancas' && result.data) {
        // Usar Map para garantir deduplicação eficiente por ID
        const cobrancasMap = new Map<string, Cobranca>()
        result.data.forEach((cobranca: Cobranca) => {
          if (!cobrancasMap.has(cobranca.id)) {
            cobrancasMap.set(cobranca.id, cobranca)
          }
        })
        const uniqueCobrancas = Array.from(cobrancasMap.values())

        uniqueCobrancas.forEach((cobranca) => {
          // Ocultar cobranças que já foram pagas
          if (cobranca.status === 'pago') {
            return
          }
          
          if (cobranca.data_vencimento && !eventIds.has(`cobranca-${cobranca.id}`)) {
            const eventDate = parseDateForCalendar(cobranca.data_vencimento)
            if (eventDate) {
              eventIds.add(`cobranca-${cobranca.id}`)
              allEvents.push({
                id: cobranca.id,
                title: cobranca.descricao || 'Cobrança',
                date: eventDate,
                type: 'cobranca',
                color: '#D97706',
                data: cobranca,
              })
            }
          }
        })
      }
    }

    // Buscar clientes dos projetos em uma única query (se necessário)
    if (projetosData.length > 0 && clienteIdsSet.size > 0) {
      const clienteIds = Array.from(clienteIdsSet)
      const { data: clientes } = await supabase
        .from('clientes')
        .select('*')
        .in('id', clienteIds)

      const clientesMap = new Map(
        (clientes || []).map(cliente => [cliente.id, cliente])
      )

      // Buscar lançamentos financeiros relacionados aos projetos para verificar status_servico
      const projetoIds = projetosData.map(p => p.id)
      const { data: lancamentosProjetos } = await supabase
        .from('financeiro_lancamentos')
        .select('projeto_id, status_servico')
        .in('projeto_id', projetoIds)
        .not('projeto_id', 'is', null)
      
      // Criar mapa de projeto_id -> status_servico (pegar o primeiro status encontrado)
      const projetoStatusMap = new Map<string, string>()
      lancamentosProjetos?.forEach(l => {
        if (l.projeto_id && l.status_servico && !projetoStatusMap.has(l.projeto_id)) {
          projetoStatusMap.set(l.projeto_id, l.status_servico)
        }
      })
      
      projetosData.forEach((projeto) => {
        // Ocultar projetos que estão na coluna finalizado do kanban
        const statusServico = projetoStatusMap.get(projeto.id)
        if (projetosColunaFinalizadoId && statusServico === projetosColunaFinalizadoId) {
          return
        }
        
        // Também ocultar projetos com status 'concluido' (fallback)
        if (projeto.status === 'concluido') {
          return
        }
        
        if (projeto.data_fim_prevista && !eventIds.has(`projeto-${projeto.id}`)) {
          const eventDate = parseDateForCalendar(projeto.data_fim_prevista)
          if (eventDate) {
            eventIds.add(`projeto-${projeto.id}`)
            const projetoComCliente: Projeto = {
              ...projeto,
              clientes: clientesMap.get(projeto.cliente_principal_id) || null
            }
            allEvents.push({
              id: projeto.id,
              title: projeto.nome,
              date: eventDate,
              type: 'projeto',
              color: '#059669',
              data: projetoComCliente,
            })
          }
        }
      })
    }

    // Garantir que não há eventos duplicados no array final
    // Usar uma chave única combinando tipo, id e timestamp da data para evitar duplicatas
    const uniqueEventsMap = new Map<string, CalendarEvent>()
    allEvents.forEach((event) => {
      const uniqueKey = `${event.type}-${event.id}-${event.date.getTime()}`
      if (!uniqueEventsMap.has(uniqueKey)) {
        uniqueEventsMap.set(uniqueKey, event)
      }
    })
    const uniqueEvents = Array.from(uniqueEventsMap.values())

    setEvents(uniqueEvents)
    setLoading(false)
    isLoadingRef.current = false
  }, [filters])

  useEffect(() => {
    loadEvents()
  }, [currentDate, loadEvents])

  const handleDateChange = (newDate: Date) => {
    setCurrentDate(newDate)
  }

  const handlePrevPeriod = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'daily') {
      newDate.setDate(newDate.getDate() - 1)
    } else if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setMonth(newDate.getMonth() - 1)
    }
    setCurrentDate(newDate)
  }

  const handleNextPeriod = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'daily') {
      newDate.setDate(newDate.getDate() + 1)
    } else if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const getPeriodLabel = () => {
    if (viewMode === 'daily') {
      return formatDate(currentDate.toISOString())
    } else if (viewMode === 'weekly') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }) // Segunda-feira
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
      return `${formatDate(weekStart.toISOString())} - ${formatDate(weekEnd.toISOString())}`
    } else {
      return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    }
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar */}
      <CalendarSidebar
        currentDate={currentDate}
        onDateChange={handleDateChange}
        viewMode={viewMode}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-4 ${viewMode === 'daily' ? 'flex-1 justify-center' : ''}`}>
              <button
                onClick={handlePrevPeriod}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h2 className={`text-xl font-semibold text-gray-900 ${viewMode === 'daily' ? 'text-center' : 'min-w-[200px]'}`}>
                {getPeriodLabel()}
              </h2>
              <button
                onClick={handleNextPeriod}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('daily')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'daily'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Diário
                </button>
                <button
                  onClick={() => setViewMode('weekly')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'weekly'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Semanal
                </button>
                <button
                  onClick={() => setViewMode('monthly')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'monthly'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Mensal
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Carregando eventos...</div>
            </div>
          ) : (
            <CalendarView
              currentDate={currentDate}
              viewMode={viewMode}
              events={events}
            />
          )}
        </div>
      </div>
    </div>
  )
}

