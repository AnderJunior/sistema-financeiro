'use client'

import { useState, useCallback, useEffect } from 'react'
import { ArrowLeft, Save, AlertCircle, Plus, X, Play, Code, PlaySquare } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AutomationNode, AutomationEdge, AutomationNodeType, AutomationNodeData, WorkflowExecutionState, NodeExecutionState, EdgeExecutionState, ExecutionLogEntry } from '@/types/automation.types'
import { WorkflowCanvas } from './WorkflowCanvas'
import { NodePalette } from './NodePalette'
import { NodeInspector } from './NodeInspector'
import { ExecutionToast } from './ExecutionToast'
import { ExecutionsTab } from './ExecutionsTab'
import { Node } from 'reactflow'
import { executeWorkflow, ExecutionCallbacks } from '@/lib/automations/executor'
import { createClient } from '@/lib/supabase/client'

interface WorkflowShellProps {
  flowName: string
  flowDescription?: string
  initialNodes: AutomationNode[]
  initialEdges: AutomationEdge[]
  onSave: (nodes: AutomationNode[], edges: AutomationEdge[], flowName?: string) => Promise<void>
  workflowId?: string
  enableRuntimeExecution?: boolean
  flowStatus?: 'ativo' | 'inativo' | 'rascunho'
  onStatusToggle?: (newStatus: 'ativo' | 'inativo') => Promise<void>
}

// Componente de Toggle Switch
interface ToggleSwitchProps {
  checked: boolean
  onChange: () => void
  label?: string
}

