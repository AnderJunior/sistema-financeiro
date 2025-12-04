'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'
import { Eye, Search, List, LayoutGrid, Package, Settings, Plus, Edit, Trash2, X, ChevronLeft, ChevronRight, GripVertical, Calendar, MoreVertical, Wallet } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useModal } from '@/contexts/ModalContext'
import { Modal } from '@/components/ui/Modal'

type Lancamento = Database['public']['Tables']['financeiro_lancamentos']['Row'] & {
  servicos?: Database['public']['Tables']['servicos']['Row']
  clientes?: Database['public']['Tables']['clientes']['Row']
  valorCobrancasAtivas?: number
  proximaDataVencimento?: string | null
}

type KanbanColuna = {
  id: string
  nome: string
  cor: string
  ordem: number
  status_servico: string | null
  ativo: boolean
}

type ViewMode = 'lista' | 'kanban'

interface ProjetosKanbanProps {
  projetos: Lancamento[]
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function ProjetosKanban({ projetos: initialProjetos, viewMode, onViewModeChange }: ProjetosKanbanProps) {
  const router = useRouter()
  const { alert, confirm } = useModal()
  const [projetos, setProjetos] = useState(initialProjetos)
  const [colunas, setColunas] = useState<KanbanColuna[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [draggedProjetoId, setDraggedProjetoId] = useState<string | null>(null)
  const [dragOverColunaId, setDragOverColunaId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isColunasModalOpen, setIsColunasModalOpen] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  // Buscar dados financeiros dos projetos apenas uma vez
  useEffect(() => {
    async function loadDadosFinanceiros() {
      const supabase = createClient()
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)

      const projetosComDados = await Promise.all(
        initialProjetos.map(async (projeto) => {
          // Se já tem dados financeiros, preservar
          if (projeto.valorCobrancasAtivas !== undefined) {
            return projeto
          }

          if (!projeto.cliente_id) {
            return {
              ...projeto,
              valorCobrancasAtivas: 0,
              proximaDataVencimento: null
            }
          }

          // Buscar valor das cobranças ativas (não pagas) deste projeto
          const { data: cobrancasAtivas } = await supabase
            .from('financeiro_lancamentos')
            .select('valor, data_vencimento')
            .eq('cliente_id', projeto.cliente_id)
            .eq('servico_id', projeto.servico_id)
            .eq('tipo', 'entrada')
            .neq('status', 'pago')

          const valorCobrancasAtivas = cobrancasAtivas?.reduce((sum, l) => sum + Number(l.valor || 0), 0) || 0

          // Buscar próxima data de vencimento
          const proximasCobrancas = cobrancasAtivas
            ?.filter(c => c.data_vencimento && new Date(c.data_vencimento) >= hoje)
            .sort((a, b) => {
              if (!a.data_vencimento || !b.data_vencimento) return 0
              return new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()
            })

          return {
            ...projeto,
            valorCobrancasAtivas,
            proximaDataVencimento: proximasCobrancas && proximasCobrancas.length > 0 
              ? proximasCobrancas[0].data_vencimento 
              : projeto.data_vencimento || null
          }
        })
      )

      setProjetos(projetosComDados)
    }

    if (initialProjetos.length > 0) {
      loadDadosFinanceiros()
    } else {
      setProjetos(initialProjetos)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Executar apenas uma vez na montagem

  // Sincronizar projetos quando initialProjetos mudar, preservando dados financeiros
  useEffect(() => {
    setProjetos(prevProjetos => {
      // Criar um mapa dos projetos atuais com seus dados financeiros
      const projetosComDadosFinanceiros = new Map(
        prevProjetos.map(p => {
          const key = `${p.servico_id}|||${p.cliente_id}`
          return [key, p]
        })
      )

      // Atualizar projetos mantendo dados financeiros quando possível
      return initialProjetos.map(projeto => {
        const key = `${projeto.servico_id}|||${projeto.cliente_id}`
        const projetoExistente = projetosComDadosFinanceiros.get(key)
        
        // Se já existe e tem dados financeiros, preservar
        if (projetoExistente && projetoExistente.valorCobrancasAtivas !== undefined) {
          return {
            ...projeto,
            valorCobrancasAtivas: projetoExistente.valorCobrancasAtivas,
            proximaDataVencimento: projetoExistente.proximaDataVencimento
          }
        }
        
        return projeto
      })
    })
  }, [initialProjetos])

  // Função para obter inicial do nome
  const getInicial = (nome: string) => {
    return nome.charAt(0).toUpperCase()
  }

  // Função para obter cor do avatar baseado no nome
  const getAvatarColor = (nome: string) => {
    const cores = [
      'bg-green-100 text-green-800',
      'bg-blue-100 text-blue-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-yellow-100 text-yellow-800',
      'bg-indigo-100 text-indigo-800',
      'bg-red-100 text-red-800',
      'bg-teal-100 text-teal-800',
    ]
    const hash = nome.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return cores[hash % cores.length]
  }

  useEffect(() => {
    loadColunas()
  }, [])

  // Subscription realtime para atualizar projetos quando status_servico mudar
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('projetos_kanban_status_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'financeiro_lancamentos',
          filter: 'servico_id=not.is.null',
        },
        (payload) => {
          // Quando status_servico mudar, atualizar o projeto correspondente imediatamente
          const updatedLancamento = payload.new as any
          const oldLancamento = payload.old as any
          
          // Verificar se o status_servico realmente mudou
          if (updatedLancamento.status_servico !== oldLancamento?.status_servico) {
            if (updatedLancamento.id) {
              // Atualizar estado imediatamente usando o payload
              // Preservar dados financeiros existentes ao atualizar apenas o status
              setProjetos(prevProjetos => {
                // Atualizar apenas o lançamento específico pelo ID
                return prevProjetos.map(p =>
                  p.id === updatedLancamento.id
                    ? { ...p, status_servico: updatedLancamento.status_servico }
                    : p
                )
              })
            }
          }
        }
      )
      .subscribe()

    // Listener para eventos customizados de outros componentes
    const handleCustomEvent = (e: CustomEvent) => {
      const { lancamentoId, newStatus } = e.detail
      if (lancamentoId) {
        setProjetos(prevProjetos => 
          prevProjetos.map(p => 
            p.id === lancamentoId
              ? { ...p, status_servico: newStatus }
              : p
          )
        )
      }
    }

    window.addEventListener('projetoStatusChanged', handleCustomEvent as EventListener)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('projetoStatusChanged', handleCustomEvent as EventListener)
    }
  }, [])

