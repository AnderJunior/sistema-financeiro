'use client'

import { useCallback, useRef, useEffect, useMemo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  ReactFlowProvider
} from 'reactflow'
import { AutomationNode, AutomationEdge, AutomationNodeType, AutomationNodeData, WorkflowExecutionState } from '@/types/automation.types'
import { CustomNode } from './CustomNode'
import { AnimatedEdge } from './AnimatedEdge'
import { ExecutionLogsPanel } from './ExecutionLogsPanel'
import { useWorkflowExecution } from '@/hooks/useWorkflowExecution'
import { nodeTypes as automationNodeTypes } from '@/lib/automations/nodes/nodeTypes'

// Combinar nodeTypes antigos com os novos (para compatibilidade)
// Criar objeto estável usando Object.assign para garantir referência única
const baseNodeTypes = {
  start: CustomNode,
  message: CustomNode,
  webhook: CustomNode,
  condition: CustomNode,
  delay: CustomNode,
  end: CustomNode,
}

// Criar objeto combinado de forma estável - usar Object.assign para garantir referência única
const nodeTypes: Record<string, any> = Object.assign({}, baseNodeTypes, automationNodeTypes)

// Tipos de edge customizados - objeto estável criado uma única vez
const edgeTypes = {
  animated: AnimatedEdge,
  default: AnimatedEdge
}

interface WorkflowCanvasProps {
  initialNodes: AutomationNode[]
  initialEdges: AutomationEdge[]
  onNodesChange: (nodes: AutomationNode[]) => void
  onEdgesChange: (edges: AutomationEdge[]) => void
  onNodeSelect?: (node: Node | null) => void
  onNodeDelete?: (nodeId: string) => void
  onNodeDuplicate?: (nodeId: string) => void
  onNodeDoubleClick?: (nodeId: string) => void
  isPaletteOpen?: boolean
  workflowId?: string
  enableExecution?: boolean
  executionState?: WorkflowExecutionState | null
  onLogsExpandedChange?: (isExpanded: boolean) => void
}

// Criar refs apenas quando necessário (evita problemas de SSR)
let manualDeletionRef: { current: boolean } | null = null
let deletedNodesRef: { current: Set<string> } | null = null

// Garantir que as funções estejam sempre disponíveis
// Usar função nomeada para evitar problemas com hot-reload
function getManualDeletionRef(): { current: boolean } {
  if (!manualDeletionRef) {
    manualDeletionRef = { current: false }
  }
  return manualDeletionRef
}

function getDeletedNodesRef(): { current: Set<string> } {
  if (!deletedNodesRef) {
    deletedNodesRef = { current: new Set<string>() }
  }
  return deletedNodesRef
}