function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <div className="flex items-center gap-3">
      {label && (
        <span className={`text-sm font-medium transition-colors ${
          checked ? 'text-green-600' : 'text-gray-300'
        }`}>
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
          checked ? 'bg-green-600' : 'bg-gray-800'
        }`}
        role="switch"
        aria-checked={checked}
        aria-label={checked ? 'Ativo' : 'Inativo'}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

export function WorkflowShell({
  flowName,
  flowDescription,
  initialNodes,
  initialEdges,
  onSave,
  workflowId = 'default-workflow',
  enableRuntimeExecution = true,
  flowStatus = 'inativo',
  onStatusToggle
}: WorkflowShellProps) {
  const router = useRouter()
  const [nodes, setNodes] = useState<AutomationNode[]>(initialNodes)
  const [edges, setEdges] = useState<AutomationEdge[]>(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editedFlowName, setEditedFlowName] = useState(flowName)
  const [executionState, setExecutionState] = useState<WorkflowExecutionState | null>(null)
  const [isLogsExpanded, setIsLogsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'editor' | 'executions'>('editor')
  
  // Não resetar estado de expansão - manter logs visíveis mesmo após execução

  const handleNodeDelete = useCallback((nodeId: string) => {
    // Marcar como deleção manual antes de atualizar estado
    if (typeof window !== 'undefined' && (window as any).manualDeletionRef) {
      (window as any).manualDeletionRef.current = true
    }
    
    // Remover o nó e atualizar estado
    const updatedNodes = nodes.filter((node) => node.id !== nodeId)
    const updatedEdges = edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
    
    setNodes(updatedNodes)
    setEdges(updatedEdges)
    
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null)
    }
  }, [selectedNode, nodes, edges])

  const handleNodeDuplicate = useCallback((nodeId: string) => {
    const nodeToDuplicate = nodes.find(n => n.id === nodeId)
    if (!nodeToDuplicate) return

    const duplicatedNode: AutomationNode = {
      ...nodeToDuplicate,
      id: `${nodeToDuplicate.type}-${Date.now()}`,
      position: {
        x: nodeToDuplicate.position.x + 50,
        y: nodeToDuplicate.position.y + 50
      },
      data: {
        ...nodeToDuplicate.data,
        label: `${nodeToDuplicate.data.label} (cópia)`
      }
    }
    
    setNodes((nds) => [...nds, duplicatedNode])
  }, [nodes])

  // Função para adicionar handlers aos nodes
  const addHandlersToNodes = useCallback((nodesToUpdate: AutomationNode[]): AutomationNode[] => {
    return nodesToUpdate.map(node => ({
      ...node,
      data: {
        ...node.data,
        onDelete: handleNodeDelete,
        onDuplicate: handleNodeDuplicate,
        onDoubleClick: (nodeId: string) => {
          const node = nodesToUpdate.find(n => n.id === nodeId)
          if (node) {
            const reactFlowNode: Node = {
              ...node,
              data: node.data
            } as Node
            setSelectedNode(reactFlowNode)
          }
        }
      } as any
    }))
  }, [handleNodeDelete, handleNodeDuplicate])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setIsSaved(false)
    setEditingTitle(false) // Sair do modo de edição ao salvar
    try {
      await onSave(nodes, edges, editedFlowName)
      setHasUnsavedChanges(false)
      setIsSaved(true)
      // Resetar o estado de "salvo" após 3 segundos
      setTimeout(() => {
        setIsSaved(false)
      }, 3000)
    } catch (error) {
      console.error('Erro ao salvar:', error)
    } finally {
      setIsSaving(false)
    }
  }, [nodes, edges, editedFlowName, onSave])

  useEffect(() => {
    const hasChanges = 
      JSON.stringify(nodes) !== JSON.stringify(initialNodes) ||
      JSON.stringify(edges) !== JSON.stringify(initialEdges) ||
      editedFlowName !== flowName
    setHasUnsavedChanges(hasChanges)
    // Resetar estado de "salvo" quando houver novas alterações
    if (hasChanges && isSaved) {
      setIsSaved(false)
    }
  }, [nodes, edges, initialNodes, initialEdges, isSaved, editedFlowName, flowName])

  // Shortcut Ctrl+S para salvar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  // Alertar sobre alterações não salvas ao sair
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'Você tem alterações não salvas. Deseja realmente sair?'
      )
      if (!confirmed) return
    }
    router.push('/automacoes')
  }, [hasUnsavedChanges, router])

  const handleNodeUpdate = useCallback((nodeId: string, data: Partial<AutomationNode['data']>) => {
    setNodes((nds) => {
      const updatedNodes = nds.map((node) => {
        if (node.id === nodeId) {
          const updatedData = { ...node.data, ...data }
          // Atualizar também o selectedNode se for o mesmo nó
          setSelectedNode((currentSelected) => {
            if (currentSelected && currentSelected.id === nodeId) {
              // Criar uma nova referência para forçar atualização
              const updatedNode = { 
                ...currentSelected, 
                data: updatedData 
              } as Node
              return updatedNode
            }
            return currentSelected
          })
          return { ...node, data: updatedData }
        }
        return node
      })
      return updatedNodes
    })
  }, [])

  const handleAddNode = useCallback((type: string, position: { x: number; y: number }) => {
    // Importar dinamicamente para evitar problemas de SSR
    import('@/lib/automations/nodes/registry').then(({ getNodeById }) => {
      const nodeDef = getNodeById(type)
      const newNode: AutomationNode = {
        id: `${type}-${Date.now()}`,
        type: type as AutomationNodeType,
        position,
        data: {
          label: nodeDef?.label || type,
          description: nodeDef?.description,
          values: {}
        } as AutomationNodeData
      }
      setNodes((nds) => [...nds, newNode])
    }).catch(() => {
      // Fallback para tipos legados
      const newNode: AutomationNode = {
        id: `${type}-${Date.now()}`,
        type: type as AutomationNodeType,
        position,
        data: {
          label: type === 'gatilhoManual' ? 'Gatilho Manual' : 
                type === 'message' ? 'Nova Mensagem' :
                type === 'webhook' ? 'Novo Webhook' :
                type === 'condition' ? 'Nova Condição' :
                type === 'delay' ? 'Aguardar' : 'Fim'
        }
      }
      setNodes((nds) => [...nds, newNode])
    })
  }, [])

  // Verificar se existe um gatilho manual no fluxo
  const hasManualTrigger = nodes.some(n => n.type === 'gatilhoManual')

  const handleExecute = useCallback(async () => {
    if (isExecuting || !hasManualTrigger) return
    
    setIsExecuting(true)
    
    // Inicializar estado de execução
    const executionId = `exec-${Date.now()}`
    let executionHasErrors = false
    const initialState: WorkflowExecutionState = {
      executionId,
      status: 'running',
      startedAt: new Date().toISOString(),
      nodeStates: {},
      edgeStates: {},
      logs: []
    }
    setExecutionState(initialState)

    // Criar callbacks para eventos em tempo real
    const callbacks: ExecutionCallbacks = {
      onNodeStart: (nodeId: string) => {
        setExecutionState((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            currentNodeId: nodeId,
            nodeStates: {
              ...prev.nodeStates,
              [nodeId]: {
                nodeId,
                status: 'running',
                startedAt: new Date().toISOString()
              }
            }
          }
        })
      },
      onNodeComplete: (nodeId: string, output?: any) => {
        setExecutionState((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            nodeStates: {
              ...prev.nodeStates,
              [nodeId]: {
                ...prev.nodeStates[nodeId],
                nodeId,
                status: 'success',
                completedAt: new Date().toISOString(),
                output
              }
            }
          }
        })
      },
      onNodeError: (nodeId: string, error: string) => {
        executionHasErrors = true
        setExecutionState((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            nodeStates: {
              ...prev.nodeStates,
              [nodeId]: {
                ...prev.nodeStates[nodeId],
                nodeId,
                status: 'error',
                completedAt: new Date().toISOString(),
                error
              }
            }
          }
        })
      },
      onEdgeActivate: (edgeId: string, sourceNodeId: string, targetNodeId: string) => {
        setExecutionState((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            edgeStates: {
              ...prev.edgeStates,
              [edgeId]: {
                edgeId,
                isActive: true,
                activatedAt: new Date().toISOString()
              }
            }
          }
        })
        
        // Desativar após 1 segundo para efeito visual
        setTimeout(() => {
          setExecutionState((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              edgeStates: {
                ...prev.edgeStates,
                [edgeId]: {
                  ...prev.edgeStates[edgeId],
                  isActive: false
                }
              }
            }
          })
        }, 1000)
      },
      onLog: (nodeId: string, level: 'info' | 'warning' | 'error' | 'success', message: string, data?: any) => {
        setExecutionState((prev) => {
          if (!prev) return prev
          const logEntry: ExecutionLogEntry = {
            id: `log-${Date.now()}-${Math.random()}`,
            nodeId,
            timestamp: new Date().toISOString(),
            level,
            message,
            data
          }
          return {
            ...prev,
            logs: [...prev.logs, logEntry]
          }
        })
      }
    }
    
    try {
      // Executar o fluxo usando o executor com callbacks
      const result = await executeWorkflow(nodes, edges, callbacks)
      
      // Atualizar estado final usando o estado atual (que foi atualizado pelos callbacks)
      setExecutionState((prev) => {
        if (!prev || prev.executionId !== executionId) return prev
        
        // Calcular duração
        const startTime = prev.startedAt ? new Date(prev.startedAt).getTime() : Date.now()
        const endTime = new Date().getTime()
        const durationMs = endTime - startTime
        
        const finalState: WorkflowExecutionState = {
          ...prev,
          status: result.success ? 'completed' : 'failed',
          completedAt: new Date().toISOString()
        }
        
        // Salvar execução no banco de dados (assíncrono, não bloqueia)
        ;(async () => {
          try {
            const supabase = createClient()
            await supabase
              .from('workflow_executions')
              .insert({
                workflow_id: workflowId,
                execution_id: executionId,
                status: result.success ? 'completed' : 'failed',
                started_at: prev.startedAt,
                completed_at: finalState.completedAt,
                duration_ms: durationMs,
                node_states: prev.nodeStates,
                edge_states: prev.edgeStates,
                logs: prev.logs
              })
          } catch (saveError) {
            console.error('Erro ao salvar execução no banco:', saveError)
          }
        })()
        
        return finalState
      })

      // Não mostrar alerta - o toast será exibido automaticamente
    } catch (error) {
      console.error('Erro ao executar fluxo:', error)
      
      // Atualizar estado de erro usando o estado atual (que foi atualizado pelos callbacks)
      setExecutionState((prev) => {
        if (!prev || prev.executionId !== executionId) return prev
        
        // Calcular duração mesmo em caso de erro
        const startTime = prev.startedAt ? new Date(prev.startedAt).getTime() : Date.now()
        const endTime = new Date().getTime()
        const durationMs = endTime - startTime
        
        const errorState: WorkflowExecutionState = {
          ...prev,
          status: 'failed',
          completedAt: new Date().toISOString()
        }
        
        // Salvar execução com erro no banco de dados (assíncrono, não bloqueia)
        ;(async () => {
          try {
            const supabase = createClient()
            await supabase
              .from('workflow_executions')
              .insert({
                workflow_id: workflowId,
                execution_id: executionId,
                status: 'failed',
                started_at: prev.startedAt,
                completed_at: errorState.completedAt,
                duration_ms: durationMs,
                node_states: prev.nodeStates,
                edge_states: prev.edgeStates,
                logs: prev.logs
              })
          } catch (saveError) {
            console.error('Erro ao salvar execução no banco:', saveError)
          }
        })()
        
        return errorState
      })
      
      // Não mostrar alerta - o toast será exibido automaticamente
    } finally {
      setIsExecuting(false)
      // Não limpar o estado de execução automaticamente - manter logs e estados dos nós visíveis
    }
  }, [nodes, edges, isExecuting, hasManualTrigger])

  return (
    <div className="flex flex-col h-screen bg-gray-50" style={{ height: '100vh', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex flex-col bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4 flex-1 min-w-0" style={{ maxWidth: '500px' }}>
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar
            </button>
            {editingTitle ? (
              <input
                type="text"
                value={editedFlowName}
                onChange={(e) => setEditedFlowName(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setEditingTitle(false)
                  } else if (e.key === 'Escape') {
                    setEditedFlowName(flowName)
                    setEditingTitle(false)
                  }
                }}
                className="text-xl font-bold text-gray-900 bg-transparent border-b-2 border-primary-500 focus:outline-none focus:border-primary-600 flex-1 min-w-0"
                autoFocus
              />
            ) : (
              <h1 
                onDoubleClick={() => setEditingTitle(true)}
                className="text-xl font-bold text-gray-900 cursor-text hover:text-primary-600 transition-colors flex-1 min-w-0 truncate"
                title="Duplo clique para editar"
              >
                {editedFlowName}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">Alterações não salvas</span>
              </div>
            )}
            {onStatusToggle && (
              <ToggleSwitch
                checked={flowStatus === 'ativo'}
                onChange={() => {
                  const newStatus = flowStatus === 'ativo' ? 'inativo' : 'ativo'
                  onStatusToggle(newStatus)
                }}
                label={flowStatus === 'ativo' ? 'Ativo' : 'Inativo'}
              />
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || (!hasUnsavedChanges && !isSaved)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                isSaved
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Salvando...' : isSaved ? 'Salvo' : 'Salvar Fluxo'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 border-t border-gray-200">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'editor'
                ? 'text-primary-600 border-primary-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <Code className="w-4 h-4" />
            Editor
          </button>
          <button
            onClick={() => setActiveTab('executions')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'executions'
                ? 'text-primary-600 border-primary-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <PlaySquare className="w-4 h-4" />
            Execuções
          </button>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'executions' ? (
        <div className="flex-1 overflow-hidden">
          <ExecutionsTab workflowId={workflowId} />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden relative">
          {/* Node Palette - Overlay */}
          {isPaletteOpen && (
            <div className="absolute left-0 top-0 bottom-0 z-50 shadow-2xl">
              <NodePalette onAddNode={handleAddNode} />
            </div>
          )}

          {/* Canvas */}
          <div className="flex-1 relative bg-white" style={{ minHeight: 0 }}>
          {/* Botão + no canto superior direito */}
          <button
            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
            className={`absolute top-4 ${isPaletteOpen ? "left-[280px]" : "left-4"} z-40 w-10 h-10 bg-white text-black rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors shadow-lg`}
            title={isPaletteOpen ? 'Fechar blocos disponíveis' : 'Abrir blocos disponíveis'}
          >
            {isPaletteOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
          </button>

          {/* Botão de Executar Fluxo - Posicionado acima dos logs ou na parte inferior */}
          <div 
            className={`absolute left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
              executionState && executionState.logs && executionState.logs.length > 0
                ? (isLogsExpanded ? 'bottom-[400px]' : 'bottom-[52px]')
                : 'bottom-6'
            }`}
          >
            <button
              onClick={handleExecute}
              disabled={isExecuting || !hasManualTrigger}
              className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              title={!hasManualTrigger ? 'Adicione um gatilho manual para executar o fluxo' : 'Executar fluxo'}
            >
              <Play className="w-5 h-5" />
              {isExecuting ? 'Executando...' : 'Executar Fluxo'}
            </button>
          </div>

          <WorkflowCanvas
            initialNodes={addHandlersToNodes(nodes)}
            initialEdges={edges}
            onNodesChange={(updatedNodes) => {
              // Os handlers já foram removidos pelo WorkflowCanvas antes de notificar
              setNodes(updatedNodes)
            }}
            onEdgesChange={setEdges}
            onNodeSelect={setSelectedNode}
            onNodeDelete={handleNodeDelete}
            onNodeDuplicate={handleNodeDuplicate}
            onNodeDoubleClick={(nodeId) => {
              const node = nodes.find(n => n.id === nodeId)
              if (node) {
                // Converter AutomationNode para Node do ReactFlow
                const reactFlowNode: Node = {
                  ...node,
                  data: node.data
                } as Node
                setSelectedNode(reactFlowNode)
              }
            }}
            isPaletteOpen={isPaletteOpen}
            workflowId={workflowId}
            enableExecution={enableRuntimeExecution}
            executionState={executionState}
            onLogsExpandedChange={setIsLogsExpanded}
          />
          
          {/* Toast de execução acima do minimap */}
          <ExecutionToast 
            executionState={executionState}
            onClose={() => {
              // Não limpar o estado - apenas ocultar o toast
              // Os logs e estados dos nós devem permanecer visíveis
            }}
          />
          </div>

          {/* Node Inspector */}
          <NodeInspector
            selectedNode={selectedNode}
            onUpdate={handleNodeUpdate}
            onClose={() => setSelectedNode(null)}
            nodes={nodes}
            edges={edges}
          />
        </div>
      )}
    </div>
  )
}

