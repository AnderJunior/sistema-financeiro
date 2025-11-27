// lib/automations/triggerManager.ts

import { createClient } from '@/lib/supabase/client'
import { AutomationNode, AutomationEdge } from '@/types/automation.types'
import { executeWorkflow } from './executor'

/**
 * Gerencia e executa gatilhos automaticamente baseado em eventos do sistema
 */
export class TriggerManager {
  private static instance: TriggerManager | null = null
  private subscriptions: Map<string, any> = new Map()
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map()
  private isInitialized = false

  private constructor() {}

  static getInstance(): TriggerManager {
    if (!TriggerManager.instance) {
      TriggerManager.instance = new TriggerManager()
    }
    return TriggerManager.instance
  }

  /**
   * Inicializa o monitoramento de todos os fluxos ativos
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('[TriggerManager] Já inicializado, recarregando...')
      await this.reloadActiveFlows()
      return
    }

    console.log('[TriggerManager] Inicializando...')
    const supabase = createClient()
    
    // Buscar todos os fluxos ativos
    const { data: fluxos, error } = await supabase
      .from('fluxos_automacao')
      .select('*')
      .eq('status', 'ativo')

    if (error) {
      console.error('[TriggerManager] Erro ao carregar fluxos:', error)
      return
    }

    if (!fluxos || fluxos.length === 0) {
      console.log('[TriggerManager] Nenhum fluxo ativo encontrado')
      this.isInitialized = true
      return
    }

    console.log(`[TriggerManager] Encontrados ${fluxos.length} fluxos ativos`)

    // Configurar triggers para cada fluxo
    for (const fluxo of fluxos) {
      console.log(`[TriggerManager] Configurando triggers para fluxo: ${fluxo.nome} (${fluxo.id})`)
      await this.setupTriggersForFlow(fluxo)
    }

    // Configurar verificação periódica para gatilhos baseados em tempo
    this.setupPeriodicChecks()

    this.isInitialized = true
    console.log('[TriggerManager] Inicializado com sucesso')
  }

  /**
   * Configura os triggers para um fluxo específico
   */
  async setupTriggersForFlow(fluxo: any) {
    const config = fluxo.configuracao as any || {}
    const nodes = config.nodes || []
    const edges = config.edges || []

    if (!nodes || nodes.length === 0) {
      console.log(`[TriggerManager] Fluxo ${fluxo.id} não tem nós configurados`)
      return
    }

    // Encontrar todos os gatilhos do fluxo (exceto manual)
    const triggers = nodes.filter((node: AutomationNode) => 
      node.type.startsWith('gatilho') && node.type !== 'gatilhoManual'
    )

    if (triggers.length === 0) {
      console.log(`[TriggerManager] Fluxo ${fluxo.id} não tem gatilhos automáticos`)
      return
    }

    console.log(`[TriggerManager] Configurando ${triggers.length} gatilho(s) para fluxo ${fluxo.id}`)

    for (const trigger of triggers) {
      console.log(`[TriggerManager] Configurando gatilho: ${trigger.type} (${trigger.id})`)
      await this.setupTrigger(trigger, nodes, edges, fluxo.id)
    }
  }

  /**
   * Configura um trigger específico
   */
  async setupTrigger(
    triggerNode: AutomationNode,
    nodes: AutomationNode[],
    edges: AutomationEdge[],
    flowId: string
  ) {
    const triggerId = `${flowId}-${triggerNode.id}`

    switch (triggerNode.type) {
      case 'gatilhoNovaCobranca':
        await this.setupNovaCobrancaTrigger(triggerId, nodes, edges, flowId)
        break
      case 'gatilhoNovoCliente':
        await this.setupNovoClienteTrigger(triggerId, nodes, edges, flowId)
        break
      case 'gatilhoNovoProjeto':
        await this.setupNovoProjetoTrigger(triggerId, nodes, edges, flowId)
        break
      case 'gatilhoMudancaStatusCobranca':
        await this.setupMudancaStatusCobrancaTrigger(triggerId, triggerNode, nodes, edges, flowId)
        break
      case 'gatilhoDataAgenda':
        await this.setupDataAgendaTrigger(triggerId, triggerNode, nodes, edges, flowId)
        break
      case 'gatilhoVencimentoProximo':
        await this.setupVencimentoProximoTrigger(triggerId, triggerNode, nodes, edges, flowId)
        break
      case 'gatilhoVolumeFinanceiro':
        await this.setupVolumeFinanceiroTrigger(triggerId, triggerNode, nodes, edges, flowId)
        break
    }
  }