function WorkflowCanvasInner({
  initialNodes,
  initialEdges,
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
  onNodeDelete,
  onNodeDuplicate,
  onNodeDoubleClick,
  isPaletteOpen = false,
  workflowId = 'demo-workflow',
  enableExecution = false,
  executionState: propExecutionState,
  onLogsExpandedChange
}: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  
  // Usar useRef para criar objetos estáveis que persistem mesmo durante hot-reload
  // Isso garante que o React Flow não detecte mudanças de referência
  const nodeTypesRef = useRef<Record<string, any> | null>(null)
  const edgeTypesRef = useRef<Record<string, any> | null>(null)
  
  // Criar objetos apenas uma vez
  if (!nodeTypesRef.current) {
    nodeTypesRef.current = {
      start: CustomNode,
      message: CustomNode,
      webhook: CustomNode,
      condition: CustomNode,
      delay: CustomNode,
      end: CustomNode,
      ...automationNodeTypes
    }
  }
  
  if (!edgeTypesRef.current) {
    edgeTypesRef.current = {
      animated: AnimatedEdge,
      default: AnimatedEdge
    }
  }
  
  // Hook de execução em tempo real (fallback para WebSocket se não houver estado via props)
  const {
    executionState: wsExecutionState,
    isConnected,
    isExecuting,
    startExecution,
    stopExecution,
    pauseExecution,
    resumeExecution,
    clearExecution,
    getNodeState: wsGetNodeState,
    getEdgeState: wsGetEdgeState
  } = useWorkflowExecution({
    workflowId,
    enabled: enableExecution && !propExecutionState // Só usar WebSocket se não houver estado via props
  })
  
  // Usar estado via props se disponível, senão usar do WebSocket
  const executionState = propExecutionState || wsExecutionState
  
  // Funções helper para obter estado dos nodes e edges
  const getNodeState = useCallback((nodeId: string) => {
    if (propExecutionState) {
      return propExecutionState.nodeStates[nodeId] || null
    }
    return wsGetNodeState(nodeId)
  }, [propExecutionState, wsGetNodeState])
  
  const getEdgeState = useCallback((edgeId: string) => {
    if (propExecutionState) {
      return propExecutionState.edgeStates[edgeId] || null
    }
    return wsGetEdgeState(edgeId)
  }, [propExecutionState, wsGetEdgeState])
  
  // Função helper para normalizar nodes e adicionar handlers + estado de execução
  const normalizeNode = useCallback((node: AutomationNode | Node): Node => {
    const position = node.position && 
                     typeof node.position === 'object' &&
                     typeof node.position.x === 'number' && 
                     typeof node.position.y === 'number' &&
                     !isNaN(node.position.x) &&
                     !isNaN(node.position.y)
      ? node.position
      : { x: 0, y: 0 }
    
    // Obter estado de execução do nó (se disponível)
    const nodeState = getNodeState(node.id)
    
    // Preservar executionStatus e executionError se já existirem no node.data
    const existingStatus = (node.data as any)?.executionStatus
    const existingError = (node.data as any)?.executionError
    
    // Priorizar estado do nodeState sobre o estado existente
    const finalStatus = nodeState?.status || existingStatus || 'idle'
    const finalError = nodeState?.error || existingError
    
    return {
      ...node,
      position,
      data: {
        ...(node.data || { label: 'Nó sem nome' }),
        onDelete: onNodeDelete,
        onDuplicate: onNodeDuplicate,
        executionStatus: finalStatus,
        executionError: finalError // Incluir mensagem de erro se houver
      },
      type: node.type || 'gatilhoManual'
    } as Node
  }, [onNodeDelete, onNodeDuplicate, getNodeState, executionState?.nodeStates])
  
  // Validar e normalizar nodes antes de passar para ReactFlow
  const normalizedNodes = Array.isArray(initialNodes) && initialNodes.length > 0
    ? initialNodes.map(normalizeNode)
    : []
  
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(normalizedNodes)
  
  // Normalizar edges com estado de execução
  const normalizeEdges = useCallback((edges: AutomationEdge[]): Edge[] => {
    return edges.map(edge => {
      const edgeState = getEdgeState(edge.id)
      return {
        ...edge,
        type: 'animated',
        data: {
          isActive: edgeState?.isActive || false
        }
      } as Edge
    })
  }, [getEdgeState])
  
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(
    normalizeEdges(Array.isArray(initialEdges) ? initialEdges : [])
  )
  const isUpdatingFromParent = useRef(false)
  const lastInitialNodesRef = useRef<string>(JSON.stringify(initialNodes.map(n => n.id).sort()))
  const nodesRef = useRef(nodes)
  
  // Atualizar ref sempre que nodes mudar
  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])

  // Sincronizar sempre que initialNodes mudar (incluindo mudanças nos dados)
  useEffect(() => {
    try {
      // Filtrar nós deletados dos initialNodes antes de sincronizar
      const deletedRef = getDeletedNodesRef()
      const manualRef = getManualDeletionRef()
      const filteredInitialNodes = initialNodes.filter(n => !deletedRef.current.has(n.id))
      
      // Se foi uma deleção manual, apenas sincronizar os nós filtrados
      if (manualRef.current) {
        const normalized = filteredInitialNodes.map(normalizeNode)
        isUpdatingFromParent.current = true
        setNodes(normalized)
        isUpdatingFromParent.current = false
        manualRef.current = false
        return
      }

      // Sincronizar normalmente (incluindo mudanças nos dados)
      const normalized = filteredInitialNodes.map(normalizeNode)
      
      isUpdatingFromParent.current = true
      setNodes(normalized)
      isUpdatingFromParent.current = false
    } catch (error) {
      console.error('Erro ao sincronizar nodes:', error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNodes, normalizeNode, executionState?.nodeStates])

  useEffect(() => {
    isUpdatingFromParent.current = true
    setEdges(normalizeEdges(initialEdges))
    isUpdatingFromParent.current = false
  }, [initialEdges.length, initialEdges.map(e => e.id).join(','), normalizeEdges])
  
  // Atualizar nodes quando o estado de execução mudar
  useEffect(() => {
    if (!executionState) return
    
    setNodes((currentNodes) => {
      return currentNodes.map((node) => {
        const nodeState = getNodeState(node.id)
        if (nodeState) {
          // Sempre atualizar quando há estado de execução
          const updatedNode = {
            ...node,
            data: {
              ...node.data,
              executionStatus: nodeState.status,
              executionError: nodeState.error // Incluir mensagem de erro
            }
          }
          return updatedNode
        } else {
          // Se não há estado de execução, manter o status atual (sucesso ou erro)
          // Preservar estados finais (success ou error) para visualização no minimap
          const currentStatus = (node.data as any).executionStatus
          const currentError = (node.data as any).executionError
          if (currentStatus === 'error' || currentStatus === 'success') {
            // Manter estado final (sucesso ou erro) mesmo se não houver estado atual
            return {
              ...node,
              data: {
                ...node.data,
                executionStatus: currentStatus,
                executionError: currentError
              }
            }
          }
          return {
            ...node,
            data: {
              ...node.data,
              executionStatus: currentStatus || 'idle'
            }
          }
        }
      })
    })
  }, [executionState?.nodeStates, executionState?.status, getNodeState, setNodes])
  
  // Atualizar edges quando o estado de execução mudar
  useEffect(() => {
    if (!executionState) return
    
    setEdges((currentEdges) => {
      return currentEdges.map((edge) => {
        const edgeState = getEdgeState(edge.id)
        if (edgeState) {
          return {
            ...edge,
            data: {
              ...edge.data,
              isActive: edgeState.isActive
            }
          }
        }
        return edge
      })
    })
  }, [executionState?.edgeStates, getEdgeState, setEdges])

  // Handler para mudanças de nodes
  const handleNodesChange = useCallback((changes: any) => {
    if (isUpdatingFromParent.current) {
      onNodesChangeInternal(changes)
      return
    }
    
    // Aplicar mudanças internas primeiro
    onNodesChangeInternal(changes)
    
    // Obter estado atualizado após aplicar mudanças
    setNodes((currentNodes) => {
      // Criar um mapa para preservar positions originais e handlers
      const positionMap = new Map(currentNodes.map(n => [n.id, n.position]))
      const handlersMap = new Map(currentNodes.map(n => [
        n.id, 
        { 
          onDelete: (n.data as any)?.onDelete, 
          onDuplicate: (n.data as any)?.onDuplicate,
          onDoubleClick: (n.data as any)?.onDoubleClick
        }
      ]))
      
      let updatedNodes = [...currentNodes]
      
      for (const change of changes) {
        if (change.type === 'remove') {
          updatedNodes = updatedNodes.filter(n => n.id !== change.id)
          positionMap.delete(change.id)
          handlersMap.delete(change.id)
        } else if (change.type === 'add') {
          const newNode = {
            ...change.item,
            position: change.item.position || { x: 0, y: 0 },
            data: {
              ...change.item.data,
              onDelete: onNodeDelete,
              onDuplicate: onNodeDuplicate,
              onDoubleClick: onNodeDoubleClick
            }
          }
          updatedNodes = [...updatedNodes, newNode]
          positionMap.set(change.item.id, newNode.position)
          handlersMap.set(change.item.id, { onDelete: onNodeDelete, onDuplicate: onNodeDuplicate, onDoubleClick: onNodeDoubleClick })
        } else if (change.type === 'reset') {
          updatedNodes = change.items.map((item: Node) => ({
            ...item,
            position: item.position || { x: 0, y: 0 },
              data: {
                ...item.data,
                onDelete: onNodeDelete,
                onDuplicate: onNodeDuplicate,
                onDoubleClick: onNodeDoubleClick
              }
          }))
          change.items.forEach((item: Node) => {
            positionMap.set(item.id, item.position || { x: 0, y: 0 })
            handlersMap.set(item.id, { onDelete: onNodeDelete, onDuplicate: onNodeDuplicate, onDoubleClick: onNodeDoubleClick })
          })
        } else if (change.type === 'position') {
          updatedNodes = updatedNodes.map(n => {
            if (n.id === change.id) {
              const newPosition = change.position || positionMap.get(n.id) || { x: 0, y: 0 }
              const handlers = handlersMap.get(n.id) || { onDelete: onNodeDelete, onDuplicate: onNodeDuplicate }
              return { 
                ...n, 
                position: newPosition,
                data: {
                  ...n.data,
                  ...handlers
                }
              }
            }
            return n
          })
          if (change.position) {
            positionMap.set(change.id, change.position)
          }
        } else if (change.type === 'select') {
          updatedNodes = updatedNodes.map(n => {
            if (n.id === change.id) {
              // Preservar position original e handlers
              const originalPosition = positionMap.get(n.id) || n.position || { x: 0, y: 0 }
              const handlers = handlersMap.get(n.id) || { onDelete: onNodeDelete, onDuplicate: onNodeDuplicate }
              return { 
                ...n, 
                selected: change.selected, 
                position: originalPosition,
                data: {
                  ...n.data,
                  ...handlers
                }
              }
            }
            return n
          })
        } else if (change.type === 'dimensions') {
          updatedNodes = updatedNodes.map(n => {
            if (n.id === change.id) {
              // Preservar position original e handlers
              const originalPosition = positionMap.get(n.id) || n.position || { x: 0, y: 0 }
              const handlers = handlersMap.get(n.id) || { onDelete: onNodeDelete, onDuplicate: onNodeDuplicate }
              return { 
                ...n, 
                width: change.dimensions?.width, 
                height: change.dimensions?.height,
                position: originalPosition,
                data: {
                  ...n.data,
                  ...handlers
                }
              }
            }
            return n
          })
        }
      }
      
      // Garantir que todos os nodes tenham position válida e handlers
      const validNodes = updatedNodes.map(node => {
        const position = positionMap.get(node.id) || node.position
        const handlers = handlersMap.get(node.id) || { onDelete: onNodeDelete, onDuplicate: onNodeDuplicate, onDoubleClick: onNodeDoubleClick }
        
        return {
          ...node,
          position: position && typeof position === 'object' &&
                    typeof position.x === 'number' && typeof position.y === 'number' &&
                    !isNaN(position.x) && !isNaN(position.y)
            ? position
            : { x: 0, y: 0 },
          data: {
            ...node.data,
            ...handlers
          }
        }
      })
      
      // Notificar pai de forma assíncrona (removendo handlers antes de salvar)
      setTimeout(() => {
        const nodesToSave = validNodes.map(node => {
          const { onDelete, onDuplicate, ...dataWithoutHandlers } = node.data as any
          return {
            ...node,
            data: dataWithoutHandlers
          } as AutomationNode
        })
        onNodesChange(nodesToSave)
      }, 0)
      
      return validNodes
    })
  }, [onNodesChangeInternal, onNodesChange, setNodes, normalizeNode, onNodeDelete, onNodeDuplicate])

  // Handler para mudanças de edges
  const handleEdgesChange = useCallback((changes: any) => {
    if (isUpdatingFromParent.current) {
      onEdgesChangeInternal(changes)
      return
    }
    
    onEdgesChangeInternal(changes)
    
    setEdges((currentEdges) => {
      let updatedEdges = [...currentEdges]
      
      for (const change of changes) {
        if (change.type === 'remove') {
          updatedEdges = updatedEdges.filter(e => e.id !== change.id)
        } else if (change.type === 'add') {
          updatedEdges = [...updatedEdges, change.item]
        } else if (change.type === 'reset') {
          updatedEdges = change.items
        }
      }
      
      setTimeout(() => {
        onEdgesChange(updatedEdges as AutomationEdge[])
      }, 0)
      
      return updatedEdges
    })
  }, [onEdgesChangeInternal, onEdgesChange, setEdges])

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const newEdges = addEdge(params, eds)
        setTimeout(() => {
          onEdgesChange(newEdges as AutomationEdge[])
        }, 0)
        return newEdges
      })
    },
    [setEdges, onEdgesChange]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/reactflow')

      if (!type || !reactFlowWrapper.current) {
        return
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
      // Calcular posição relativa ao canvas, considerando scroll e transformações
      const position = {
        x: Math.max(0, event.clientX - reactFlowBounds.left),
        y: Math.max(0, event.clientY - reactFlowBounds.top)
      }
      
      // Garantir que position seja válida
      if (typeof position.x !== 'number' || typeof position.y !== 'number' || isNaN(position.x) || isNaN(position.y)) {
        position.x = 100
        position.y = 100
      }

      // Tentar buscar definição do nó no registry
      let nodeData: AutomationNode['data'] = {
        label: type === 'gatilhoManual' ? 'Gatilho Manual' :
              type === 'message' ? 'Nova Mensagem' :
              type === 'webhook' ? 'Novo Webhook' :
              type === 'condition' ? 'Nova Condição' :
              type === 'delay' ? 'Aguardar' : 'Fim'
      }

      try {
        const { getNodeById } = await import('@/lib/automations/nodes/registry')
        const nodeDef = getNodeById(type)
        if (nodeDef) {
          nodeData = {
            label: nodeDef.label,
            description: nodeDef.description,
            values: {}
          } as AutomationNodeData
        }
      } catch (error) {
        // Usar dados padrão se não encontrar
        console.warn('Não foi possível carregar definição do nó:', error)
      }

      const newNode: AutomationNode = {
        id: `${type}-${Date.now()}`,
        type: type as AutomationNodeType,
        position,
        data: nodeData
      }

      setNodes((nds) => {
        const newNodeWithHandlers: Node = {
          ...newNode,
          data: {
            ...newNode.data,
            onDelete: onNodeDelete,
            onDuplicate: onNodeDuplicate,
            onDoubleClick: onNodeDoubleClick
          }
        } as Node
        const newNodes = [...nds, newNodeWithHandlers]
        const validNodes = newNodes.map(node => ({
          ...node,
          position: node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number'
            ? node.position
            : { x: 0, y: 0 },
          data: {
            ...node.data,
            onDelete: (node.data as any)?.onDelete || onNodeDelete,
            onDuplicate: (node.data as any)?.onDuplicate || onNodeDuplicate
          }
        }))
        setTimeout(() => {
          onNodesChange(validNodes as AutomationNode[])
        }, 0)
        return newNodes
      })
    },
    [setNodes, onNodesChange, onNodeDelete, onNodeDuplicate]
  )

  // Função auxiliar para deletar um nó pelo ID (usada pelo botão de deletar)
  const deleteNodeById = useCallback((nodeId: string) => {
    // Marcar como deleção manual ANTES de qualquer atualização
    // Isso evita que o useEffect tente re-sincronizar com dados antigos
    const manualRef = getManualDeletionRef()
    const deletedRef = getDeletedNodesRef()
    manualRef.current = true
    
    // Adicionar à lista de nós deletados para evitar re-sincronização
    deletedRef.current.add(nodeId)
    
    // Atualizar lastInitialNodesRef imediatamente para evitar sincronização
    setNodes((currentNodes) => {
      const remaining = currentNodes.filter(n => n.id !== nodeId)
      const remainingIds = remaining.map(n => n.id).sort()
      lastInitialNodesRef.current = JSON.stringify(remainingIds)
      return remaining
    })
    
    // Remover edges conectados ao nó
    setEdges((currentEdges) => {
      return currentEdges.filter(e => e.source !== nodeId && e.target !== nodeId)
    })
    
    // Notificar o componente pai DEPOIS de atualizar o estado interno
    // Usar setTimeout para garantir que a atualização do estado interno aconteça primeiro
    setTimeout(() => {
      onNodeDelete?.(nodeId)
      // Limpar da lista de deletados após um tempo para permitir futuras sincronizações
      setTimeout(() => {
        const deletedRef = getDeletedNodesRef()
        const manualRef = getManualDeletionRef()
        deletedRef.current.delete(nodeId)
        // Se não há mais nós deletados pendentes, resetar a flag
        if (deletedRef.current.size === 0) {
          manualRef.current = false
        }
      }, 100)
    }, 0)
  }, [onNodeDelete, setNodes, setEdges])

  // Função auxiliar para duplicar um nó pelo ID (usada pelo botão de duplicar)
  const duplicateNodeById = useCallback((nodeId: string) => {
    const nodeToDuplicate = nodes.find(n => n.id === nodeId)
    if (!nodeToDuplicate) {
      console.warn('Nó não encontrado para duplicar:', nodeId)
      return
    }

    const duplicatedNode: Node = {
      ...nodeToDuplicate,
      id: `${nodeToDuplicate.type}-${Date.now()}`,
      position: {
        x: (nodeToDuplicate.position?.x || 0) + 50,
        y: (nodeToDuplicate.position?.y || 0) + 50
      },
      data: {
        ...nodeToDuplicate.data,
        label: `${nodeToDuplicate.data?.label || 'Nó'} (cópia)`,
        onDelete: onNodeDelete,
        onDuplicate: onNodeDuplicate,
        onDoubleClick: onNodeDoubleClick
      },
      selected: false
    }
    
    setNodes((currentNodes) => {
      const newNodes = [...currentNodes, duplicatedNode]
      // Notificar o componente pai
      setTimeout(() => {
        const nodesToSave = newNodes.map(node => {
          const { onDelete, onDuplicate, onDoubleClick, ...dataWithoutHandlers } = node.data as any
          return {
            ...node,
            data: dataWithoutHandlers
          } as AutomationNode
        })
        onNodesChange(nodesToSave)
      }, 0)
      return newNodes
    })
  }, [nodes, onNodeDelete, onNodeDuplicate, onNodeDoubleClick, setNodes, onNodesChange])

  // Expor as funções e refs globalmente para acesso do CustomNode (apenas no cliente)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Criar funções wrapper seguras que sempre retornam as refs corretas
        const safeGetManualDeletionRef = () => {
          if (!manualDeletionRef) {
            manualDeletionRef = { current: false }
          }
          return manualDeletionRef
        }
        
        const safeGetDeletedNodesRef = () => {
          if (!deletedNodesRef) {
            deletedNodesRef = { current: new Set<string>() }
          }
          return deletedNodesRef
        }
        
        (window as any).deleteNodeById = deleteNodeById
        if (duplicateNodeById) {
          (window as any).duplicateNodeById = duplicateNodeById
        }
        // Expor as refs através de getters para evitar problemas de SSR
        const manualRef = safeGetManualDeletionRef()
        const deletedRef = safeGetDeletedNodesRef()
        ;(window as any).manualDeletionRef = manualRef
        ;(window as any).deletedNodesRef = deletedRef
      } catch (error) {
        console.error('Erro ao expor refs no window:', error)
      }
    }
    return () => {
      if (typeof window !== 'undefined') {
        try {
          delete (window as any).deleteNodeById
          delete (window as any).duplicateNodeById
          delete (window as any).manualDeletionRef
          delete (window as any).deletedNodesRef
        } catch (error) {
          // Ignorar erros no cleanup
        }
      }
    }
  }, [deleteNodeById, duplicateNodeById])

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      // Marcar como deleção manual para evitar sincronização
      const manualRef = getManualDeletionRef()
      const deletedRef = getDeletedNodesRef()
      manualRef.current = true
      
      // Adicionar à lista de nós deletados
      deleted.forEach(node => {
        deletedRef.current.add(node.id)
      })
      
      // Remover nodes do estado interno
      setNodes((currentNodes) => {
        const remaining = currentNodes.filter(n => !deleted.some(d => d.id === n.id))
        const remainingIds = remaining.map(n => n.id).sort()
        lastInitialNodesRef.current = JSON.stringify(remainingIds)
        return remaining
      })
      
      // Remover edges conectados aos nodes deletados
      setEdges((currentEdges) => {
        const deletedIds = deleted.map(d => d.id)
        return currentEdges.filter(e => !deletedIds.includes(e.source) && !deletedIds.includes(e.target))
      })
      
      // Notificar o componente pai
      deleted.forEach((node) => {
        onNodeDelete?.(node.id)
        // Limpar da lista de deletados após um tempo
        setTimeout(() => {
          const deletedRef = getDeletedNodesRef()
          const manualRef = getManualDeletionRef()
          deletedRef.current.delete(node.id)
          // Se não há mais nós deletados pendentes, resetar a flag
          if (deletedRef.current.size === 0) {
            manualRef.current = false
          }
        }, 100)
      })
    },
    [onNodeDelete, setNodes, setEdges]
  )

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Buscar o nó atualizado do initialNodes para garantir dados corretos
      const updatedNode = initialNodes.find(n => n.id === node.id)
      if (updatedNode) {
        // Criar um novo nó com os dados atualizados mas mantendo selected do ReactFlow
        const nodeWithUpdatedData = {
          ...node,
          data: updatedNode.data
        } as Node
        onNodeSelect?.(nodeWithUpdatedData)
      } else {
        onNodeSelect?.(node)
      }
    },
    [onNodeSelect, initialNodes]
  )

  // Listener para evento customizado de deleção (fallback para botão de deletar)
  useEffect(() => {
    const handleCustomDelete = (event: CustomEvent<{ nodeId: string }>) => {
      const { nodeId } = event.detail
      if (nodeId) {
        deleteNodeById(nodeId)
      }
    }

    window.addEventListener('reactflow-node-delete', handleCustomDelete as EventListener)
    return () => window.removeEventListener('reactflow-node-delete', handleCustomDelete as EventListener)
  }, [deleteNodeById])

  // Shortcuts - Tecla Del para deletar nós selecionados
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevenir deleção se estiver digitando em um input, textarea ou elemento editável
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('[contenteditable="true"]')
      ) {
        return
      }

      // Detectar tecla Delete, Del ou Backspace
      if (event.key === 'Delete' || event.key === 'Del' || event.keyCode === 46 || (event.key === 'Backspace' && !event.shiftKey && !event.ctrlKey && !event.metaKey)) {
        // Obter nós selecionados do estado atual usando a ref
        const currentNodes = nodesRef.current
        const selectedNodes = currentNodes.filter(n => n.selected)
        
        if (selectedNodes.length > 0) {
          event.preventDefault()
          event.stopPropagation()
          
          // Confirmar deleção
          const confirmMessage = selectedNodes.length > 1 
            ? `Tem certeza que deseja deletar ${selectedNodes.length} nós?`
            : 'Tem certeza que deseja deletar este nó?'
          
          if (window.confirm(confirmMessage)) {
            // Deletar cada nó selecionado
            selectedNodes.forEach(node => {
              deleteNodeById(node.id)
            })
          }
        }
      }
    }

    // Adicionar listener ao documento para capturar eventos mesmo quando o canvas não está em foco
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
    }, [deleteNodeById])

  // Ajustar posição dos controles baseado no estado da paleta
  useEffect(() => {
    const controlsElement = document.querySelector('.react-flow__controls')
    if (controlsElement) {
      const leftPosition = isPaletteOpen ? '270px' : '12px'
      ;(controlsElement as HTMLElement).style.left = leftPosition
    }
  }, [isPaletteOpen])

  // Verificar se temos nodes válidos antes de renderizar
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    console.error('WorkflowCanvas - Erro: nodes ou edges não são arrays', { nodes, edges })
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">Erro ao carregar o canvas. Por favor, recarregue a página.</p>
          <p className="text-sm text-gray-500 mt-2">Nodes: {Array.isArray(nodes) ? 'OK' : 'ERRO'}, Edges: {Array.isArray(edges) ? 'OK' : 'ERRO'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col" style={{ minHeight: '400px' }}>
      <div ref={reactFlowWrapper} className="flex-1" style={{ backgroundColor: '#f9fafb' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodesDelete={onNodesDelete}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypesRef.current}
          edgeTypes={edgeTypesRef.current}
          fitView
          attributionPosition="bottom-left"
        >
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              // Primeiro tentar obter estado de execução do executionState
              const nodeState = getNodeState(node.id)
              if (nodeState) {
                const statusColors = {
                  idle: '#6b7280',
                  running: '#3b82f6',
                  success: '#10b981',
                  error: '#ef4444',
                  waiting: '#eab308'
                }
                return statusColors[nodeState.status] || '#6b7280'
              }
              
              // Se não houver nodeState ativo, verificar executionStatus preservado no node.data
              const executionStatus = (node.data as any)?.executionStatus
              if (executionStatus) {
                const statusColors: Record<string, string> = {
                  idle: '#6b7280',
                  running: '#3b82f6',
                  success: '#10b981',
                  error: '#ef4444',
                  waiting: '#eab308'
                }
                if (statusColors[executionStatus]) {
                  return statusColors[executionStatus]
                }
              }
              
              // Cores padrão por tipo
              const colors: Record<string, string> = {
                start: '#10b981',
                gatilhoManual: '#3b82f6',
                message: '#3b82f6',
                webhook: '#a855f7',
                condition: '#eab308',
                delay: '#f97316',
                end: '#ef4444'
              }
              return colors[node.type || 'gatilhoManual'] || '#6b7280'
            }}
            maskColor="rgba(0, 0, 0, 0.1)"
          />
        </ReactFlow>
      </div>
      
      {/* Painel de Logs de Execução */}
      {enableExecution && (
        <ExecutionLogsPanel
          executionState={executionState}
          selectedNodeId={null}
          onExpandedChange={onLogsExpandedChange}
        />
      )}
    </div>
  )
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
