'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Package, Trash2 } from 'lucide-react'
import { Database } from '@/types/database.types'
import { Modal } from '@/components/ui/Modal'
import { useModal } from '@/contexts/ModalContext'
import { verificarServicosAtrasados } from '@/lib/utils/notificacoes-servicos'
import { getPrimeiraColunaKanbanId } from '@/lib/utils/kanban'

type Servico = Database['public']['Tables']['servicos']['Row']
type Projeto = Database['public']['Tables']['projetos']['Row']
type Lancamento = Database['public']['Tables']['financeiro_lancamentos']['Row'] & {
  servicos?: Servico
  projetos?: Projeto | null
}

type StatusServico = 'pendente' | 'em_andamento' | 'finalizado'

type KanbanColuna = {
  id: string
  nome: string
  cor: string
  ordem: number
  ativo: boolean
}

interface ServicosClienteProps {
  clienteId: string
  onDataChange?: () => void
}

export function ServicosCliente({ clienteId, onDataChange }: ServicosClienteProps) {
  const [servicos, setServicos] = useState<Lancamento[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [servicosDisponiveis, setServicosDisponiveis] = useState<Servico[]>([])

  const loadServicos = useCallback(async () => {
    const supabase = createClient()
    
    const { data } = await supabase
      .from('financeiro_lancamentos')
      .select(`
        *,
        servicos (*),
        projetos (*)
      `)
      .eq('cliente_id', clienteId)
      .not('servico_id', 'is', null)
      .order('data_vencimento', { ascending: false })

    if (data) {
      setServicos(data as Lancamento[])
    }
    setLoading(false)
    
    // Verificar serviços atrasados e criar notificações
    await verificarServicosAtrasados()
  }, [clienteId])

  const loadServicosDisponiveis = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('servicos')
      .select('*')
      .eq('ativo', true)
      .order('nome')

    if (data) {
      setServicosDisponiveis(data)
    }
  }, [])

  useEffect(() => {
    loadServicos()
    loadServicosDisponiveis()
  }, [clienteId, loadServicos, loadServicosDisponiveis])

  const servicosUnicos = servicos.reduce((acc: Lancamento[], lancamento) => {
    if (lancamento.servico_id && !acc.find(s => s.servico_id === lancamento.servico_id)) {
      acc.push(lancamento)
    }
    return acc
  }, [])

  if (loading) {
    return (
      <Card title="Projetos">
        <div className="text-center py-8 text-gray-500">Carregando...</div>
      </Card>
    )
  }

  return (
    <>
      <div id="servicos" className="scroll-mt-8">
        <Card 
          title="Projetos"
          action={
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
            >
              <Plus className="w-4 h-4" />
              Adicionar Projeto
            </button>
          }
        >
        {servicosUnicos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhum projeto encontrado
          </div>
        ) : (
          <div className="space-y-3">
            {servicosUnicos.map((lancamento) => (
              <ServicoCard
                key={`${lancamento.servico_id}-${lancamento.id}`}
                lancamento={lancamento}
                onStatusChange={() => loadServicos()}
                onDelete={() => loadServicos()}
              />
            ))}
          </div>
        )}
        </Card>
      </div>

      <AdicionarServicoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          loadServicos()
          setIsModalOpen(false)
          // Notificar mudança para atualizar outros componentes
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('servicoStatusChanged'))
          }
        }}
        clienteId={clienteId}
        servicosDisponiveis={servicosDisponiveis}
      />
    </>
  )
}

interface ServicoCardProps {
  lancamento: Lancamento
  onStatusChange: () => void
  onDelete: () => void
}