  /**
   * Gatilho: Nova Cobrança
   */
  private async setupNovaCobrancaTrigger(
    triggerId: string,
    nodes: AutomationNode[],
    edges: AutomationEdge[],
    flowId: string
  ) {
    const supabase = createClient()
    
    // Remover subscription anterior se existir
    if (this.subscriptions.has(triggerId)) {
      await supabase.removeChannel(this.subscriptions.get(triggerId))
    }

    const channel = supabase
      .channel(`nova_cobranca_${triggerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'financeiro_lancamentos',
          filter: 'tipo=eq.entrada'
        },
        async (payload) => {
          console.log('Nova cobrança detectada:', payload.new)
          await this.executeFlow(nodes, edges, flowId, {
            tipo: 'nova_cobranca',
            cobranca: payload.new
          })
        }
      )
      .subscribe()

    this.subscriptions.set(triggerId, channel)
  }

  /**
   * Gatilho: Novo Cliente
   */
  private async setupNovoClienteTrigger(
    triggerId: string,
    nodes: AutomationNode[],
    edges: AutomationEdge[],
    flowId: string
  ) {
    const supabase = createClient()
    
    // Remover subscription anterior se existir
    if (this.subscriptions.has(triggerId)) {
      const oldChannel = this.subscriptions.get(triggerId)
      await supabase.removeChannel(oldChannel)
      this.subscriptions.delete(triggerId)
      console.log(`[TriggerManager] Removida subscription anterior para ${triggerId}`)
    }

    console.log(`[TriggerManager] Configurando subscription para novo cliente: ${triggerId}`)

    const channel = supabase
      .channel(`novo_cliente_${triggerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'clientes'
        },
        async (payload) => {
          console.log('[TriggerManager] ✅ Novo cliente detectado:', payload.new)
          console.log(`[TriggerManager] Executando fluxo ${flowId} com gatilho novo_cliente`)
          await this.executeFlow(nodes, edges, flowId, {
            tipo: 'novo_cliente',
            cliente: payload.new
          })
        }
      )
      .subscribe((status) => {
        console.log(`[TriggerManager] Status da subscription ${triggerId}:`, status)
        if (status === 'SUBSCRIBED') {
          console.log(`[TriggerManager] ✅ Subscription ativa para novo cliente: ${triggerId}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[TriggerManager] ❌ Erro na subscription ${triggerId}`)
        }
      })

    this.subscriptions.set(triggerId, channel)
  }

  /**
   * Gatilho: Novo Projeto
   */
  private async setupNovoProjetoTrigger(
    triggerId: string,
    nodes: AutomationNode[],
    edges: AutomationEdge[],
    flowId: string
  ) {
    const supabase = createClient()
    
    if (this.subscriptions.has(triggerId)) {
      await supabase.removeChannel(this.subscriptions.get(triggerId))
    }

    const channel = supabase
      .channel(`novo_projeto_${triggerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'financeiro_lancamentos',
          filter: 'tipo=eq.entrada'
        },
        async (payload) => {
          // Verificar se é um projeto (tem servico_id e status_servico)
          if (payload.new.servico_id && payload.new.status_servico) {
            console.log('Novo projeto detectado:', payload.new)
            await this.executeFlow(nodes, edges, flowId, {
              tipo: 'novo_projeto',
              projeto: payload.new
            })
          }
        }
      )
      .subscribe()

    this.subscriptions.set(triggerId, channel)
  }

  /**
   * Gatilho: Mudança de Status da Cobrança
   */
  private async setupMudancaStatusCobrancaTrigger(
    triggerId: string,
    triggerNode: AutomationNode,
    nodes: AutomationNode[],
    edges: AutomationEdge[],
    flowId: string
  ) {
    const supabase = createClient()
    
    if (this.subscriptions.has(triggerId)) {
      await supabase.removeChannel(this.subscriptions.get(triggerId))
    }

    const values = triggerNode.data.values || {}
    const statusNovo = values.statusNovo?.value || values.statusNovo

    const channel = supabase
      .channel(`mudanca_status_${triggerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'financeiro_lancamentos',
          filter: 'tipo=eq.entrada'
        },
        async (payload) => {
          const oldStatus = payload.old.status
          const newStatus = payload.new.status

          // Verificar se o status mudou e corresponde ao filtro
          if (oldStatus !== newStatus) {
            // Se não há filtro específico ou o novo status corresponde ao filtro
            if (!statusNovo || newStatus === statusNovo || 
                (statusNovo === 'pendente' && newStatus === 'previsto') ||
                (statusNovo === 'atrasado' && newStatus === 'em_atraso')) {
              console.log('Mudança de status detectada:', { oldStatus, newStatus })
              await this.executeFlow(nodes, edges, flowId, {
                tipo: 'mudanca_status_cobranca',
                cobranca: payload.new,
                statusAnterior: oldStatus,
                statusNovo: newStatus
              })
            }
          }
        }
      )
      .subscribe()

    this.subscriptions.set(triggerId, channel)
  }

