'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  WorkflowExecutionState,
  WorkflowEvent,
  NodeExecutionStatus,
  ExecutionLogEntry,
  NodeExecutionState,
  EdgeExecutionState
} from '@/types/automation.types'

interface UseWorkflowExecutionOptions {
  workflowId: string
  enabled?: boolean
  websocketUrl?: string
}

interface UseWorkflowExecutionReturn {
  executionState: WorkflowExecutionState | null
  isConnected: boolean
  isExecuting: boolean
  startExecution: () => void
  stopExecution: () => void
  pauseExecution: () => void
  resumeExecution: () => void
  clearExecution: () => void
  getNodeState: (nodeId: string) => NodeExecutionState | null
  getEdgeState: (edgeId: string) => EdgeExecutionState | null
  getNodeLogs: (nodeId: string) => ExecutionLogEntry[]
}

const INITIAL_EXECUTION_STATE: WorkflowExecutionState = {
  executionId: '',
  status: 'idle',
  nodeStates: {},
  edgeStates: {},
  logs: []
}

export function useWorkflowExecution({
  workflowId,
  enabled = true,
  websocketUrl
}: UseWorkflowExecutionOptions): UseWorkflowExecutionReturn {
  const [executionState, setExecutionState] = useState<WorkflowExecutionState | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const hasShownConnectionErrorRef = useRef(false)
  const MAX_RECONNECT_ATTEMPTS = 3 // Reduzido de 5 para 3

  // Processar eventos do WebSocket
  const handleWebSocketEvent = useCallback((event: WorkflowEvent) => {
    setExecutionState((prevState) => {
      if (!prevState) return prevState

      const newState = { ...prevState }

      switch (event.type) {
        case 'execution:started':
          newState.executionId = event.executionId
          newState.status = 'running'
          newState.startedAt = event.timestamp
          newState.nodeStates = {}
          newState.edgeStates = {}
          newState.logs = []
          break

        case 'execution:completed':
          newState.status = 'completed'
          newState.completedAt = event.timestamp
          break

        case 'execution:failed':
          newState.status = 'failed'
          newState.completedAt = event.timestamp
          break

        case 'execution:paused':
          newState.status = 'paused'
          break

        case 'node:started':
          newState.currentNodeId = event.payload.nodeId
          newState.nodeStates[event.payload.nodeId] = {
            nodeId: event.payload.nodeId,
            status: 'running',
            startedAt: event.timestamp
          }
          break

        case 'node:completed':
          if (newState.nodeStates[event.payload.nodeId]) {
            newState.nodeStates[event.payload.nodeId] = {
              ...newState.nodeStates[event.payload.nodeId],
              status: 'success',
              completedAt: event.timestamp,
              output: event.payload.output
            }
          }
          break

        case 'node:failed':
          // Criar ou atualizar estado do nó com erro
          newState.nodeStates[event.payload.nodeId] = {
            ...(newState.nodeStates[event.payload.nodeId] || {
              nodeId: event.payload.nodeId,
              startedAt: event.timestamp
            }),
            status: 'error',
            completedAt: event.timestamp,
            error: event.payload.error
          }
          break

        case 'node:waiting':
          if (newState.nodeStates[event.payload.nodeId]) {
            newState.nodeStates[event.payload.nodeId] = {
              ...newState.nodeStates[event.payload.nodeId],
              status: 'waiting'
            }
          }
          break

        case 'edge:activated':
          newState.edgeStates[event.payload.edgeId] = {
            edgeId: event.payload.edgeId,
            isActive: true,
            activatedAt: event.timestamp
          }
          // Desativar após 1 segundo para efeito visual
          setTimeout(() => {
            setExecutionState((state) => {
              if (!state) return state
              const updated = { ...state }
              if (updated.edgeStates[event.payload.edgeId]) {
                updated.edgeStates[event.payload.edgeId].isActive = false
              }
              return updated
            })
          }, 1000)
          break

        case 'log:added':
          newState.logs = [...newState.logs, event.payload]
          break
      }

      return newState
    })
  }, [])

  // Conectar ao WebSocket
  const connectWebSocket = useCallback(() => {
    if (!enabled || !workflowId) return

    // Se já existe conexão, não reconectar
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    // URL do WebSocket (pode ser customizada ou usar padrão)
    const url = websocketUrl || `ws://localhost:3001/workflow/${workflowId}/execution`

    try {
      const ws = new WebSocket(url)

      ws.onopen = () => {
        setIsConnected(true)
        reconnectAttemptsRef.current = 0
        hasShownConnectionErrorRef.current = false
      }

      ws.onmessage = (event) => {
        try {
          const data: WorkflowEvent = JSON.parse(event.data)
          handleWebSocketEvent(data)
        } catch (error) {
          console.error('[WorkflowExecution] Erro ao processar mensagem:', error)
        }
      }

      ws.onerror = (error) => {
        // Mostrar erro apenas uma vez para não poluir o console
        if (!hasShownConnectionErrorRef.current && reconnectAttemptsRef.current === 0) {
          console.warn('[WorkflowExecution] ⚠️ Servidor WebSocket não disponível. A visualização em tempo real não funcionará até que o servidor esteja rodando.')
          console.warn('[WorkflowExecution] 💡 Para ativar: node example-websocket-server.js')
          hasShownConnectionErrorRef.current = true
        }
        setIsConnected(false)
      }

      ws.onclose = (event) => {
        // Log apenas se não foi fechado intencionalmente
        if (event.code !== 1000 && reconnectAttemptsRef.current === 0) {
          // Não logar desconexão na primeira tentativa para evitar spam
        }
        
        setIsConnected(false)
        wsRef.current = null

        // Tentar reconectar automaticamente (silenciosamente após primeira tentativa)
        if (enabled && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000) // Max 10s
          
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay)
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS && !hasShownConnectionErrorRef.current) {
          // Mostrar mensagem final apenas uma vez
          console.info('[WorkflowExecution] ℹ️ Conexão WebSocket não disponível. O workflow funcionará normalmente, mas sem visualização em tempo real.')
        }
      }

      wsRef.current = ws
    } catch (error) {
      // Erro silencioso se já mostramos antes
      if (!hasShownConnectionErrorRef.current) {
        console.error('[WorkflowExecution] Erro ao criar WebSocket:', error)
        hasShownConnectionErrorRef.current = true
      }
      setIsConnected(false)
    }
  }, [enabled, workflowId, websocketUrl, handleWebSocketEvent])

  // Desconectar WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    setIsConnected(false)
  }, [])

  // Enviar mensagem via WebSocket
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('[WorkflowExecution] WebSocket não está conectado')
    }
  }, [])

  // Iniciar execução
  const startExecution = useCallback(() => {
    const executionId = `exec-${Date.now()}`
    
    // Inicializar estado de execução
    setExecutionState({
      ...INITIAL_EXECUTION_STATE,
      executionId,
      status: 'running',
      startedAt: new Date().toISOString()
    })

    // Enviar comando para o backend
    sendMessage({
      type: 'execution:start',
      workflowId,
      executionId
    })
  }, [workflowId, sendMessage])

  // Parar execução
  const stopExecution = useCallback(() => {
    sendMessage({
      type: 'execution:stop',
      executionId: executionState?.executionId
    })

    setExecutionState((prev) => 
      prev ? { ...prev, status: 'completed', completedAt: new Date().toISOString() } : null
    )
  }, [executionState?.executionId, sendMessage])

  // Pausar execução
  const pauseExecution = useCallback(() => {
    sendMessage({
      type: 'execution:pause',
      executionId: executionState?.executionId
    })

    setExecutionState((prev) => 
      prev ? { ...prev, status: 'paused' } : null
    )
  }, [executionState?.executionId, sendMessage])

  // Retomar execução
  const resumeExecution = useCallback(() => {
    sendMessage({
      type: 'execution:resume',
      executionId: executionState?.executionId
    })

    setExecutionState((prev) => 
      prev ? { ...prev, status: 'running' } : null
    )
  }, [executionState?.executionId, sendMessage])

  // Limpar estado de execução
  const clearExecution = useCallback(() => {
    setExecutionState(null)
  }, [])

  // Obter estado de um nó específico
  const getNodeState = useCallback(
    (nodeId: string): NodeExecutionState | null => {
      return executionState?.nodeStates[nodeId] || null
    },
    [executionState]
  )

  // Obter estado de uma edge específica
  const getEdgeState = useCallback(
    (edgeId: string): EdgeExecutionState | null => {
      return executionState?.edgeStates[edgeId] || null
    },
    [executionState]
  )

  // Obter logs de um nó específico
  const getNodeLogs = useCallback(
    (nodeId: string): ExecutionLogEntry[] => {
      return executionState?.logs.filter((log) => log.nodeId === nodeId) || []
    },
    [executionState]
  )

  // Conectar ao WebSocket quando o componente montar
  useEffect(() => {
    if (enabled && workflowId) {
      connectWebSocket()
    }

    return () => {
      // Limpar timeout de reconexão
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      // Resetar contadores
      reconnectAttemptsRef.current = 0
      hasShownConnectionErrorRef.current = false
      // Desconectar WebSocket
      disconnectWebSocket()
    }
  }, [enabled, workflowId, connectWebSocket, disconnectWebSocket])

  return {
    executionState,
    isConnected,
    isExecuting: executionState?.status === 'running',
    startExecution,
    stopExecution,
    pauseExecution,
    resumeExecution,
    clearExecution,
    getNodeState,
    getEdgeState,
    getNodeLogs
  }
}

