// lib/automations/executor.ts

import { AutomationNode, AutomationEdge, WorkflowEvent } from '@/types/automation.types'
import { executeNode } from './nodes/executors'

export interface ExecutionContext {
  variables: Record<string, any>
  errors: string[]
}

export interface ExecutionResult {
  success: boolean
  errors: string[]
  output?: any
}

export interface ExecutionCallbacks {
  onEvent?: (event: WorkflowEvent) => void
  onNodeStart?: (nodeId: string) => void
  onNodeComplete?: (nodeId: string, output?: any) => void
  onNodeError?: (nodeId: string, error: string) => void
  onEdgeActivate?: (edgeId: string, sourceNodeId: string, targetNodeId: string) => void
  onLog?: (nodeId: string, level: 'info' | 'warning' | 'error' | 'success', message: string, data?: any) => void
}

/**
 * Executa um workflow começando pelo gatilho especificado
 */
export async function executeWorkflow(
  nodes: AutomationNode[],
  edges: AutomationEdge[],
  callbacks?: ExecutionCallbacks,
  triggerType?: string,
  triggerContext?: any
): Promise<ExecutionResult> {
  const executionId = `exec-${Date.now()}`
  const context: ExecutionContext = {
    variables: {},
    errors: []
  }

  // Se há contexto do trigger, adicionar ao contexto de execução
  if (triggerContext) {
    context.variables['__trigger__'] = triggerContext
  }

  // Helper para criar eventos
  const createEvent = (type: WorkflowEvent['type'], payload: any): WorkflowEvent => ({
    type,
    executionId,
    timestamp: new Date().toISOString(),
    payload
  })

  try {
    // Emitir evento de início
    callbacks?.onEvent?.(createEvent('execution:started', {}))
    callbacks?.onLog?.('', 'info', 'Iniciando execução do fluxo')

    // Encontrar o nó gatilho (manual ou o tipo especificado)
    let triggerNode: AutomationNode | undefined
    
    if (triggerType) {
      // Buscar gatilho específico
      triggerNode = nodes.find(n => n.type === triggerType)
    } else {
      // Buscar gatilho manual (padrão para execução manual)
      triggerNode = nodes.find(n => n.type === 'gatilhoManual')
    }
    
    if (!triggerNode) {
      // Tentar encontrar qualquer gatilho se não encontrou o especificado
      triggerNode = nodes.find(n => n.type.startsWith('gatilho'))
    }
    
    if (!triggerNode) {
      const errorMsg = 'Nenhum gatilho encontrado no fluxo'
      callbacks?.onEvent?.(createEvent('execution:failed', { error: errorMsg }))
      return {
        success: false,
        errors: [errorMsg]
      }
    }

    // Executar o fluxo começando pelo gatilho encontrado
    await executeNodeRecursive(
      triggerNode.id,
      nodes,
      edges,
      context,
      executionId,
      callbacks
    )

    // Emitir evento de conclusão
    if (context.errors.length === 0) {
      callbacks?.onEvent?.(createEvent('execution:completed', {}))
      callbacks?.onLog?.('', 'success', 'Fluxo executado com sucesso')
    } else {
      callbacks?.onEvent?.(createEvent('execution:failed', { errors: context.errors }))
      callbacks?.onLog?.('', 'error', `Fluxo executado com ${context.errors.length} erro(s)`)
    }

    return {
      success: context.errors.length === 0,
      errors: context.errors,
      output: context.variables
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido ao executar fluxo'
    callbacks?.onEvent?.(createEvent('execution:failed', { error: errorMsg }))
    callbacks?.onLog?.('', 'error', errorMsg)
    
    return {
      success: false,
      errors: [
        ...context.errors,
        errorMsg
      ]
    }
  }
}

/**
 * Executa um nó e seus nós seguintes recursivamente com eventos em tempo real
 */
async function executeNodeRecursive(
  nodeId: string,
  nodes: AutomationNode[],
  edges: AutomationEdge[],
  context: ExecutionContext,
  executionId: string,
  callbacks?: ExecutionCallbacks
): Promise<void> {
  const node = nodes.find(n => n.id === nodeId)
  if (!node) {
    const errorMsg = `Nó ${nodeId} não encontrado`
    context.errors.push(errorMsg)
    callbacks?.onLog?.(nodeId, 'error', errorMsg)
    return
  }

  // Helper para criar eventos
  const createEvent = (type: WorkflowEvent['type'], payload: any): WorkflowEvent => ({
    type,
    executionId,
    timestamp: new Date().toISOString(),
    payload
  })

  // Emitir evento de início do nó
  callbacks?.onNodeStart?.(nodeId)
  callbacks?.onEvent?.(createEvent('node:started', { nodeId }))
  callbacks?.onLog?.(nodeId, 'info', `Executando nó: ${node.data.label}`)

  // Pequeno delay para visualização (permite ver o estado "running")
  await new Promise(resolve => setTimeout(resolve, 200))

  // Executar o nó atual
  try {
    const result = await executeNode(node, context)
    
    // Se o nó retornou dados, armazenar no contexto
    if (result?.output !== undefined) {
      context.variables[nodeId] = result.output
    }

    // Se houve erro na execução do nó, parar a execução
    if (result?.error) {
      const errorMsg = `Erro ao executar nó ${node.data.label}: ${result.error}`
      context.errors.push(errorMsg)
      callbacks?.onNodeError?.(nodeId, result.error)
      callbacks?.onEvent?.(createEvent('node:failed', { nodeId, error: result.error }))
      callbacks?.onLog?.(nodeId, 'error', errorMsg)
      return
    }

    // Emitir evento de conclusão do nó
    callbacks?.onNodeComplete?.(nodeId, result?.output)
    callbacks?.onEvent?.(createEvent('node:completed', { nodeId, output: result?.output }))
    callbacks?.onLog?.(nodeId, 'success', `Nó ${node.data.label} executado com sucesso`)

    // Encontrar os próximos nós conectados
    const outgoingEdges = edges.filter(e => e.source === nodeId)
    
    // Executar os próximos nós em sequência (para melhor visualização)
    for (const edge of outgoingEdges) {
      // Emitir evento de ativação da edge
      callbacks?.onEdgeActivate?.(edge.id, nodeId, edge.target)
      callbacks?.onEvent?.(createEvent('edge:activated', {
        edgeId: edge.id,
        sourceNodeId: nodeId,
        targetNodeId: edge.target
      }))
      
      // Delay para visualizar a animação da edge (1 segundo para ver a animação completa)
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Executar o próximo nó
      await executeNodeRecursive(edge.target, nodes, edges, context, executionId, callbacks)
    }
  } catch (error) {
    const errorMsg = `Erro ao executar nó ${node.data.label}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    context.errors.push(errorMsg)
    callbacks?.onNodeError?.(nodeId, errorMsg)
    callbacks?.onEvent?.(createEvent('node:failed', { nodeId, error: errorMsg }))
    callbacks?.onLog?.(nodeId, 'error', errorMsg)
  }
}

