'use client'

import { useState, useEffect } from 'react'
import { Plus, Settings, Wallet, CheckCircle2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { ServicoModal } from '@/components/modals/ServicoModal'
import { ContaModal } from '@/components/modals/ContaModal'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface TarefaEstado {
  id: string
  titulo: string
  descricao: string
  icone: typeof Plus
  completada: boolean
  expanded: boolean
  onClick: () => void
  actionButton?: {
    label: string
    onClick: () => void
  }
}

export function ConfiguracoesIniciais() {
  const router = useRouter()
  const [isServicoModalOpen, setIsServicoModalOpen] = useState(false)
  const [isContaModalOpen, setIsContaModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tarefasEstado, setTarefasEstado] = useState<TarefaEstado[]>([])

  const verificarEstadoTarefas = async () => {
    const supabase = createClient()
    setLoading(true)

    try {
      // Verificar serviços
      const { count: servicosCount } = await supabase
        .from('servicos')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true)

      // Verificar colunas kanban de projetos
      const { count: colunasProjetosCount } = await supabase
        .from('kanban_colunas')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true)

      // Verificar colunas kanban de tarefas
      const { count: colunasTarefasCount } = await supabase
        .from('tarefas_kanban_colunas')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true)

      // Verificar contas financeiras
      const { count: contasCount } = await supabase
        .from('contas_financeiras')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true)

      const tarefas: TarefaEstado[] = [
        {
          id: 'servico',
          titulo: 'Adicione o primeiro Serviço',
          descricao: 'Configure seus serviços para começar a trabalhar',
          icone: Plus,
          completada: (servicosCount || 0) > 0,
          expanded: false,
          onClick: () => setIsServicoModalOpen(true)
        },
        {
          id: 'status-projetos',
          titulo: 'Configure os status de projetos',
          descricao: 'Defina as colunas do kanban de projetos',
          icone: Settings,
          completada: (colunasProjetosCount || 0) > 0,
          expanded: false,
          onClick: () => router.push('/projetos')
        },
        {
          id: 'status-tarefas',
          titulo: 'Configure os status de tarefas',
          descricao: 'Defina as colunas do kanban de tarefas',
          icone: Settings,
          completada: (colunasTarefasCount || 0) > 0,
          expanded: false,
          onClick: () => router.push('/tarefas')
        },
        {
          id: 'banco',
          titulo: 'Configure seu banco',
          descricao: 'Cadastre suas contas financeiras',
          icone: Wallet,
          completada: (contasCount || 0) > 0,
          expanded: false,
          onClick: () => setIsContaModalOpen(true)
        }
      ]

      setTarefasEstado(tarefas)
    } catch (error) {
      console.error('Erro ao verificar estado das tarefas:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    verificarEstadoTarefas()

    // Configurar subscription para atualizar quando houver mudanças
    const supabase = createClient()
    const channel = supabase
      .channel('configuracoes_iniciais_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'servicos'
        },
        () => verificarEstadoTarefas()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kanban_colunas'
        },
        () => verificarEstadoTarefas()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tarefas_kanban_colunas'
        },
        () => verificarEstadoTarefas()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contas_financeiras'
        },
        () => verificarEstadoTarefas()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const toggleExpand = (id: string) => {
    setTarefasEstado(prev =>
      prev.map(tarefa =>
        tarefa.id === id ? { ...tarefa, expanded: !tarefa.expanded } : tarefa
      )
    )
  }


  // Verificar se todas as tarefas estão completadas
  const todasCompletadas = tarefasEstado.length > 0 && tarefasEstado.every(tarefa => tarefa.completada)

  if (loading) {
    return (
      <div className="mb-8">
        <p className="text-gray-500 text-sm mb-2">Siga esses passos para configurar o seu sistema</p>
        <div className="bg-white border border-gray-200 p-6" style={{ borderRadius: '16px' }}>
          <div className="text-center text-gray-500">Carregando configurações...</div>
        </div>
      </div>
    )
  }

  // Se todas as tarefas estão completadas, não renderizar o container
  if (todasCompletadas) {
    return (
      <>
        <ServicoModal
          isOpen={isServicoModalOpen}
          onClose={() => setIsServicoModalOpen(false)}
          onSuccess={() => {
            setIsServicoModalOpen(false)
            verificarEstadoTarefas()
          }}
        />

        <ContaModal
          isOpen={isContaModalOpen}
          onClose={() => setIsContaModalOpen(false)}
          onSuccess={() => {
            setIsContaModalOpen(false)
            verificarEstadoTarefas()
          }}
        />
      </>
    )
  }

  return (
    <>
      <div className="mb-8">
        <p className="text-black text-sm mb-4">Siga esses passos para configurar o seu sistema</p>
        <div className="bg-white border border-gray-200 divide-y divide-gray-200 overflow-hidden" style={{ borderRadius: '16px' }}>
          {tarefasEstado.map((tarefa, index) => {
            const Icon = tarefa.icone
            const isCompleted = tarefa.completada
            const isFirst = index === 0
            const isLast = index === tarefasEstado.length - 1

            return (
              <div
                key={tarefa.id}
                className={`transition-colors ${
                  tarefa.expanded ? 'bg-gray-50' : 'bg-white'
                }`}
                style={{
                  borderRadius: isFirst ? '16px 16px 0 0' : isLast ? '0 0 16px 16px' : '0'
                }}
              >
                {/* Cabeçalho da tarefa */}
                <div className="flex items-center p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => toggleExpand(tarefa.id)}
                >
                  {/* Ícone de status */}
                  <div className="flex-shrink-0 mr-4">
                    {isCompleted ? (
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                    )}
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-semibold text-base ${
                        isCompleted ? 'text-gray-600 line-through' : 'text-gray-900'
                      }`} style={{ fontSize: '14px' }}
                    >
                      {tarefa.titulo}
                    </h3>
                  </div>

                  {/* Ações no cabeçalho */}
                  <div className="flex items-center gap-2 ml-4">
                    {!isCompleted && (tarefa.id === 'status-projetos' || tarefa.id === 'status-tarefas') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          tarefa.onClick()
                        }}
                        className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 transition-colors"
                      >
                        <span>Abrir</span>
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleExpand(tarefa.id)
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {tarefa.expanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Conteúdo expandido */}
                {tarefa.expanded && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="ml-12">
                      <p className="text-sm text-gray-600 mb-4">{tarefa.descricao}</p>
                      {!isCompleted && (
                        <div className="flex gap-2">
                          {tarefa.id === 'servico' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                tarefa.onClick()
                              }}
                              className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
                            >
                              Adicionar Serviço
                            </button>
                          )}
                          {tarefa.id === 'banco' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                tarefa.onClick()
                              }}
                              className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
                            >
                              Cadastrar Conta
                            </button>
                          )}
                          {(tarefa.id === 'status-projetos' || tarefa.id === 'status-tarefas') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                tarefa.onClick()
                              }}
                              className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
                            >
                              Configurar Colunas
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <ServicoModal
        isOpen={isServicoModalOpen}
        onClose={() => setIsServicoModalOpen(false)}
        onSuccess={() => {
          setIsServicoModalOpen(false)
          verificarEstadoTarefas()
        }}
      />

      <ContaModal
        isOpen={isContaModalOpen}
        onClose={() => setIsContaModalOpen(false)}
        onSuccess={() => {
          setIsContaModalOpen(false)
          verificarEstadoTarefas()
        }}
      />
    </>
  )
}
