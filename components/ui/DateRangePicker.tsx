'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  startOfWeek, 
  endOfWeek,
  startOfDay,
  endOfDay,
  isAfter,
  isBefore,
  startOfToday,
  subDays,
  subMonths as dateFnsSubMonths
} from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'
import { cn } from '@/lib/utils'

interface DateRangePickerProps {
  value?: { start: Date | null; end: Date | null }
  onChange?: (range: { start: Date | null; end: Date | null }) => void
  className?: string
}

type PresetType = 'thisWeek' | 'last7Days' | 'thisMonth' | 'last30Days' | 'lastMonth' | 'custom' | null

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(value?.start || new Date())
  const [selectedStart, setSelectedStart] = useState<Date | null>(value?.start || null)
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(value?.end || null)
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<PresetType>(null)
  const [dropdownPosition, setDropdownPosition] = useState<'left' | 'right'>('left')
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) {
      setSelectedStart(value.start)
      setSelectedEnd(value.end)
      if (value.start) {
        setCurrentMonth(value.start)
      }
    }
  }, [value])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setHoveredDate(null)
      }
    }

    function calculatePosition() {
      if (!containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const dropdownWidth = Math.min(520, window.innerWidth - 32) // Largura máxima com margem
      const viewportWidth = window.innerWidth
      const spaceOnRight = viewportWidth - containerRect.right
      const spaceOnLeft = containerRect.left
      const padding = 16 // Padding de segurança

      // Se não há espaço suficiente à direita (com margem), alinhar à direita do botão
      if (spaceOnRight < dropdownWidth + padding && spaceOnLeft > spaceOnRight) {
        setDropdownPosition('right')
      } else {
        setDropdownPosition('left')
      }
    }

    if (isOpen) {
      // Pequeno delay para garantir que o DOM esteja atualizado
      setTimeout(() => {
        calculatePosition()
      }, 0)
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('resize', calculatePosition)
      window.addEventListener('scroll', calculatePosition, true)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
        window.removeEventListener('resize', calculatePosition)
        window.removeEventListener('scroll', calculatePosition, true)
      }
    }
  }, [isOpen])

  const formatDateRange = () => {
    if (selectedStart && selectedEnd) {
      return `${format(selectedStart, 'dd MMM yyyy', { locale: ptBR })} - ${format(selectedEnd, 'dd MMM yyyy', { locale: ptBR })}`
    }
    if (selectedStart) {
      return `${format(selectedStart, 'dd MMM yyyy', { locale: ptBR })} - ...`
    }
    return 'Selecione o período'
  }

  const handleDateClick = (date: Date) => {
    const normalizedDate = startOfDay(date)
    
    // Se não há seleção inicial ou já há um range completo, começar nova seleção
    if (!selectedStart || (selectedStart && selectedEnd)) {
      setSelectedStart(normalizedDate)
      setSelectedEnd(null)
      setHoveredDate(null)
      setSelectedPreset('custom')
    } else {
      // Se já há uma data inicial, definir a data final
      if (isBefore(normalizedDate, selectedStart)) {
        // Se a data clicada é anterior à inicial, trocar
        setSelectedEnd(selectedStart)
        setSelectedStart(normalizedDate)
      } else {
        setSelectedEnd(normalizedDate)
      }
      setHoveredDate(null)
      setSelectedPreset('custom')
    }
  }

  useEffect(() => {
    if (onChange) {
      onChange({ start: selectedStart, end: selectedEnd })
    }
  }, [selectedStart, selectedEnd, onChange])

  const getRangeStart = () => {
    if (!selectedStart) return null
    if (selectedStart && selectedEnd) {
      return selectedStart < selectedEnd ? selectedStart : selectedEnd
    }
    if (hoveredDate && selectedStart) {
      return hoveredDate < selectedStart ? hoveredDate : selectedStart
    }
    return selectedStart
  }

  const getRangeEnd = () => {
    if (selectedStart && selectedEnd) {
      return selectedStart < selectedEnd ? selectedEnd : selectedStart
    }
    if (hoveredDate && selectedStart && !selectedEnd) {
      return hoveredDate > selectedStart ? hoveredDate : selectedStart
    }
    return null
  }

  const isInRange = (date: Date) => {
    const rangeStart = getRangeStart()
    const rangeEnd = getRangeEnd()
    
    if (!rangeStart) return false
    if (!rangeEnd) return false
    
    const normalizedDate = startOfDay(date)
    const normalizedStart = startOfDay(rangeStart)
    const normalizedEnd = startOfDay(rangeEnd)
    
    return (
      (isAfter(normalizedDate, normalizedStart) || isSameDay(normalizedDate, normalizedStart)) &&
      (isBefore(normalizedDate, normalizedEnd) || isSameDay(normalizedDate, normalizedEnd)) &&
      !isStartDate(date) &&
      !isEndDate(date)
    )
  }

  const isStartDate = (date: Date) => {
    const rangeStart = getRangeStart()
    return rangeStart ? isSameDay(date, rangeStart) : false
  }

  const isEndDate = (date: Date) => {
    const rangeEnd = getRangeEnd()
    return rangeEnd ? isSameDay(date, rangeEnd) : false
  }

  const handlePreset = (preset: PresetType) => {
    if (preset === 'custom') {
      setSelectedPreset('custom')
      return
    }

    const today = startOfToday()
    let start: Date
    let end: Date

    switch (preset) {
      case 'thisWeek':
        start = startOfWeek(today, { weekStartsOn: 0 }) // Domingo
        end = endOfDay(today)
        break
      case 'last7Days':
        start = startOfDay(subDays(today, 6))
        end = endOfDay(today)
        break
      case 'thisMonth':
        start = startOfMonth(today)
        end = endOfDay(today)
        break
      case 'last30Days':
        start = startOfDay(subDays(today, 29))
        end = endOfDay(today)
        break
      case 'lastMonth':
        const lastMonth = dateFnsSubMonths(today, 1)
        start = startOfMonth(lastMonth)
        end = endOfMonth(lastMonth)
        break
      default:
        return
    }

    setSelectedStart(start)
    setSelectedEnd(end)
    setSelectedPreset(preset)
    setCurrentMonth(start)
    if (onChange) {
      onChange({ start, end })
    }
  }

  const handleSelect = () => {
    if (selectedStart && selectedEnd) {
      setIsOpen(false)
      setHoveredDate(null)
    }
  }

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }) // Domingo
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

  // Verificar qual preset corresponde ao range atual
  useEffect(() => {
    if (selectedStart && selectedEnd) {
      const today = startOfToday()
      const start = startOfDay(selectedStart)
      const end = endOfDay(selectedEnd)
      
      // Esta Semana
      const thisWeekStart = startOfWeek(today, { weekStartsOn: 0 })
      if (isSameDay(start, thisWeekStart) && isSameDay(end, today)) {
        setSelectedPreset('thisWeek')
        return
      }
      
      // Últimos 7 Dias
      const last7DaysStart = startOfDay(subDays(today, 6))
      if (isSameDay(start, last7DaysStart) && isSameDay(end, today)) {
        setSelectedPreset('last7Days')
        return
      }
      
      // Este Mês
      const thisMonthStart = startOfMonth(today)
      if (isSameDay(start, thisMonthStart) && isSameDay(end, today)) {
        setSelectedPreset('thisMonth')
        return
      }
      
      // Últimos 30 Dias
      const last30DaysStart = startOfDay(subDays(today, 29))
      if (isSameDay(start, last30DaysStart) && isSameDay(end, today)) {
        setSelectedPreset('last30Days')
        return
      }
      
      // Último Mês
      const lastMonth = dateFnsSubMonths(today, 1)
      const lastMonthStart = startOfMonth(lastMonth)
      const lastMonthEnd = endOfMonth(lastMonth)
      if (isSameDay(start, lastMonthStart) && isSameDay(end, lastMonthEnd)) {
        setSelectedPreset('lastMonth')
        return
      }
      
      setSelectedPreset('custom')
    } else {
      setSelectedPreset(null)
    }
  }, [selectedStart, selectedEnd])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
      >
        <Calendar className="w-4 h-4" />
        <span>{formatDateRange()}</span>
      </button>

      {isOpen && (
        <div 
          ref={dropdownRef}
          className={cn(
            'absolute top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-50',
            dropdownPosition === 'left' ? 'left-0' : 'right-0'
          )}
          style={{
            width: '520px',
            maxWidth: `min(520px, calc(100vw - 2rem))`
          }}
        >
          <div className="p-5">
            {/* Presets Section */}
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-3">Mostrar Relatórios para</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handlePreset('thisWeek')}
                  className={cn(
                    'px-4 py-2 text-sm rounded-lg border transition-colors',
                    selectedPreset === 'thisWeek'
                      ? 'bg-blue-600 text-white border-blue-600 font-medium'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  )}
                >
                  Esta Semana
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('last7Days')}
                  className={cn(
                    'px-4 py-2 text-sm rounded-lg border transition-colors',
                    selectedPreset === 'last7Days'
                      ? 'bg-blue-600 text-white border-blue-600 font-medium'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  )}
                >
                  Últimos 7 Dias
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('thisMonth')}
                  className={cn(
                    'px-4 py-2 text-sm rounded-lg border transition-colors',
                    selectedPreset === 'thisMonth'
                      ? 'bg-blue-600 text-white border-blue-600 font-medium'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  )}
                >
                  Este Mês
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('last30Days')}
                  className={cn(
                    'px-4 py-2 text-sm rounded-lg border transition-colors',
                    selectedPreset === 'last30Days'
                      ? 'bg-blue-600 text-white border-blue-600 font-medium'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  )}
                >
                  Últimos 30 Dias
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('lastMonth')}
                  className={cn(
                    'px-4 py-2 text-sm rounded-lg border transition-colors',
                    selectedPreset === 'lastMonth'
                      ? 'bg-blue-600 text-white border-blue-600 font-medium'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  )}
                >
                  Último Mês
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset('custom')}
                  className={cn(
                    'px-4 py-2 text-sm rounded-lg border transition-colors',
                    selectedPreset === 'custom'
                      ? 'bg-blue-600 text-white border-blue-600 font-medium'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  )}
                >
                  Personalizado
                </button>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-gray-200 my-4"></div>

            {/* Calendar Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h3 className="text-base font-bold text-gray-900 capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </h3>
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Calendar Days Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="text-xs font-medium text-gray-500 text-center py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {days.map((day) => {
                const isCurrentMonthDay = isSameMonth(day, currentMonth)
                const isRange = isInRange(day)
                const isStart = isStartDate(day)
                const isEnd = isEndDate(day)
                const isToday = isSameDay(day, new Date())
                const isHoveredEnd = hoveredDate && isSameDay(day, hoveredDate) && selectedStart && !selectedEnd

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleDateClick(day)}
                    onMouseEnter={() => {
                      if (selectedStart && !selectedEnd) {
                        setHoveredDate(day)
                      }
                    }}
                    onMouseLeave={() => {
                      if (selectedStart && !selectedEnd) {
                        setHoveredDate(null)
                      }
                    }}
                    className={cn(
                      'w-9 h-9 text-sm rounded-lg transition-colors flex items-center justify-center relative',
                      !isCurrentMonthDay && 'text-gray-300',
                      isCurrentMonthDay && !isRange && !isStart && !isEnd && !isHoveredEnd && 'text-gray-700 hover:bg-gray-100',
                      isRange && 'bg-blue-50 text-gray-700',
                      isStart && 'bg-blue-600 text-white font-semibold rounded-full',
                      isEnd && 'bg-blue-600 text-white font-semibold rounded-full',
                      isHoveredEnd && 'bg-blue-50 text-gray-700 ring-2 ring-green-400 ring-offset-1 rounded-full',
                      isToday && !isStart && !isEnd && !isRange && 'text-blue-600 font-semibold'
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                )
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleSelect}
                disabled={!selectedStart || !selectedEnd}
                className={cn(
                  'px-6 py-2 text-sm rounded transition-colors font-medium',
                  selectedStart && selectedEnd
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
              >
                SELECIONAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
