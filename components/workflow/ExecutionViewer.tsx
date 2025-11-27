'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { WorkflowExecutionState, NodeExecutionState } from '@/types/automation.types'
import { WorkflowCanvas } from './WorkflowCanvas'
import { AutomationNode, AutomationEdge } from '@/types/automation.types'
import { NodeInspector } from './NodeInspector'
import { ExecutionLogsPanel } from './ExecutionLogsPanel'
import { Node } from 'reactflow'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'

interface ExecutionViewerProps {
  execution: WorkflowExecutionState | null
  selectedNodeId: string | null
  onNodeClick: (nodeId: string) => void
  onNodeDeselect?: () => void
  executionId: string
  startedAt: string
  completedAt: string | null
  durationMs: number | null
  status: 'running' | 'completed' | 'failed' | 'paused'
  workflowId: string
}

export function ExecutionViewer({
  execution,
  selectedNodeId,
  onNodeClick,
  onNodeDeselect,
  executionId,
  startedAt,
  completedAt,
  durationMs,
  status,
  workflowId
}: ExecutionViewerProps) {
  const [nodes, setNodes] = useState<AutomationNode[]>([])
  const [edges, setEdges] = useState<AutomationEdge[]>([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [loading, setLoading] = useState(true)

  // Carregar nodes e edges do workflow do banco
  useEffect(() => {
    async function loadWorkflow() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('fluxos_automacao')
          .select('configuracao')
          .eq('id', workflowId)
          .single()

        if (error) {
          console.error('Erro ao carregar workflow:', error)
          return
        }

        if (data?.configuracao) {
          const config = data.configuracao as any
          if (config.nodes) {
            setNodes(config.nodes as AutomationNode[])
          }
          if (config.edges) {
            setEdges(config.edges as AutomationEdge[])
          }
        }
      } catch (error) {
        console.error('Erro ao carregar workflow:', error)
      } finally {
        setLoading(false)
      }
    }

    if (workflowId) {
      loadWorkflow()
    }
  }, [workflowId])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "dd MMM, HH:mm:ss", { locale: ptBR })
    } catch {
      return dateString
    }
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return ''
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(3)}s`
  }

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      case 'running':
        return 'text-primary-600'
      case 'paused':
        return 'text-yellow-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'running':
        return <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
      case 'paused':
        return <Loader2 className="w-4 h-4 text-yellow-600" />
      default:
        return null
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Sucesso'
      case 'failed':
        return 'Erro'
      case 'running':
        return 'Em execução'
      case 'paused':
        return 'Pausado'
      default:
        return status
    }
  }

  // Quando um nó é clicado, mostrar seus dados
  const handleNodeClick = useCallback((nodeId: string) => {
    onNodeClick(nodeId)
    
    // Encontrar o nó nos nodes do workflow
    const node = nodes.find(n => n.id === nodeId)
    if (node) {
      const reactFlowNode: Node = {
        ...node,
        data: node.data
      } as Node
      setSelectedNode(reactFlowNode)
    }
  }, [nodes, onNodeClick])

  // Obter dados do nó selecionado
  const nodeData = useMemo(() => {
    if (!selectedNodeId || !execution) return null
    
    const nodeState = execution.nodeStates[selectedNodeId]
    if (!nodeState) return null

    return {
      nodeId: selectedNodeId,
      status: nodeState.status,
      startedAt: nodeState.startedAt,
      completedAt: nodeState.completedAt,
      error: nodeState.error,
      output: nodeState.output
    }
  }, [selectedNodeId, execution])

  // Identificar nós com erro para destacar visualmente
  const nodesWithErrors = useMemo(() => {
    if (!execution) return new Set<string>()
    
    const errorNodes = new Set<string>()
    // Contar apenas nós que realmente falharam (status === 'error')
    Object.entries(execution.nodeStates).forEach(([nodeId, state]) => {
      if (state.status === 'error') {
        errorNodes.add(nodeId)
      }
    })
    
    return errorNodes
  }, [execution])

  if (!execution) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Nenhuma execução selecionada
      </div>
    )
  }

  const [isLogsExpanded, setIsLogsExpanded] = useState(false)

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Header da Execução */}
      <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          {getStatusIcon()}
          <span className="text-sm font-medium text-gray-900">
            {formatDate(startedAt)}
          </span>
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
          {durationMs !== null && (
            <span className="text-sm text-gray-500">
              em {formatDuration(durationMs)}
            </span>
          )}
          <span className="text-sm text-gray-400">|</span>
          <span className="text-sm text-gray-500">ID#{executionId.slice(-5)}</span>
        </div>
      </div>

      {/* Área Principal: Canvas + Node Inspector */}
      <div className="flex-1 flex overflow-hidden relative" style={{ minHeight: 0 }}>
        {/* Indicador de nós com erro */}
        {nodesWithErrors.size > 0 && (
          <div className="absolute top-4 left-4 z-20 bg-red-50 border border-red-200 rounded-lg p-3 shadow-lg">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-900">
                  {nodesWithErrors.size} {nodesWithErrors.size === 1 ? 'nó com erro' : 'nós com erro'}
                </p>
                <p className="text-xs text-red-700 mt-1">
                  {Array.from(nodesWithErrors).map(nodeId => {
                    const node = nodes.find(n => n.id === nodeId)
                    return node?.data?.label || nodeId
                  }).join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Canvas do Workflow */}
        <div 
          className="relative bg-gray-50" 
          style={{ 
            minHeight: 0,
            width: selectedNode ? 'calc(100% - 400px)' : '100%',
            transition: 'width 0.3s ease'
          }}
        >
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              Carregando workflow...
            </div>
          ) : nodes.length > 0 ? (
            <WorkflowCanvas
              initialNodes={nodes}
              initialEdges={edges}
              onNodesChange={setNodes}
              onEdgesChange={setEdges}
              onNodeSelect={(node) => {
                if (node) {
                  handleNodeClick(node.id)
                }
              }}
              workflowId={executionId}
              enableExecution={false}
              executionState={execution}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              Nenhum workflow encontrado
            </div>
          )}
        </div>

        {/* Node Inspector à direita */}
        {selectedNode && (
          <div 
            className="absolute right-0 top-0 bottom-0 bg-white border-l border-gray-200 shadow-2xl z-50 overflow-y-auto"
            style={{ width: '400px' }}
          >
            <NodeInspector
              selectedNode={selectedNode}
              onUpdate={() => {}}
              onClose={() => {
                setSelectedNode(null)
                onNodeDeselect?.()
              }}
              nodes={nodes}
              edges={edges}
              readOnly={true}
            />
          </div>
        )}
      </div>

      {/* Painel de Logs na parte inferior */}
      <div className="flex-shrink-0 relative z-30">
        <ExecutionLogsPanel
          executionState={execution}
          selectedNodeId={selectedNodeId}
          onExpandedChange={setIsLogsExpanded}
        />
      </div>
    </div>
  )
}