  /**
   * Gatilho: Agendado por Data
   */
  private async setupDataAgendaTrigger(
    triggerId: string,
    triggerNode: AutomationNode,
    nodes: AutomationNode[],
    edges: AutomationEdge[],
    flowId: string
  ) {
    const values = triggerNode.data.values || {}
    const date = values.date?.value || values.date
    const dayOfMonth = values.dayOfMonth?.value || values.dayOfMonth
    const time = values.time?.value || values.time || '00:00'

    // Se há uma data específica
    if (date) {
      const targetDate = new Date(date)
      const now = new Date()
      
      if (targetDate > now) {
        const delay = targetDate.getTime() - now.getTime()
        const timeout = setTimeout(async () => {
          await this.executeFlow(nodes, edges, flowId, {
            tipo: 'data_agenda',
            data: date
          })
        }, delay)
        
        this.scheduledJobs.set(triggerId, timeout)
      }
    }
    
    // Se há um dia do mês (executar todo mês)
    if (dayOfMonth) {
      this.scheduleMonthlyJob(triggerId, dayOfMonth, time, nodes, edges, flowId)
    }
  }

  /**
   * Agenda uma execução mensal
   */
  private scheduleMonthlyJob(
    triggerId: string,
    dayOfMonth: number,
    time: string,
    nodes: AutomationNode[],
    edges: AutomationEdge[],
    flowId: string
  ) {
    const [hours, minutes] = time.split(':').map(Number)
    
    const checkAndSchedule = () => {
      const now = new Date()
      const targetDate = new Date(now.getFullYear(), now.getMonth(), dayOfMonth, hours, minutes, 0)
      
      // Se já passou este mês, agendar para o próximo mês
      if (targetDate < now) {
        targetDate.setMonth(targetDate.getMonth() + 1)
      }
      
      const delay = targetDate.getTime() - now.getTime()
      
      const timeout = setTimeout(async () => {
        await this.executeFlow(nodes, edges, flowId, {
          tipo: 'data_agenda',
          diaDoMes: dayOfMonth
        })
        
        // Agendar novamente para o próximo mês
        this.scheduleMonthlyJob(triggerId, dayOfMonth, time, nodes, edges, flowId)
      }, delay)
      
      this.scheduledJobs.set(triggerId, timeout)
    }
    
    checkAndSchedule()
  }

  /**
   * Gatilho: Vencimento Próximo
   */
  private async setupVencimentoProximoTrigger(
    triggerId: string,
    triggerNode: AutomationNode,
    nodes: AutomationNode[],
    edges: AutomationEdge[],
    flowId: string
  ) {
    const values = triggerNode.data.values || {}
    const diasAntes = values.diasAntes?.value || values.diasAntes || 7

    // Verificar diariamente
    const checkVencimentos = async () => {
      const supabase = createClient()
      const hoje = new Date()
      const dataLimite = new Date(hoje)
      dataLimite.setDate(hoje.getDate() + Number(diasAntes))
      
      const { data: cobrancas } = await supabase
        .from('financeiro_lancamentos')
        .select('*')
        .eq('tipo', 'entrada')
        .in('status', ['previsto', 'em_atraso'])
        .gte('data_vencimento', hoje.toISOString().split('T')[0])
        .lte('data_vencimento', dataLimite.toISOString().split('T')[0])

      if (cobrancas && cobrancas.length > 0) {
        for (const cobranca of cobrancas) {
          await this.executeFlow(nodes, edges, flowId, {
            tipo: 'vencimento_proximo',
            cobranca,
            diasAntes
          })
        }
      }
    }

    // Executar imediatamente e depois diariamente
    await checkVencimentos()
    const interval = setInterval(checkVencimentos, 24 * 60 * 60 * 1000) // 24 horas
    this.scheduledJobs.set(triggerId, interval as any)
  }

