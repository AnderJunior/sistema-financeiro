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

type Projeto = Database['public']['Tables']['projetos']['Row']

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

    // Buscar tarefas
    if (filters.tarefas) {
      const { data: tarefas } = await supabase
        .from('tarefas')
        .select(`
          *,
          clientes (*),
          projetos (*)
        `)
        .not('data_vencimento', 'is', null)

      if (tarefas) {
        // Remover duplicatas baseado no ID antes de processar
        const uniqueTarefas = tarefas.reduce((acc: Tarefa[], current: Tarefa) => {
          const exists = acc.find((item) => item.id === current.id)
          if (!exists) {
            acc.push(current as Tarefa)
          }
          return acc
        }, [])

        uniqueTarefas.forEach((tarefa) => {
          if (tarefa.data_vencimento && !eventIds.has(`tarefa-${tarefa.id}`)) {
            const eventDate = parseDateForCalendar(tarefa.data_vencimento)
            if (eventDate) {
              eventIds.add(`tarefa-${tarefa.id}`)
              allEvents.push({
                id: tarefa.id,
                title: tarefa.nome,
                date: eventDate,
                type: 'tarefa',
                color: '#2563EB', // Azul mais vibrante para tarefas
                data: tarefa,
              })
            }
          }
        })
      }
    }

    // Buscar projetos
    if (filters.projetos) {
      const { data: projetos } = await supabase
        .from('projetos')
        .select('*')
        .not('data_fim_prevista', 'is', null)

      if (projetos) {
        // Remover duplicatas baseado no ID antes de processar
        const uniqueProjetos = projetos.reduce((acc: Projeto[], current: Projeto) => {
          const exists = acc.find((item) => item.id === current.id)
          if (!exists) {
            acc.push(current)
          }
          return acc
        }, [])

        uniqueProjetos.forEach((projeto) => {
          if (projeto.data_fim_prevista && !eventIds.has(`projeto-${projeto.id}`)) {
            const eventDate = parseDateForCalendar(projeto.data_fim_prevista)
            if (eventDate) {
              eventIds.add(`projeto-${projeto.id}`)
              allEvents.push({
                id: projeto.id,
                title: projeto.nome,
                date: eventDate,
                type: 'projeto',
                color: '#059669', // Verde mais vibrante para projetos
                data: projeto,
              })
            }
          }
        })
      }
    }

    // Buscar cobranças
    if (filters.cobrancas) {
      const { data: cobrancas } = await supabase
        .from('financeiro_lancamentos')
        .select(`
          *,
          clientes (*),
          servicos (*)
        `)
        .eq('tipo', 'entrada')
        .not('data_vencimento', 'is', null)

      if (cobrancas) {
        // Remover duplicatas baseado no ID antes de processar
        const uniqueCobrancas = cobrancas.reduce((acc: Cobranca[], current: Cobranca) => {
          const exists = acc.find((item) => item.id === current.id)
          if (!exists) {
            acc.push(current)
          }
          return acc
        }, [])

        uniqueCobrancas.forEach((cobranca) => {
          if (cobranca.data_vencimento && !eventIds.has(`cobranca-${cobranca.id}`)) {
            const eventDate = parseDateForCalendar(cobranca.data_vencimento)
            if (eventDate) {
              eventIds.add(`cobranca-${cobranca.id}`)
              allEvents.push({
                id: cobranca.id,
                title: cobranca.descricao || 'Cobrança',
                date: eventDate,
                type: 'cobranca',
                color: '#D97706', // Laranja mais vibrante para cobranças
                data: cobranca,
              })
            }
          }
        })
      }
    }

    // Garantir que não há eventos duplicados no array final
    const uniqueEvents = allEvents.reduce((acc: CalendarEvent[], current: CalendarEvent) => {
      const exists = acc.find((item) => item.id === current.id && item.type === current.type)
      if (!exists) {
        acc.push(current)
      }
      return acc
    }, [])

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