  const checkScrollability = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  useEffect(() => {
    checkScrollability()
    const handleResize = () => checkScrollability()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [colunas, projetos])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      // Calcular largura de uma coluna (incluindo gap)
      // Cada coluna ocupa aproximadamente 1/3 da largura visível
      const containerWidth = scrollContainerRef.current.clientWidth
      // Largura de uma coluna = (largura do container - gaps) / 3
      // Gap total = 2 gaps de 1rem (16px) entre 3 colunas = 32px
      const scrollAmount = (containerWidth - 32) / 3 + 16 // Largura da coluna + gap
      const currentScroll = scrollContainerRef.current.scrollLeft
      const newScroll = direction === 'left' 
        ? Math.max(0, currentScroll - scrollAmount)
        : currentScroll + scrollAmount
      
      scrollContainerRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      })
    }
  }

  async function loadColunas() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('kanban_colunas')
      .select('*')
      .eq('ativo', true)
      .order('ordem', { ascending: true })

    if (!error && data) {
      setColunas(data as KanbanColuna[])
    }
  }

  const filteredProjetos = projetos.filter(projeto =>
    projeto.servicos?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    projeto.clientes?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    projeto.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Agrupar projetos por coluna usando o ID da coluna como status
  // Cada coluna tem seu próprio status único (ID da coluna)
  // Projetos aparecem apenas na coluna cujo ID corresponde ao seu status_servico
  // Projetos sem status_servico aparecem em uma coluna especial "Não atribuído"
  const projetosPorColuna = colunas.reduce((acc, coluna) => {
    // Agrupar projetos onde o status_servico é exatamente o ID desta coluna
    const projetosNaColuna = filteredProjetos.filter(projeto => {
      return projeto.status_servico === coluna.id
    })
    acc[coluna.id] = projetosNaColuna
    return acc
  }, {} as Record<string, Lancamento[]>)
  
  // Filtrar projetos sem status para exibir em coluna especial "Não atribuído"
  const projetosSemStatus = filteredProjetos.filter(projeto => 
    !projeto.status_servico || projeto.status_servico === null
  )
  
  // Criar coluna virtual "Não atribuído" se houver projetos sem status
  const colunaNaoAtribuido: KanbanColuna | null = projetosSemStatus.length > 0 ? {
    id: '__nao_atribuido__',
    nome: 'Não atribuído',
    cor: '#9CA3AF', // Cor cinza
    ordem: -1, // Ordem especial para aparecer primeiro
    ativo: true,
    status_servico: null,
  } : null
  
  // Adicionar projetos sem status à coluna "Não atribuído"
  if (colunaNaoAtribuido && projetosSemStatus.length > 0) {
    projetosPorColuna[colunaNaoAtribuido.id] = projetosSemStatus
  }


  const handleDragStart = (e: React.DragEvent, projeto: Lancamento) => {
    const target = e.target as HTMLElement
    // Não iniciar drag se clicar em botões ou links
    if (target.closest('button') || target.closest('a')) {
      e.preventDefault()
      return
    }
    
    setIsDragging(true)
    // Usar o ID do lançamento como chave única (cada projeto é independente)
    const projetoKey = projeto.id
    setDraggedProjetoId(projetoKey)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', projetoKey)
    e.dataTransfer.setData('application/projeto', 'true') // Marcar como drag de projeto
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false)
    setDraggedProjetoId(null)
    setDragOverColunaId(null)
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
  }

  const handleDragOver = (e: React.DragEvent, colunaId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColunaId(colunaId)
  }

  const handleDragLeave = () => {
    setDragOverColunaId(null)
  }

  const handleDrop = async (e: React.DragEvent, coluna: KanbanColuna) => {
    e.preventDefault()
    e.stopPropagation()
    
    setDragOverColunaId(null)
    setIsDragging(false)
    
    // Não permitir drop na coluna "Não atribuído" - usuário deve arrastar para uma coluna configurada
    if (coluna.id === '__nao_atribuido__') {
      setDraggedProjetoId(null)
      return
    }
    
    const projetoId = draggedProjetoId || e.dataTransfer.getData('text/html')
    
    if (!projetoId) {
      setDraggedProjetoId(null)
      return
    }
    
    // Buscar projeto pelo ID do lançamento
    const projeto = projetos.find(p => p.id === projetoId)
    
    if (!projeto) {
      setDraggedProjetoId(null)
      return
    }

    // Verificar se o projeto já está nesta coluna
    if (projeto.status_servico === coluna.id) {
      setDraggedProjetoId(null)
      return
    }

    // Atualizar estado local imediatamente para feedback visual instantâneo
    // Preservar dados financeiros ao atualizar apenas o status
    setProjetos(prevProjetos => 
      prevProjetos.map(p => 
        p.id === projetoId
          ? { ...p, status_servico: coluna.id as any }
          : p
      )
    )
    
    // Atualizar status apenas deste lançamento específico (cada projeto é independente)
    const supabase = createClient()
    const { error } = await supabase
      .from('financeiro_lancamentos')
      .update({ status_servico: coluna.id })
      .eq('id', projetoId)

    if (error) {
      // Se houver erro, reverter a mudança local preservando dados financeiros
      setProjetos(prevProjetos => 
        prevProjetos.map(p => 
          p.id === projetoId
            ? { ...p, status_servico: projeto.status_servico }
            : p
        )
      )
      await alert('Erro ao atualizar status: ' + error.message, 'Erro')
    } else {
      // Disparar evento customizado para sincronizar com outros componentes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('projetoStatusChanged', {
          detail: {
            lancamentoId: projetoId,
            newStatus: coluna.id
          }
        }))
      }
    }
    
    setDraggedProjetoId(null)
  }


  const handleDeleteColuna = async (colunaId: string) => {
    const coluna = colunas.find(c => c.id === colunaId)
    if (!coluna) return

    // Não permitir excluir colunas padrão (que têm status_servico e são as 3 iniciais)
    const colunasPadraoIds = ['pendente', 'em_andamento', 'finalizado']
    if (coluna.status_servico && colunasPadraoIds.includes(coluna.status_servico)) {
      await alert('Não é possível excluir colunas padrão do sistema.', 'Aviso')
      return
    }

    const confirmed = await confirm(
      `Tem certeza que deseja excluir a coluna "${coluna.nome}"?`,
      'Confirmar exclusão',
      'Excluir',
      'Cancelar',
      'danger'
    )
    if (!confirmed) return

    const supabase = createClient()
    const { error } = await supabase
      .from('kanban_colunas')
      .update({ ativo: false })
      .eq('id', colunaId)

    if (!error) {
      await loadColunas()
    } else {
      await alert('Erro ao excluir coluna: ' + error.message, 'Erro')
    }
  }

  return (
    <div>
      <div className="mb-4 flex gap-4 items-center">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar projetos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-500"
          />
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsColunasModalOpen(true)}
            className="flex items-center gap-2 h-10 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-600" />
            <span className="text-sm text-gray-700">Colunas</span>
          </button>
          <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-0.5">
            <button
              onClick={() => onViewModeChange('lista')}
              className={`h-9 w-9 flex items-center justify-center rounded transition-colors ${
                viewMode === 'lista'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Visualização em lista"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => onViewModeChange('kanban')}
              className={`h-9 w-9 flex items-center justify-center rounded transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Visualização em kanban"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        {/* Botão esquerdo */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Rolar para esquerda"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
        )}

        {/* Container do carrossel */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScrollability}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 px-1"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {colunas.length === 0 && projetosSemStatus.length === 0 ? (
            <div className="w-full flex items-center justify-center py-12 px-4">
              <div className="text-center max-w-md">
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhuma coluna cadastrada
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Para usar a visualização em kanban, é necessário criar colunas personalizadas.
                </p>
                <button
                  onClick={() => setIsColunasModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Criar Colunas
                </button>
              </div>
            </div>
          ) : (
            // Renderizar coluna "Não atribuído" primeiro se existir, depois as outras colunas
            [
              ...(colunaNaoAtribuido ? [colunaNaoAtribuido] : []),
              ...colunas
            ].map((coluna, colunaIndex) => {
            const projetosNaColuna = projetosPorColuna[coluna.id] || []
            const isDragOver = dragOverColunaId === coluna.id

            // Calcular valor total da coluna (soma das cobranças ativas de todos os projetos)
            const valorTotalColuna = projetosNaColuna.reduce((sum, projeto) => {
              return sum + (projeto.valorCobrancasAtivas || 0)
            }, 0)

            return (
              <div
                key={coluna.id}
                className={`flex-shrink-0 rounded-lg bg-white border-t-4 border border-gray-200 p-4 min-h-[400px] transition-all ${
                  isDragOver ? 'ring-2 ring-primary-500 ring-offset-2' : ''
                }`}
                style={{
                  borderTopColor: coluna.cor,
                  width: 'calc((100% - 2rem) / 5)', // 3 colunas com 2 gaps de 1rem (0.25rem * 4 * 2)
                  minWidth: '300px',
                }}
              >
              {/* Cabeçalho da coluna */}
              <div className="mb-4">
                {/* Nome da coluna + Botão de opções */}
                <div className="flex items-center justify-between mb-3">
                  <h3
                    className="font-semibold text-base"
                    style={{ color: coluna.cor }}
                  >
                    {coluna.nome}
                  </h3>
                  {coluna.id !== '__nao_atribuido__' && (
                    <button
                      className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                      title="Opções"
                      onClick={(e) => {
                        e.stopPropagation()
                        // TODO: Implementar menu de opções
                      }}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {/* Valor total + Quantidade de projetos */}
                <div className="flex items-center justify-between" style={{ marginTop: '-10px' }}>
                  <span className="text-sm font-medium" style={{ color: '#4a4a4a' }}>
                    {formatCurrency(valorTotalColuna)}
                  </span>
                  <span className="text-sm bg-white px-2 py-1 rounded-full font-medium" style={{ color: '#4a4a4a' }}>
                    {projetosNaColuna.length} {projetosNaColuna.length === 1 ? 'projeto' : 'projetos'}
                  </span>
                </div>
              </div>

              <div 
                className="space-y-3 min-h-[200px]"
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  e.dataTransfer.dropEffect = 'move'
                  handleDragOver(e, coluna.id)
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleDragLeave()
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleDrop(e, coluna)
                }}
              >
                {projetosNaColuna.length === 0 ? (
                  <div className={`text-center py-8 text-gray-400 text-sm rounded-lg border-2 border-dashed transition-colors ${
                    isDragOver ? 'border-primary-400 bg-primary-50' : 'border-gray-200'
                  }`}>
                    {isDragOver ? 'Solte aqui' : 'Nenhum projeto'}
                  </div>
                ) : (
                  projetosNaColuna.map((projeto) => {
                    const projetoKey = projeto.id
                    const isDragged = draggedProjetoId === projetoKey
                    const nomeProjeto = projeto.servicos?.nome || 'Serviço não encontrado'

                    return (
                      <div
                        key={projetoKey}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, projeto)}
                        onDragEnd={handleDragEnd}
                        className={`projeto-card bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${
                          isDragged ? 'opacity-50' : 'opacity-100'
                        }`}
                        onClick={(e) => {
                          if (!isDragging && !draggedProjetoId && projeto.cliente_id) {
                            router.push(`/clientes/${projeto.cliente_id}`)
                          }
                        }}
                      >
                        {/* Foto + Nome */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-10 h-10 rounded-full ${getAvatarColor(nomeProjeto)} flex items-center justify-center flex-shrink-0 font-semibold text-base`}>
                            {getInicial(nomeProjeto)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-base block truncate">
                              {projeto.clientes?.nome || nomeProjeto}
                            </p>
                            {projeto.clientes?.nome && (
                              <p className="text-xs text-gray-600 truncate mt-0.5">
                                {nomeProjeto}
                              </p>
                            )}
                          </div>
                          {projeto.cliente_id && (
                            <Link
                              href={`/clientes/${projeto.cliente_id}`}
                              className="p-1.5 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                              title="Ver detalhes"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Valor das cobranças ativas */}
                          <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
                            <Wallet className="w-3 h-3 text-gray-600 flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-900" style={{ color: '#4a4a4a', fontSize: '12px' }}>
                              {formatCurrency(projeto.valorCobrancasAtivas || 0)}
                            </span>
                          </div>

                          {/* Data de vencimento */}
                          {projeto.proximaDataVencimento && (
                            <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
                              <Calendar className="w-3 h-3 text-gray-600 flex-shrink-0" />
                              <span className="text-sm text-gray-600" style={{ color: '#4a4a4a', fontSize: '12px' }}>
                                {formatDate(projeto.proximaDataVencimento)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
            )
          })
          )}
        </div>

        {/* Botão direito */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Rolar para direita"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

          <GerenciarColunasModal
            isOpen={isColunasModalOpen}
            onClose={() => setIsColunasModalOpen(false)}
            onSuccess={loadColunas}
            colunas={colunas}
            onDelete={handleDeleteColuna}
          />
    </div>
  )
}

interface GerenciarColunasModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  colunas: KanbanColuna[]
  onDelete: (colunaId: string) => void
}

function GerenciarColunasModal({
  isOpen,
  onClose,
  onSuccess,
  colunas,
  onDelete,
}: GerenciarColunasModalProps) {
  const { alert } = useModal()
  const [loading, setLoading] = useState<string | null>(null) // ID da coluna sendo salva
  const [draggedColunaId, setDraggedColunaId] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [colunasOrdenadas, setColunasOrdenadas] = useState<KanbanColuna[]>([])
  const [editingColunaId, setEditingColunaId] = useState<string | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newColunaData, setNewColunaData] = useState({ nome: '', cor: '#3B82F6' })
  const [editingColunaData, setEditingColunaData] = useState<Record<string, { nome: string; cor: string }>>({})
  const [colunaFinalizadoId, setColunaFinalizadoId] = useState<string>('')

  useEffect(() => {
    // Ordenar colunas por ordem quando o modal abrir
    setColunasOrdenadas([...colunas].sort((a, b) => a.ordem - b.ordem))
    
    // Carregar configuração da coluna finalizado
    if (isOpen) {
      const supabase = createClient()
      supabase
        .from('configuracoes_sistema')
        .select('valor')
        .eq('chave', 'projetos_coluna_finalizado_id')
        .single()
        .then(({ data }) => {
          if (data) {
            setColunaFinalizadoId(data.valor || '')
          }
        })
    }
    
    // Resetar estados quando o modal fechar
    if (!isOpen) {
      setEditingColunaId(null)
      setIsCreatingNew(false)
      setNewColunaData({ nome: '', cor: '#3B82F6' })
      setEditingColunaData({})
    }
  }, [colunas, isOpen])

  const handleStartEdit = (coluna: KanbanColuna) => {
    setEditingColunaId(coluna.id)
    setEditingColunaData({
      [coluna.id]: {
        nome: coluna.nome,
        cor: coluna.cor
      }
    })
    setIsCreatingNew(false)
  }

  const handleCancelEdit = () => {
    setEditingColunaId(null)
    setEditingColunaData({})
  }

  const handleStartCreate = () => {
    setIsCreatingNew(true)
    setNewColunaData({ nome: '', cor: '#3B82F6' })
    setEditingColunaId(null)
  }

  const handleCancelCreate = () => {
    setIsCreatingNew(false)
    setNewColunaData({ nome: '', cor: '#3B82F6' })
  }

  const handleSaveEdit = async (coluna: KanbanColuna) => {
    const data = editingColunaData[coluna.id]
    if (!data || !data.nome.trim()) {
      await alert('O nome da coluna é obrigatório.', 'Validação')
      return
    }

    setLoading(coluna.id)
    const supabase = createClient()
    
    const { error } = await supabase
      .from('kanban_colunas')
      .update({
        nome: data.nome.trim(),
        cor: data.cor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', coluna.id)

    if (!error) {
      setEditingColunaId(null)
      setEditingColunaData({})
      onSuccess()
    } else {
      await alert('Erro ao atualizar coluna: ' + error.message, 'Erro')
    }

    setLoading(null)
  }

  const handleSaveCreate = async () => {
    if (!newColunaData.nome.trim()) {
      await alert('O nome da coluna é obrigatório.', 'Validação')
      return
    }

    setLoading('new')
    const supabase = createClient()
    
    const maxOrdem = Math.max(...colunas.map(c => c.ordem), -1)
    const { data: novaColuna, error } = await supabase
      .from('kanban_colunas')
      .insert([{
        nome: newColunaData.nome.trim(),
        cor: newColunaData.cor,
        ordem: maxOrdem + 1,
        status_servico: null,
        ativo: true,
      }])
      .select()
      .single()

    if (!error && novaColuna) {
      await supabase
        .from('kanban_colunas')
        .update({ status_servico: novaColuna.id })
        .eq('id', novaColuna.id)
      
      setIsCreatingNew(false)
      setNewColunaData({ nome: '', cor: '#3B82F6' })
      onSuccess()
    } else {
      await alert('Erro ao criar coluna: ' + error?.message, 'Erro')
    }

    setLoading(null)
  }

  // Handlers para drag and drop de colunas no modal
  const handleColunaDragStart = (e: React.DragEvent, colunaId: string) => {
    setDraggedColunaId(colunaId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', colunaId)
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
  }

  const handleColunaDragEnd = (e: React.DragEvent) => {
    setDraggedColunaId(null)
    setDragOverIndex(null)
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
  }

  const handleColunaDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleColunaDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleColunaDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)
    
    const colunaId = draggedColunaId || e.dataTransfer.getData('text/html')
    if (!colunaId) {
      setDraggedColunaId(null)
      return
    }

    const draggedIndex = colunasOrdenadas.findIndex(c => c.id === colunaId)
    if (draggedIndex === -1 || draggedIndex === targetIndex) {
      setDraggedColunaId(null)
      return
    }

    // Reordenar colunas localmente
    const novasColunas = [...colunasOrdenadas]
    const [colunaMovida] = novasColunas.splice(draggedIndex, 1)
    novasColunas.splice(targetIndex, 0, colunaMovida)

    // Atualizar ordem no estado local
    const colunasComNovaOrdem = novasColunas.map((coluna, index) => ({
      ...coluna,
      ordem: index
    }))

    setColunasOrdenadas(colunasComNovaOrdem)

    // Salvar nova ordem no banco de dados
    const supabase = createClient()
    for (const coluna of colunasComNovaOrdem) {
      await supabase
        .from('kanban_colunas')
        .update({ ordem: coluna.ordem })
        .eq('id', coluna.id)
    }

    setDraggedColunaId(null)
    onSuccess() // Recarregar colunas
  }

  // Separar colunas padrão e personalizadas para exibição
  // Colunas padrão são as 3 iniciais (Pendente, Em Andamento, Finalizado)
  const colunasPadrao = colunasOrdenadas.filter(c => 
    ['Pendente', 'Em Andamento', 'Finalizado'].includes(c.nome)
  )
  const colunasPersonalizadas = colunasOrdenadas.filter(c => 
    !colunasPadrao.includes(c)
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gerenciar Colunas do Kanban">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Todas as Colunas</h3>
          <p className="text-xs text-gray-500 mb-3">Arraste as colunas para reordená-las</p>
          <div className="space-y-2">
            {colunasOrdenadas.map((coluna, index) => {
              const isDragged = draggedColunaId === coluna.id
              const isDragOver = dragOverIndex === index
              const isEditing = editingColunaId === coluna.id
              const colunaEditData = editingColunaData[coluna.id] || { nome: coluna.nome, cor: coluna.cor }
              
              return (
                <div
                  key={coluna.id}
                  draggable={!isEditing && !isCreatingNew}
                  onDragStart={(e) => !isEditing && !isCreatingNew && handleColunaDragStart(e, coluna.id)}
                  onDragEnd={handleColunaDragEnd}
                  onDragOver={(e) => !isEditing && !isCreatingNew && handleColunaDragOver(e, index)}
                  onDragLeave={handleColunaDragLeave}
                  onDrop={(e) => !isEditing && !isCreatingNew && handleColunaDrop(e, index)}
                  className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg transition-all ${
                    isDragged ? 'opacity-50' : ''
                  } ${
                    isDragOver ? 'ring-2 ring-primary-500 ring-offset-2 bg-primary-50' : ''
                  } ${
                    !isEditing && !isCreatingNew ? 'cursor-grab active:cursor-grabbing' : ''
                  }`}
                >
                  {isEditing ? (
                    // Modo de edição inline
                    <>
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <input
                          type="color"
                          value={colunaEditData.cor}
                          onChange={(e) => setEditingColunaData({
                            ...editingColunaData,
                            [coluna.id]: { ...colunaEditData, cor: e.target.value }
                          })}
                          className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={colunaEditData.nome}
                          onChange={(e) => setEditingColunaData({
                            ...editingColunaData,
                            [coluna.id]: { ...colunaEditData, nome: e.target.value }
                          })}
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Nome da coluna"
                          autoFocus
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveEdit(coluna)}
                          disabled={loading === coluna.id}
                          className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          {loading === coluna.id ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={loading === coluna.id}
                          className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Cancelar"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    // Modo de visualização normal
                    <>
                      <div className="flex items-center gap-2 flex-1">
                        <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: coluna.cor }}
                        />
                        <span className="text-sm text-gray-700">{coluna.nome}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(coluna)}
                          className="p-1.5 text-gray-600 hover:text-primary-600 hover:bg-white rounded transition-colors"
                          title="Editar"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {!['Pendente', 'Em Andamento', 'Finalizado'].includes(coluna.nome) && (
                          <button
                            onClick={() => onDelete(coluna.id)}
                            className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-white rounded transition-colors"
                            title="Excluir"
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
            
            {/* Linha para criar nova coluna */}
            {isCreatingNew && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-2 border-dashed border-primary-300">
                <div className="flex items-center gap-2 flex-1 mr-2">
                  <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0 opacity-0" />
                  <input
                    type="color"
                    value={newColunaData.cor}
                    onChange={(e) => setNewColunaData({ ...newColunaData, cor: e.target.value })}
                    className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newColunaData.nome}
                    onChange={(e) => setNewColunaData({ ...newColunaData, nome: e.target.value })}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Nome da coluna"
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveCreate}
                    disabled={loading === 'new'}
                    className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {loading === 'new' ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    onClick={handleCancelCreate}
                    disabled={loading === 'new'}
                    className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    title="Cancelar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {!isCreatingNew && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleStartCreate}
                className="flex items-center gap-2 w-full justify-center px-4 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nova Coluna
              </button>
            </div>
          )}
        </div>
        
        {/* Configuração da coluna finalizado */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Configuração</h3>
          <p className="text-xs text-gray-500 mb-3">
            Selecione qual coluna corresponde à etapa "Finalizado". Projetos nesta coluna não aparecerão no calendário.
          </p>
          <select
            value={colunaFinalizadoId}
            onChange={async (e) => {
              const novaColunaId = e.target.value
              setColunaFinalizadoId(novaColunaId)
              
              const supabase = createClient()
              // Salvar ou atualizar configuração
              const { data: existing } = await supabase
                .from('configuracoes_sistema')
                .select('id')
                .eq('chave', 'projetos_coluna_finalizado_id')
                .single()
              
              if (existing) {
                await supabase
                  .from('configuracoes_sistema')
                  .update({ valor: novaColunaId })
                  .eq('chave', 'projetos_coluna_finalizado_id')
              } else {
                await supabase
                  .from('configuracoes_sistema')
                  .insert([{ chave: 'projetos_coluna_finalizado_id', valor: novaColunaId }])
              }
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Selecione uma coluna...</option>
            {colunasOrdenadas.map((coluna) => (
              <option key={coluna.id} value={coluna.id}>
                {coluna.nome}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  )
}