  /**
   * Gatilho: Volume Financeiro
   */
  private async setupVolumeFinanceiroTrigger(
    triggerId: string,
    triggerNode: AutomationNode,
    nodes: AutomationNode[],
    edges: AutomationEdge[],
    flowId: string
  ) {
    const values = triggerNode.data.values || {}
    const tipo = values.tipo?.value || values.tipo
    const operador = values.operador?.value || values.operador
    const valor = Number(values.valor?.value || values.valor || 0)

    // Verificar a cada hora
    const checkVolume = async () => {
      const supabase = createClient()
      const hoje = new Date()
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      
      let total = 0
      
      if (tipo === 'entrada' || tipo === 'saldo') {
        const { data: entradas } = await supabase
          .from('financeiro_lancamentos')
          .select('valor')
          .eq('tipo', 'entrada')
          .eq('status', 'pago')
          .gte('data_competencia', inicioMes.toISOString().split('T')[0])
        
        total += entradas?.reduce((acc, item) => acc + Number(item.valor), 0) || 0
      }
      
      if (tipo === 'saida' || tipo === 'saldo') {
        const { data: saidas } = await supabase
          .from('financeiro_lancamentos')
          .select('valor')
          .eq('tipo', 'saida')
          .eq('status', 'pago')
          .gte('data_competencia', inicioMes.toISOString().split('T')[0])
        
        const totalSaidas = saidas?.reduce((acc, item) => acc + Number(item.valor), 0) || 0
        
        if (tipo === 'saldo') {
          total -= totalSaidas
        } else {
          total = totalSaidas
        }
      }
      
      let shouldTrigger = false
      
      switch (operador) {
        case '>':
          shouldTrigger = total > valor
          break
        case '<':
          shouldTrigger = total < valor
          break
        case '=':
          shouldTrigger = Math.abs(total - valor) < 0.01 // Tolerância para comparação de float
          break
      }
      
      if (shouldTrigger) {
        await this.executeFlow(nodes, edges, flowId, {
          tipo: 'volume_financeiro',
          tipoVolume: tipo,
          operador,
          valorLimite: valor,
          valorAtual: total
        })
      }
    }

    // Executar imediatamente e depois a cada hora
    await checkVolume()
    const interval = setInterval(checkVolume, 60 * 60 * 1000) // 1 hora
    this.scheduledJobs.set(triggerId, interval as any)
  }

  /**
   * Configura verificações periódicas
   */
  private setupPeriodicChecks() {
    // Verificar fluxos ativos a cada 5 minutos para garantir que todos os triggers estão configurados
    setInterval(async () => {
      await this.reloadActiveFlows()
    }, 5 * 60 * 1000) // 5 minutos
  }

  /**
   * Recarrega todos os fluxos ativos
   */
  async reloadActiveFlows() {
    const supabase = createClient()
    const { data: fluxos } = await supabase
      .from('fluxos_automacao')
      .select('*')
      .eq('status', 'ativo')

    if (fluxos) {
      // Remover triggers antigos
      const currentFlowIds = new Set(fluxos.map(f => f.id))
      for (const [triggerId] of this.subscriptions.entries()) {
        const flowId = triggerId.split('-')[0]
        if (!currentFlowIds.has(flowId)) {
          await this.removeTriggersForFlow(flowId)
        }
      }

      // Configurar triggers para cada fluxo
      for (const fluxo of fluxos) {
        await this.setupTriggersForFlow(fluxo)
      }
    }
  }

