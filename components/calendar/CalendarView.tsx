'use client'

import { CalendarEvent } from '@/app/tarefas/calendario/page'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, eachWeekOfInterval, startOfDay, addHours } from 'date-fns'
import ptBR from 'date-fns/locale/pt-BR'

interface CalendarViewProps {
  currentDate: Date
  viewMode: 'daily' | 'weekly' | 'monthly'
  events: CalendarEvent[]
}

export function CalendarView({ currentDate, viewMode, events }: CalendarViewProps) {
  if (viewMode === 'daily') {
    return <DailyView date={currentDate} events={events} />
  } else if (viewMode === 'weekly') {
    return <WeeklyView date={currentDate} events={events} />
  } else {
    return <MonthlyView date={currentDate} events={events} />
  }
}

function DailyView({ date, events }: { date: Date; events: CalendarEvent[] }) {
  const dayEvents = events.filter((event) => isSameDay(event.date, date))
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {hours.map((hour) => {
            const hourStart = addHours(startOfDay(date), hour)
            const hourEvents = dayEvents.filter((event) => {
              const eventHour = event.date.getHours()
              return eventHour === hour || (eventHour === hour - 1 && event.date.getMinutes() > 0)
            })

            return (
              <div key={hour} className="flex min-h-[80px]">
                <div className="w-24 px-4 py-2 text-sm text-gray-500 border-r border-gray-200">
                  {format(hourStart, 'HH:mm')}
                </div>
                <div className="flex-1 px-4 py-2">
                  {hourEvents.map((event) => {
                    const typeLabels = {
                      tarefa: 'Tarefa',
                      projeto: 'Projeto',
                      cobranca: 'Cobrança'
                    }
                    return (
                      <div
                        key={`${event.type}-${event.id}-${event.date.getTime()}`}
                        className="mb-2 p-3 rounded-lg text-sm"
                        style={{
                          backgroundColor: `${event.color}20`,
                          borderLeft: `4px solid ${event.color}`,
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900">{event.title}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              {format(event.date, 'HH:mm')}
                            </div>
                          </div>
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
                            style={{
                              backgroundColor: `${event.color}30`,
                              color: event.color,
                            }}
                          >
                            {typeLabels[event.type]}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function WeeklyView({ date, events }: { date: Date; events: CalendarEvent[] }) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }) // Segunda-feira
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const isToday = (day: Date) => isSameDay(day, new Date())

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header com dias da semana */}
        <div className="grid grid-cols-8 border-b border-gray-200">
          <div className="p-3 border-r border-gray-200">
            <div className="text-xs text-gray-500">Horário</div>
          </div>
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={`p-3 text-center border-r border-gray-200 last:border-r-0 ${
                isToday(day) ? 'bg-primary-50' : ''
              }`}
            >
              <div className="text-xs text-gray-500 mb-1">
                {format(day, 'EEE', { locale: ptBR })}
              </div>
              <div
                className={`text-lg font-semibold ${
                  isToday(day) ? 'text-primary-600' : 'text-gray-900'
                }`}
              >
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Grid de horas */}
        <div className="divide-y divide-gray-200">
          {hours.map((hour) => {
            const hourStart = addHours(startOfDay(weekStart), hour)

            return (
              <div key={hour} className="grid grid-cols-8 min-h-[80px]">
                <div className="p-3 text-sm text-gray-500 border-r border-gray-200">
                  {format(hourStart, 'HH:mm')}
                </div>
                {weekDays.map((day) => {
                  const dayEvents = events.filter((event) => {
                    const eventHour = event.date.getHours()
                    return isSameDay(event.date, day) && (eventHour === hour || (eventHour === hour - 1 && event.date.getMinutes() > 0))
                  })

                  return (
                    <div
                      key={day.toISOString()}
                      className="p-2 border-r border-gray-200 last:border-r-0 min-h-[80px]"
                    >
                      {dayEvents.map((event) => {
                        const typeLabels = {
                          tarefa: 'Tarefa',
                          projeto: 'Projeto',
                          cobranca: 'Cobrança'
                        }
                        return (
                          <div
                            key={`${event.type}-${event.id}-${event.date.getTime()}`}
                            className="mb-1 p-2 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity"
                            style={{
                              backgroundColor: `${event.color}25`,
                              borderLeft: `3px solid ${event.color}`,
                            }}
                            title={`${event.title} - ${typeLabels[event.type]}`}
                          >
                            <div className="font-medium text-gray-900 truncate">{event.title}</div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-gray-600">{format(event.date, 'HH:mm')}</span>
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                                style={{
                                  backgroundColor: `${event.color}30`,
                                  color: event.color,
                                }}
                              >
                                {typeLabels[event.type].charAt(0)}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MonthlyView({ date, events }: { date: Date; events: CalendarEvent[] }) {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 })

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header com dias da semana */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
            <div key={day} className="p-3 text-center text-sm font-semibold text-gray-700 border-r border-gray-200 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Semanas */}
        <div className="divide-y divide-gray-200">
          {weeks.map((weekStart) => {
            const weekDays = eachDayOfInterval({
              start: weekStart,
              end: endOfWeek(weekStart, { weekStartsOn: 1 }),
            })

            return (
              <div key={weekStart.toISOString()} className="grid grid-cols-7 min-h-[120px]">
                {weekDays.map((day) => {
                  const dayEvents = events.filter((event) => isSameDay(event.date, day))
                  const isCurrentMonth = day.getMonth() === date.getMonth()
                  const isToday = isSameDay(day, new Date())

                  return (
                    <div
                      key={day.toISOString()}
                      className={`p-2 border-r border-gray-200 last:border-r-0 min-h-[120px] ${
                        !isCurrentMonth ? 'bg-gray-50' : ''
                      } ${isToday ? 'bg-primary-50' : ''}`}
                    >
                      <div
                        className={`text-sm font-semibold mb-1 ${
                          isToday ? 'text-primary-600' : 'text-gray-900'
                        } ${!isCurrentMonth ? 'text-gray-400' : ''}`}
                      >
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event) => {
                          const typeLabels = {
                            tarefa: 'T',
                            projeto: 'P',
                            cobranca: 'C'
                          }
                          return (
                            <div
                              key={`${event.type}-${event.id}-${event.date.getTime()}`}
                              className="p-1.5 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity"
                              style={{
                                backgroundColor: `${event.color}25`,
                                borderLeft: `3px solid ${event.color}`,
                              }}
                              title={`${event.title} - ${event.type === 'tarefa' ? 'Tarefa' : event.type === 'projeto' ? 'Projeto' : 'Cobrança'}`}
                            >
                              <div className="flex items-center gap-1">
                                <div className="font-medium text-gray-900 truncate flex-1">{event.title}</div>
                                <span
                                  className="px-1 rounded text-[10px] font-bold flex-shrink-0"
                                  style={{
                                    backgroundColor: event.color,
                                    color: 'white',
                                  }}
                                >
                                  {typeLabels[event.type]}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-gray-500 px-1.5">
                            +{dayEvents.length - 3} mais
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

