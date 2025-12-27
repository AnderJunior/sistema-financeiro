'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Search, Bell, User, Settings, HelpCircle, LogOut } from 'lucide-react'
import { NotificationsDropdown } from './NotificationsDropdown'
import { HelpModal } from './modals/HelpModal'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

type Cliente = Database['public']['Tables']['clientes']['Row']

export function TopBar() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false)
  const [notificationsCount, setNotificationsCount] = useState(0)
  const [searchResults, setSearchResults] = useState<Cliente[]>([])
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [userName, setUserName] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [loadingUserData, setLoadingUserData] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { user, signOut } = useAuth()

  useEffect(() => {
    // Carregar contagem inicial
    loadNotificationsCount()
    
    // OTIMIZADO: Usar Realtime subscription em vez de polling
    const supabase = createClient()
    const channel = supabase
      .channel('topbar_notifications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificacoes_log',
        },
        () => {
          // Atualizar contagem quando houver mudanças
          loadNotificationsCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Buscar clientes enquanto digita
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setIsSearchOpen(false)
      return
    }

    const timeoutId = setTimeout(() => {
      searchClientes(searchQuery.trim())
    }, 300) // Debounce de 300ms

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const loadUserData = useCallback(async () => {
    if (!user) {
      setUserName('')
      setUserEmail('')
      setLoadingUserData(false)
      return
    }

    setLoadingUserData(true)
    
    try {
      const supabase = createClient()
      
      // Buscar informações do assinante (nome e email)
      // 1) Tenta por user_id (fluxo padrão quando o registro já está vinculado ao usuário do Supabase)
      // 2) Se não encontrar e houver email, tenta por email (útil quando o registro ainda não tem user_id preenchido)
      const { data: assinantePorUserId, error: assinantePorUserIdError } = await supabase
        .from('assinantes')
        .select('nome_usuario, email, user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      let assinante = assinantePorUserId
      let assinanteError = assinantePorUserIdError

      if (!assinante && !assinanteError && user.email) {
        const { data: assinantePorEmail, error: assinantePorEmailError } = await supabase
          .from('assinantes')
          .select('nome_usuario, email, user_id')
          .eq('email', user.email)
          .maybeSingle()
        assinante = assinantePorEmail
        assinanteError = assinantePorEmailError
      }

      if (assinanteError) {
        console.error('Erro ao buscar assinante no TopBar:', assinanteError)
        // Fallback para email do auth
        const nomeMeta = (user.user_metadata as any)?.nome_completo || (user.user_metadata as any)?.nome || (user.user_metadata as any)?.name
        setUserName(nomeMeta || user.email?.split('@')[0] || 'Usuário')
        setUserEmail(user.email || '')
        setLoadingUserData(false)
        return
      }

      if (assinante) {
        // Usar dados da tabela assinantes
        const nomeMeta = (user.user_metadata as any)?.nome_completo || (user.user_metadata as any)?.nome || (user.user_metadata as any)?.name
        setUserName(assinante.nome_usuario || nomeMeta || user.email?.split('@')[0] || 'Usuário')
        setUserEmail(assinante.email || user.email || '')
      } else {
        // Se não encontrar na tabela assinantes, usar email do auth
        const nomeMeta = (user.user_metadata as any)?.nome_completo || (user.user_metadata as any)?.nome || (user.user_metadata as any)?.name
        setUserName(nomeMeta || user.email?.split('@')[0] || 'Usuário')
        setUserEmail(user.email || '')
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário no TopBar:', error)
      // Fallback para email do auth
      const nomeMeta = (user.user_metadata as any)?.nome_completo || (user.user_metadata as any)?.nome || (user.user_metadata as any)?.name
      setUserName(nomeMeta || user.email?.split('@')[0] || 'Usuário')
      setUserEmail(user.email || '')
    } finally {
      setLoadingUserData(false)
    }
  }, [user])

  // Pré-carregar dados do usuário assim que o `user` estiver disponível
  useEffect(() => {
    if (user) {
      loadUserData()
    } else {
      // Limpar dados quando usuário não estiver disponível
      setUserName('')
      setUserEmail('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Recarregar dados do usuário quando o modal abrir
  useEffect(() => {
    if (isUserMenuOpen && user) {
      loadUserData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUserMenuOpen])

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    if (isSearchOpen || isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSearchOpen, isUserMenuOpen])

  async function searchClientes(query: string) {
    if (query.length < 2) {
      setSearchResults([])
      setIsSearchOpen(false)
      return
    }

    setIsSearching(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, email, telefone, tipo_pessoa, status')
        .ilike('nome', `%${query}%`)
        .order('nome', { ascending: true })
        .limit(10)

      if (error) {
        console.error('Erro ao buscar clientes:', error)
        setSearchResults([])
      } else {
        setSearchResults(data || [])
        setIsSearchOpen(data && data.length > 0)
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setSearchQuery(value)
    if (value.trim().length >= 2) {
      setIsSearchOpen(true)
    }
  }

  function handleSelectCliente(clienteId: string) {
    setSearchQuery('')
    setSearchResults([])
    setIsSearchOpen(false)
    router.push(`/clientes/${clienteId}`)
  }

  async function loadNotificationsCount() {
    const supabase = createClient()
    const agora = new Date()
    const ultimas48Horas = new Date(agora.getTime() - 48 * 60 * 60 * 1000)

    try {
      // Contar notificações não lidas das últimas 48 horas
      const { count, error } = await supabase
        .from('notificacoes_log')
        .select('*', { count: 'exact', head: true })
        .eq('lida', false)
        .gte('data_referencia', ultimas48Horas.toISOString())
        .lte('data_referencia', agora.toISOString())

      if (error) {
        console.error('Erro ao carregar contagem de notificações:', error)
        return
      }

      setNotificationsCount(count || 0)
    } catch (error) {
      console.error('Erro ao carregar contagem de notificações:', error)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-6 sticky top-0 z-50">
      {/* Barra de busca */}
      <div className="flex-1 max-w-md relative border border-gray-200 rounded-lg" ref={searchRef}>
        <div className="relative">
          <input
            type="search"
            placeholder="Procure o seu cliente..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => {
              if (searchResults.length > 0) {
                setIsSearchOpen(true)
              }
            }}
            className="w-full bg-gray-100 rounded-lg px-4 py-2.5 pl-10 pr-10 text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Dropdown de resultados */}
        {isSearchOpen && searchResults.length > 0 && (
          <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
            <div className="py-2">
              {searchResults.map((cliente) => (
                <button
                  key={cliente.id}
                  onClick={() => handleSelectCliente(cliente.id)}
                  className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left flex items-center gap-3"
                >
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {cliente.nome}
                    </p>
                    {cliente.email && (
                      <p className="text-xs text-gray-500 truncate">
                        {cliente.email}
                      </p>
                    )}
                    {cliente.telefone && (
                      <p className="text-xs text-gray-500">
                        {cliente.telefone}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded ${
                      cliente.status === 'em_andamento' 
                        ? 'bg-green-100 text-green-800'
                        : cliente.status === 'finalizado'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {cliente.status === 'em_andamento' ? 'Ativo' : 
                       cliente.status === 'finalizado' ? 'Finalizado' : 'A iniciar'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {isSearchOpen && searchQuery.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
          <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-4 px-4 text-center text-sm text-gray-500">
            Nenhum cliente encontrado
          </div>
        )}
      </div>

      {/* Ícone de notificações e usuário */}
      <div className="flex items-center gap-2">
        <div className="flex items-center relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-700" />
            {notificationsCount > 0 && (
              <span className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {notificationsCount > 99 ? '99+' : notificationsCount}
              </span>
            )}
          </button>
          
          <NotificationsDropdown
            isOpen={isNotificationsOpen}
            onClose={() => setIsNotificationsOpen(false)}
          />
        </div>

        <div className="flex items-center relative">
          <button
            onClick={async () => {
              if (!isUserMenuOpen) {
                // Abrir o modal primeiro
                setIsUserMenuOpen(true)
                // Carregar dados após abrir (o useEffect também vai chamar, mas isso garante)
                if (user) {
                  await loadUserData()
                }
              } else {
                setIsUserMenuOpen(false)
              }
            }}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Usuário"
          >
            <User className="w-5 h-5 text-gray-700" />
          </button>

          {/* Dropdown do menu do usuário */}
          {isUserMenuOpen && (
            <div
              ref={userMenuRef}
              className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
            >
              {/* Parte superior - Informações do usuário */}
              <div className="px-4 py-4">
                {loadingUserData ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs text-gray-500">Carregando...</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-900">
                      {userName || 'Usuário'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {userEmail || user?.email || ''}
                    </p>
                  </>
                )}
              </div>

              {/* Divisor */}
              <div className="border-t border-gray-200"></div>

              {/* Parte inferior - Opções do menu */}
              <div className="py-2">
                <button
                  onClick={() => {
                    router.push('/configuracoes')
                    setIsUserMenuOpen(false)
                  }}
                  className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left flex items-center gap-3"
                >
                  <Settings className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-700">Minha Conta</span>
                </button>

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    setIsHelpModalOpen(true)
                  }}
                  className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left flex items-center gap-3"
                >
                  <HelpCircle className="w-5 h-5 text-gray-600" />
                  <span className="text-sm text-gray-700">Ajuda</span>
                </button>

                <button
                  onClick={async () => {
                    setIsUserMenuOpen(false)
                    try {
                      await signOut()
                    } catch (error) {
                      console.error('Erro ao fazer logout:', error)
                      // Forçar redirecionamento mesmo em caso de erro
                      window.location.href = '/login'
                    }
                  }}
                  className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left flex items-center gap-3"
                >
                  <LogOut className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-red-600">Sair</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Ajuda */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </header>
  )
}