  /**
   * Executa um fluxo com contexto específico
   */
  private async executeFlow(
    nodes: AutomationNode[],
    edges: AutomationEdge[],
    flowId: string,
    context: any
  ) {
    try {
      // Encontrar o nó gatilho correspondente
      let triggerType = ''
      switch (context.tipo) {
        case 'nova_cobranca':
          triggerType = 'gatilhoNovaCobranca'
          break
        case 'novo_cliente':
          triggerType = 'gatilhoNovoCliente'
          break
        case 'novo_projeto':
          triggerType = 'gatilhoNovoProjeto'
          break
        case 'mudanca_status_cobranca':
          triggerType = 'gatilhoMudancaStatusCobranca'
          break
        case 'data_agenda':
          triggerType = 'gatilhoDataAgenda'
          break
        case 'vencimento_proximo':
          triggerType = 'gatilhoVencimentoProximo'
          break
        case 'volume_financeiro':
          triggerType = 'gatilhoVolumeFinanceiro'
          break
      }

      if (!triggerType) {
        console.warn(`[TriggerManager] Tipo de gatilho não reconhecido: ${context.tipo}`)
        return
      }

      // Verificar se o gatilho existe no fluxo
      const triggerNode = nodes.find(n => n.type === triggerType)
      if (!triggerNode) {
        console.warn(`[TriggerManager] Gatilho ${triggerType} não encontrado no fluxo ${flowId}`)
        const availableTriggers = nodes.filter(n => n.type.startsWith('gatilho')).map(n => n.type)
        console.log(`[TriggerManager] Gatilhos disponíveis no fluxo:`, availableTriggers)
        return
      }

      console.log(`[TriggerManager] ✅ Gatilho encontrado: ${triggerNode.id} (${triggerType})`)
      console.log(`[TriggerManager] Iniciando execução do fluxo ${flowId}...`)

      // Executar o fluxo começando pelo gatilho
      const result = await executeWorkflow(
        nodes,
        edges,
        {
          onLog: (nodeId, level, message, data) => {
            console.log(`[TriggerManager][${flowId}] ${level}: ${message}`, data)
          },
          onNodeStart: (nodeId) => {
            console.log(`[TriggerManager][${flowId}] ▶️ Nó iniciado: ${nodeId}`)
          },
          onNodeComplete: (nodeId, output) => {
            console.log(`[TriggerManager][${flowId}] ✅ Nó completado: ${nodeId}`, output)
          },
          onNodeError: (nodeId, error) => {
            console.error(`[TriggerManager][${flowId}] ❌ Erro no nó ${nodeId}:`, error)
          }
        },
        triggerType,
        context
      )

      if (result.success) {
        console.log(`[TriggerManager] ✅ Fluxo ${flowId} executado com sucesso`)
      } else {
        console.error(`[TriggerManager] ❌ Fluxo ${flowId} executado com erros:`, result.errors)
      }
    } catch (error) {
      console.error(`[TriggerManager] ❌ Erro ao executar fluxo ${flowId}:`, error)
      if (error instanceof Error) {
        console.error(`[TriggerManager] Stack trace:`, error.stack)
      }
    }
  }

  /**
   * Remove todos os triggers de um fluxo
   */
  async removeTriggersForFlow(flowId: string) {
    const supabase = createClient()
    
    // Remover subscriptions
    for (const [triggerId, channel] of this.subscriptions.entries()) {
      if (triggerId.startsWith(flowId)) {
        await supabase.removeChannel(channel)
        this.subscriptions.delete(triggerId)
      }
    }
    
    // Remover jobs agendados
    for (const [triggerId, job] of this.scheduledJobs.entries()) {
      if (triggerId.startsWith(flowId)) {
        if (typeof job === 'number') {
          clearTimeout(job)
        } else {
          clearInterval(job)
        }
        this.scheduledJobs.delete(triggerId)
      }
    }
  }

  /**
   * Limpa todos os recursos
   */
  async cleanup() {
    const supabase = createClient()
    
    // Remover todas as subscriptions
    for (const channel of this.subscriptions.values()) {
      await supabase.removeChannel(channel)
    }
    this.subscriptions.clear()
    
    // Limpar todos os jobs
    for (const job of this.scheduledJobs.values()) {
      if (typeof job === 'number') {
        clearTimeout(job)
      } else {
        clearInterval(job)
      }
    }
    this.scheduledJobs.clear()
    
    this.isInitialized = false
  }
}

