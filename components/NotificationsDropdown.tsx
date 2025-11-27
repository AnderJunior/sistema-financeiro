'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import { useRouter } from 'next/navigation'

type Notificacao = Database['public']['Tables']['notificacoes_log']['Row']

interface NotificationsDropdownProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationsDropdown({ isOpen, onClose }: NotificationsDropdownProps) {
  const [notifications, setNotifications] = useState<Notificacao[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  async function loadNotifications() {
    setLoading(true)
    const supabase = createClient()
    const agora = new Date()
    const ultimas48Horas = new Date(agora.getTime() - 48 * 60 * 60 * 1000)

    try {
      const { data, error } = await supabase
        .from('notificacoes_log')
        .select('*')
        .gte('data_referencia', ultimas48Horas.toISOString())
        .lte('data_referencia', agora.toISOString())
        .order('data_referencia', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Erro ao carregar notificações:', error)
        setNotifications([])
      } else {
        setNotifications(data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar notificações:', error)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  async function markAsRead(notificacaoId: string) {
    const supabase = createClient()
    
    try {
      const { error } = await supabase
        .from('notificacoes_log')
        .update({ lida: true })
        .eq('id', notificacaoId)

      if (error) {
        console.error('Erro ao marcar notificação como lida:', error)
      } else {
        // Atualizar estado local
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificacaoId ? { ...notif, lida: true } : notif
          )
        )
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
    }
  }

  async function markAllAsRead() {
    const supabase = createClient()
    const agora = new Date()
    const ultimas48Horas = new Date(agora.getTime() - 48 * 60 * 60 * 1000)

    try {
      const { error } = await supabase
        .from('notificacoes_log')
        .update({ lida: true })
        .gte('data_referencia', ultimas48Horas.toISOString())
        .lte('data_referencia', agora.toISOString())
        .eq('lida', false)

      if (error) {
        console.error('Erro ao marcar todas as notificações como lidas:', error)
      } else {
        // Atualizar estado local
        setNotifications(prev => prev.map(notif => ({ ...notif, lida: true })))
      }
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error)
    }
  }

  function handleNotificationClick(notificacao: Notificacao) {
    if (!notificacao.lida) {
      markAsRead(notificacao.id)
    }
    
    if (notificacao.link) {
      router.push(notificacao.link)
      onClose()
    }
  }

  if (!isOpen) return null

  const unreadCount = notifications.filter(n => !n.lida).length

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] flex flex-col"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Notificações
          {unreadCount > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-500">
              ({unreadCount} não lidas)
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Marcar todas como lidas
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Lista de notificações */}
      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Carregando...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Nenhuma notificação nas últimas 48 horas
          </div>
        ) : (
          <div className="py-2">
            {notifications.map((notificacao) => (
              <button
                key={notificacao.id}
                onClick={() => handleNotificationClick(notificacao)}
                className={`w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-b-0 ${
                  !notificacao.lida ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 mt-0.5 ${
                    !notificacao.lida ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    <Bell className={`w-4 h-4 ${!notificacao.lida ? 'fill-current' : ''}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${
                        !notificacao.lida ? 'text-gray-900' : 'text-gray-600'
                      }`}>
                        {notificacao.titulo}
                      </p>
                      {!notificacao.lida && (
                        <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1.5"></span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {notificacao.descricao}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(notificacao.data_referencia).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