function ServicoCard({ lancamento, onStatusChange, onDelete }: ServicoCardProps) {
  const { alert, confirm } = useModal()
  const [colunasKanban, setColunasKanban] = useState<KanbanColuna[]>([])
  const [loadingColunas, setLoadingColunas] = useState(true)
  const [status, setStatus] = useState<string>(lancamento.status_servico || '')
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Buscar colunas do kanban
  useEffect(() => {
    async function loadColunasKanban() {
      const supabase = createClient()
      const { data } = await supabase
        .from('kanban_colunas')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true })

      if (data) {
        setColunasKanban(data as KanbanColuna[])
        // Se não houver status, usar a primeira coluna
        if (!lancamento.status_servico && data.length > 0) {
          setStatus(data[0].id)
        }
      }
      setLoadingColunas(false)
    }
    loadColunasKanban()
  }, [])

  // Atualizar status quando o lancamento mudar
  useEffect(() => {
    if (lancamento.status_servico) {
      setStatus(lancamento.status_servico)
    } else if (colunasKanban.length > 0) {
      setStatus(colunasKanban[0].id)
    }
  }, [lancamento.status_servico, colunasKanban])

  const handleStatusChange = async (colunaId: string) => {
    setUpdating(true)
    const supabase = createClient()
    
    // Atualizar todos os lançamentos relacionados ao mesmo serviço
    const { error } = await supabase
      .from('financeiro_lancamentos')
      .update({ status_servico: colunaId })
      .eq('servico_id', lancamento.servico_id)
      .eq('cliente_id', lancamento.cliente_id)

    if (!error) {
      setStatus(colunaId)
      onStatusChange()
      // Notificar mudança para atualizar outros componentes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('servicoStatusChanged'))
      }
      // Verificar serviços atrasados após atualizar status
      await verificarServicosAtrasados()
    } else {
      await alert('Erro ao atualizar status: ' + error.message, 'Erro')
    }
    setUpdating(false)
  }

  const handleDelete = async () => {
    const confirmed = await confirm(
      'Tem certeza que deseja excluir este projeto? Isso excluirá todas as cobranças e histórico financeiro relacionado a este projeto, incluindo as cobranças/assinaturas no Asaas.',
      'Confirmar exclusão',
      'Excluir',
      'Cancelar',
      'danger'
    )
    if (!confirmed) {
      return
    }

    setDeleting(true)
    const supabase = createClient()
    
    // Primeiro, tenta excluir as cobranças/assinaturas no Asaas
    try {
      const response = await fetch('/api/asaas/delete-charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          servicoId: lancamento.servico_id,
          clienteId: lancamento.cliente_id 
        }),
      })

      const result = await response.json()
      
      if (!response.ok) {
        // Se houver erro ao excluir no Asaas, pergunta se deseja continuar
        const shouldContinue = await confirm(
          `Erro ao excluir cobranças/assinaturas no Asaas: ${result.error}\n\n` +
          `Deseja continuar e excluir apenas no sistema?`,
          'Erro ao excluir no Asaas'
        )
        
        if (!shouldContinue) {
          setDeleting(false)
          return
        }
      } else if (result.errors && result.errors.length > 0) {
        // Se houver alguns erros, avisa mas continua
        console.warn('Alguns erros ao excluir no Asaas:', result.errors)
      }
    } catch (error: any) {
      // Se houver erro na chamada da API, pergunta se deseja continuar
      const shouldContinue = await confirm(
        `Erro ao comunicar com o Asaas: ${error.message}\n\n` +
        `Deseja continuar e excluir apenas no sistema?`,
        'Erro de comunicação'
      )
      
      if (!shouldContinue) {
        setDeleting(false)
        return
      }
    }

    // Excluir todos os lançamentos relacionados ao serviço deste cliente
    const { error } = await supabase
      .from('financeiro_lancamentos')
      .delete()
      .eq('servico_id', lancamento.servico_id)
      .eq('cliente_id', lancamento.cliente_id)

    if (!error) {
      onDelete()
      // Notificar mudança para atualizar outros componentes
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('servicoDeleted'))
      }
    } else {
      await alert('Erro ao excluir projeto: ' + error.message, 'Erro')
      setDeleting(false)
    }
  }

  const getStatusColor = (colunaId: string) => {
    const coluna = colunasKanban.find(c => c.id === colunaId)
    if (!coluna) {
      return 'bg-gray-100 text-gray-800 border-gray-200'
    }
    
    // Converter cor hexadecimal para classes Tailwind aproximadas
    const cor = coluna.cor.toLowerCase()
    
    // Mapear cores comuns para classes Tailwind
    if (cor === '#fbbf24' || cor === '#f59e0b') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    } else if (cor === '#2563eb' || cor === '#3b82f6') {
      return 'bg-blue-100 text-blue-800 border-blue-200'
    } else if (cor === '#16a34a' || cor === '#22c55e') {
      return 'bg-green-100 text-green-800 border-green-200'
    } else if (cor === '#dc2626' || cor === '#ef4444') {
      return 'bg-red-100 text-red-800 border-red-200'
    } else if (cor === '#7c3aed' || cor === '#8b5cf6') {
      return 'bg-purple-100 text-purple-800 border-purple-200'
    } else if (cor === '#f97316' || cor === '#fb923c') {
      return 'bg-orange-100 text-orange-800 border-orange-200'
    }
    
    // Se não encontrar cor conhecida, usar estilo inline
    return 'border-gray-200'
  }

  const getStatusStyle = (colunaId: string) => {
    const coluna = colunasKanban.find(c => c.id === colunaId)
    if (!coluna) {
      return {}
    }
    
    // Se a cor não for uma das conhecidas, usar estilo inline
    const cor = coluna.cor.toLowerCase()
    const coresConhecidas = ['#fbbf24', '#f59e0b', '#2563eb', '#3b82f6', '#16a34a', '#22c55e', '#dc2626', '#ef4444', '#7c3aed', '#8b5cf6', '#f97316', '#fb923c']
    
    if (!coresConhecidas.includes(cor)) {
      // Converter hex para rgb para usar como background
      const hex = coluna.cor.replace('#', '')
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)
      
      return {
        backgroundColor: `rgba(${r}, ${g}, ${b}, 0.1)`,
        color: coluna.cor,
        borderColor: `rgba(${r}, ${g}, ${b}, 0.2)`
      }
    }
    
    return {}
  }

  const projeto = lancamento.projetos
  const valorPrevisto = projeto?.valor_previsto || lancamento.valor
  const dataPrevista = projeto?.data_fim_prevista || lancamento.data_vencimento

  // Calcular progresso baseado na posição do status nas colunas do kanban
  // A primeira etapa sempre é 0%, só conta da segunda em diante
  const calcularProgresso = () => {
    if (colunasKanban.length === 0) return 0
    
    const statusAtual = status || lancamento.status_servico || colunasKanban[0]?.id
    if (!statusAtual) return 0
    
    // Encontrar o índice da coluna atual
    const indiceColuna = colunasKanban.findIndex(c => c.id === statusAtual)
    
    // Se não encontrar, retornar 0
    if (indiceColuna === -1) return 0
    
    // Se estiver na primeira coluna (índice 0), retornar 0%
    if (indiceColuna === 0) return 0
    
    // Calcular progresso: índice * (100 / (total de colunas - 1))
    // Exemplo: 5 colunas, na coluna 2 (índice 1) = 1 * (100 / 4) = 1 * 25 = 25%
    // Exemplo: 5 colunas, na coluna 3 (índice 2) = 2 * (100 / 4) = 2 * 25 = 50%
    const totalColunasRestantes = colunasKanban.length - 1
    const porcentagemPorColuna = 100 / totalColunasRestantes
    const progressoCalculado = indiceColuna * porcentagemPorColuna
    
    return Math.round(progressoCalculado)
  }
  
  const progresso = calcularProgresso()

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Package className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">
              {lancamento.servicos?.nome || 'Projeto não encontrado'}
            </p>
            {lancamento.servicos?.descricao && (
              <p className="text-sm text-gray-600 mt-1">
                {lancamento.servicos.descricao}
              </p>
            )}
            
            {/* Informações do projeto em formato de tabela */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-3 gap-8">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-2">Progresso</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${progresso}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                      {progresso}%
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-2">Valor Previsto</label>
                  <p className="text-sm text-gray-700">
                    {formatCurrency(Number(valorPrevisto))}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-2">Data Vencimento</label>
                  <p className="text-sm text-gray-700">
                    {dataPrevista ? formatDate(dataPrevista) : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {loadingColunas ? (
            <div className="px-3 py-1.5 text-sm text-gray-500">Carregando...</div>
          ) : (
            <select
              value={status || colunasKanban[0]?.id || ''}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updating || deleting}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${getStatusColor(status || colunasKanban[0]?.id || '')}`}
              style={getStatusStyle(status || colunasKanban[0]?.id || '')}
              title="Status do projeto"
            >
              {colunasKanban.map((coluna) => (
                <option key={coluna.id} value={coluna.id}>
                  {coluna.nome}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting || updating}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            title="Excluir projeto e todas as cobranças relacionadas"
            type="button"
          >
            {deleting ? (
              <span className="text-xs">Excluindo...</span>
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

interface AdicionarServicoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  clienteId: string
  servicosDisponiveis: Servico[]
}

function AdicionarServicoModal({
  isOpen,
  onClose,
  onSuccess,
  clienteId,
  servicosDisponiveis,
}: AdicionarServicoModalProps) {
  const { alert } = useModal()
  const [loading, setLoading] = useState(false)
  const [colunasKanban, setColunasKanban] = useState<KanbanColuna[]>([])
  const [formData, setFormData] = useState({
    servico_id: '',
    valor: '',
    data_vencimento: '',
    data_proxima_assinatura: '',
    descricao: '',
    status_servico: '',
    criarCobrancaAutomaticamente: true,
  })

  // Buscar colunas do kanban
  useEffect(() => {
    async function loadColunasKanban() {
      const supabase = createClient()
      const { data } = await supabase
        .from('kanban_colunas')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true })

      if (data) {
        setColunasKanban(data as KanbanColuna[])
        // Definir primeira coluna como padrão
        if (data.length > 0 && !formData.status_servico) {
          setFormData(prev => ({ ...prev, status_servico: data[0].id }))
        }
      }
    }
    if (isOpen) {
      loadColunasKanban()
    }
  }, [isOpen])
  
  // Obter o serviço selecionado para verificar se é assinatura
  const servicoSelecionado = servicosDisponiveis.find(s => s.id === formData.servico_id)
  const isAssinatura = servicoSelecionado?.tipo === 'assinatura'

  // Resetar formulário quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      const primeiraColunaId = colunasKanban.length > 0 ? colunasKanban[0].id : ''
      setFormData({
        servico_id: '',
        valor: '',
        data_vencimento: '',
        data_proxima_assinatura: '',
        descricao: '',
        status_servico: primeiraColunaId,
        criarCobrancaAutomaticamente: true,
      })
    }
  }, [isOpen, colunasKanban])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validação: se for assinatura, data_proxima_assinatura é obrigatória
    if (isAssinatura && !formData.data_proxima_assinatura) {
      await alert('Para projetos de assinatura, é obrigatório informar a Data da Próxima Assinatura.', 'Validação')
      return
    }
    
    setLoading(true)

    const supabase = createClient()
    
    // Buscar categoria de entrada padrão ou criar
    const { data: categoria } = await supabase
      .from('financeiro_categorias')
      .select('id')
      .eq('tipo', 'entrada')
      .eq('ativo', true)
      .limit(1)
      .single()

    // Usar o status_servico selecionado no formulário ou a primeira coluna como fallback
    let statusServicoId = formData.status_servico
    
    if (!statusServicoId && colunasKanban.length > 0) {
      statusServicoId = colunasKanban[0].id
    }
    
    if (!statusServicoId) {
      // Fallback: buscar primeira coluna do kanban
      const primeiraColunaId = await getPrimeiraColunaKanbanId()
      if (!primeiraColunaId) {
        await alert('Não foi possível encontrar uma coluna no kanban. Verifique se as colunas do kanban estão configuradas.', 'Erro')
        setLoading(false)
        return
      }
      statusServicoId = primeiraColunaId
    }

    // Se for assinatura, usar data_proxima_assinatura como data_vencimento da cobrança
    // Caso contrário, usar data_vencimento normal
    const dataVencimentoCobranca = isAssinatura && formData.data_proxima_assinatura 
      ? formData.data_proxima_assinatura 
      : formData.data_vencimento

      // Garantir que a data seja tratada como local (sem conversão de timezone)
      // O input type="date" retorna YYYY-MM-DD, adicionar hora 09:00 se não tiver
      let dataVencimentoFormatada: string | null = null
      if (dataVencimentoCobranca) {
        // Se for apenas data (YYYY-MM-DD), adicionar hora 09:00
        if (dataVencimentoCobranca.match(/^\d{4}-\d{2}-\d{2}$/)) {
          dataVencimentoFormatada = `${dataVencimentoCobranca}T09:00:00`
        } else {
          dataVencimentoFormatada = dataVencimentoCobranca
        }
      }

    const dataToInsert = {
      tipo: 'entrada' as const,
      categoria_id: categoria?.id || null,
      cliente_id: clienteId,
      servico_id: formData.servico_id,
      descricao: formData.descricao || servicosDisponiveis.find(s => s.id === formData.servico_id)?.nome || 'Projeto',
      data_competencia: new Date().toISOString().split('T')[0],
      data_vencimento: dataVencimentoFormatada,
      valor: parseFloat(formData.valor) || servicosDisponiveis.find(s => s.id === formData.servico_id)?.valor_base || 0,
      status: 'previsto' as const,
      status_servico: statusServicoId,
    }

    const { data: insertedData, error } = await supabase
      .from('financeiro_lancamentos')
      .insert([dataToInsert])
      .select('id')
      .single()

    if (!error && insertedData) {
      // Criar projeto na tabela projetos se houver data de vencimento
      if (dataVencimentoFormatada) {
        const servicoSelecionado = servicosDisponiveis.find(s => s.id === formData.servico_id)
        const nomeProjeto = formData.descricao || servicoSelecionado?.nome || 'Projeto'
        
        const { data: projetoCriado, error: projetoError } = await supabase
          .from('projetos')
          .insert([{
            nome: nomeProjeto,
            cliente_principal_id: clienteId,
            descricao: formData.descricao || servicoSelecionado?.descricao || null,
            data_inicio: new Date().toISOString().split('T')[0],
            data_fim_prevista: dataVencimentoFormatada,
            valor_previsto: parseFloat(formData.valor) || servicoSelecionado?.valor_base || 0,
            status: 'em_andamento',
            progresso: 0,
          }])
          .select('id')
          .single()

        // Se o projeto foi criado, atualizar o lançamento com o projeto_id
        if (projetoCriado && !projetoError) {
          await supabase
            .from('financeiro_lancamentos')
            .update({ projeto_id: projetoCriado.id })
            .eq('id', insertedData.id)
        }
      }

      // Criar cobrança/assinatura no Asaas apenas se o usuário optou por isso
      if (formData.criarCobrancaAutomaticamente) {
        try {
          const response = await fetch('/api/asaas/create-charge', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ lancamentoId: insertedData.id }),
          })

          const result = await response.json()
          
          if (!response.ok) {
            // Se o erro for porque o cliente não está no Asaas, apenas avisa
            if (result.skipAsaas) {
              console.warn('Projeto adicionado no sistema, mas não foi possível criar no Asaas:', result.error)
            } else {
              console.warn('Erro ao criar cobrança/assinatura no Asaas:', result.error)
            }
          }
        } catch (asaasError: any) {
          // Não bloqueia a criação do projeto se houver erro no Asaas
          console.warn('Erro ao criar cobrança/assinatura no Asaas:', asaasError.message)
        }
      }

      const primeiraColunaId = colunasKanban.length > 0 ? colunasKanban[0].id : ''
      setFormData({
        servico_id: '',
        valor: '',
        data_vencimento: '',
        data_proxima_assinatura: '',
        descricao: '',
        status_servico: primeiraColunaId,
        criarCobrancaAutomaticamente: true,
      })
      onSuccess()
    } else {
      await alert('Erro ao adicionar projeto: ' + error?.message, 'Erro')
    }
    setLoading(false)
  }

  const handleServicoChange = (servicoId: string) => {
    const servico = servicosDisponiveis.find(s => s.id === servicoId)
    const isAssinaturaServico = servico?.tipo === 'assinatura'
    
    // Se for assinatura, preencher data_proxima_assinatura com data_vencimento_faturas do serviço
    const dataProximaAssinatura = isAssinaturaServico && servico?.data_vencimento_faturas
      ? servico.data_vencimento_faturas.split('T')[0]
      : ''
    
    setFormData({
      ...formData,
      servico_id: servicoId,
      valor: servico?.valor_base.toString() || '',
      descricao: servico?.nome || '',
      data_proxima_assinatura: dataProximaAssinatura,
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adicionar Projeto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Serviço *
          </label>
          <select
            required
            value={formData.servico_id}
            onChange={(e) => handleServicoChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Selecione um serviço</option>
            {servicosDisponiveis.map((servico) => (
              <option key={servico.id} value={servico.id}>
                {servico.nome} - {formatCurrency(Number(servico.valor_base))}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor *
          </label>
          <input
            type="number"
            step="0.01"
            required
            value={formData.valor}
            onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="0.00"
          />
        </div>

        {isAssinatura && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data da Próxima Assinatura *
            </label>
            <input
              type="date"
              required={isAssinatura}
              value={formData.data_proxima_assinatura}
              onChange={(e) => setFormData({ ...formData, data_proxima_assinatura: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Data de vencimento personalizada para as cobranças deste cliente
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data de Vencimento *
          </label>
          <input
            type="date"
            required
            value={formData.data_vencimento}
            onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
            <p className="text-xs text-gray-500 mt-1">
              Data final que o projeto precisa ser entregue
            </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição
          </label>
          <textarea
            value={formData.descricao}
            onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Descrição do projeto"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status do Projeto *
          </label>
          <select
            required
            value={formData.status_servico || colunasKanban[0]?.id || ''}
            onChange={(e) => setFormData({ ...formData, status_servico: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {colunasKanban.map((coluna) => (
              <option key={coluna.id} value={coluna.id}>
                {coluna.nome}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Selecione a etapa atual do projeto
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Criar cobrança automaticamente
          </label>
          <div className="relative inline-flex rounded-lg border border-gray-300 overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, criarCobrancaAutomaticamente: true })}
              className={`px-6 py-2.5 text-sm font-medium transition-all duration-200 ${
                formData.criarCobrancaAutomaticamente
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, criarCobrancaAutomaticamente: false })}
              className={`px-6 py-2.5 text-sm font-medium transition-all duration-200 border-l border-gray-300 ${
                !formData.criarCobrancaAutomaticamente
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Não
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {formData.criarCobrancaAutomaticamente
              ? 'A cobrança/assinatura será criada no Asaas automaticamente'
              : 'A cobrança/assinatura será criada apenas no sistema, sem integração com o Asaas'}
          </p>
        </div>

        <div className="flex gap-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-white text-gray-700 px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Adicionando...' : 'Adicionar Projeto'}
          </button>
        </div>
      </form>
    </Modal>
  )
}


