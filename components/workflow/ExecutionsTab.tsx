'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WorkflowExecutionState, NodeExecutionState } from '@/types/automation.types'
import { ExecutionsSidebar } from './ExecutionsSidebar'
import { ExecutionViewer } from './ExecutionViewer'
import { RefreshCw, Filter } from 'lucide-react'

interface WorkflowExecution {
  id: string
  workflow_id: string
  execution_id: string
  status: 'running' | 'completed' | 'failed' | 'paused'
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  node_states: Record<string, NodeExecutionState>
  edge_states: Record<string, any>
  logs: any[]
}

interface ExecutionsTabProps {
  workflowId: string
}

export function ExecutionsTab({ workflowId }: ExecutionsTabProps) {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecution | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const loadExecutions = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('started_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Erro ao carregar execuções:', error)
        return
      }

      if (data) {
        const formattedExecutions: WorkflowExecution[] = data.map((exec: any) => ({
          id: exec.id,
          workflow_id: exec.workflow_id,
          execution_id: exec.execution_id,
          status: exec.status,
          started_at: exec.started_at,
          completed_at: exec.completed_at,
          duration_ms: exec.duration_ms,
          node_states: exec.node_states || {},
          edge_states: exec.edge_states || {},
          logs: exec.logs || []
        }))
        setExecutions(formattedExecutions)
        
        // Se não há execução selecionada e há execuções, selecionar a primeira
        if (!selectedExecution && formattedExecutions.length > 0) {
          setSelectedExecution(formattedExecutions[0])
        }
      }
    } catch (error) {
      console.error('Erro ao carregar execuções:', error)
    } finally {
      setLoading(false)
    }
  }, [workflowId, selectedExecution])

  useEffect(() => {
    loadExecutions()
  }, [loadExecutions])

  // Auto-refresh quando habilitado
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadExecutions()
    }, 5000) // Atualizar a cada 5 segundos

    return () => clearInterval(interval)
  }, [autoRefresh, loadExecutions])

  const handleExecutionSelect = (execution: WorkflowExecution) => {
    setSelectedExecution(execution)
    setSelectedNodeId(null) // Resetar nó selecionado ao mudar execução
  }

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId)
  }

  const handleNodeDeselect = () => {
    setSelectedNodeId(null)
  }

  // Converter WorkflowExecution para WorkflowExecutionState
  const getExecutionState = (execution: WorkflowExecution | null): WorkflowExecutionState | null => {
    if (!execution) return null

    return {
      executionId: execution.execution_id,
      status: execution.status === 'completed' ? 'completed' : 
              execution.status === 'failed' ? 'failed' : 
              execution.status === 'paused' ? 'paused' : 'running',
      startedAt: execution.started_at,
      completedAt: execution.completed_at || undefined,
      nodeStates: execution.node_states || {},
      edgeStates: execution.edge_states || {},
      logs: execution.logs || []
    }
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar de Execuções */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Execuções</h2>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-1.5 rounded transition-colors ${
                autoRefresh ? 'bg-primary-600 hover:bg-primary-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
              title={autoRefresh ? 'Desativar atualização automática' : 'Ativar atualização automática'}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
              />
              <span>Atualização automática</span>
            </label>
            <button
              className="ml-auto p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-600"
              title="Filtrar"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Carregando...</div>
          ) : executions.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Nenhuma execução encontrada
            </div>
          ) : (
            <ExecutionsSidebar
              executions={executions}
              selectedExecutionId={selectedExecution?.id || null}
              onSelectExecution={handleExecutionSelect}
            />
          )}
        </div>
      </div>

      {/* Área Principal - Visualização da Execução */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {selectedExecution ? (
          <ExecutionViewer
            execution={getExecutionState(selectedExecution)}
            selectedNodeId={selectedNodeId}
            onNodeClick={handleNodeClick}
            onNodeDeselect={handleNodeDeselect}
            executionId={selectedExecution.execution_id}
            startedAt={selectedExecution.started_at}
            completedAt={selectedExecution.completed_at}
            durationMs={selectedExecution.duration_ms}
            status={selectedExecution.status}
            workflowId={workflowId}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Selecione uma execução para visualizar
          </div>
        )}
      </div>
    </div>
  )
}
