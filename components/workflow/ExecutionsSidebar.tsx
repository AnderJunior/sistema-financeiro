'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, XCircle, Loader2, Pause, Bell, RotateCcw } from 'lucide-react'

interface WorkflowExecution {
  id: string
  execution_id: string
  status: 'running' | 'completed' | 'failed' | 'paused'
  started_at: string
  completed_at: string | null
  duration_ms: number | null
}

interface ExecutionsSidebarProps {
  executions: WorkflowExecution[]
  selectedExecutionId: string | null
  onSelectExecution: (execution: WorkflowExecution) => void
}

export function ExecutionsSidebar({
  executions,
  selectedExecutionId,
  onSelectExecution
}: ExecutionsSidebarProps) {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'running':
        return <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-600" />
      default:
        return null
    }
  }

  const getStatusText = (status: string) => {
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

  return (
    <div className="divide-y divide-gray-100">
      {executions.map((execution) => {
        const isSelected = execution.id === selectedExecutionId
        const isError = execution.status === 'failed'
        const isSuccess = execution.status === 'completed'
        const isRunning = execution.status === 'running'

        return (
          <button
            key={execution.id}
            onClick={() => onSelectExecution(execution)}
            className={`w-full p-3 text-left transition-colors hover:bg-gray-50 ${
              isSelected
                ? isError
                  ? 'bg-red-50 border-l-4 border-red-500'
                  : isSuccess
                  ? 'bg-green-50 border-l-4 border-green-500'
                  : isRunning
                  ? 'bg-primary-50 border-l-4 border-primary-500'
                  : 'bg-gray-50 border-l-4 border-primary-500'
                : 'border-l-4 border-transparent'
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                {getStatusIcon(execution.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {formatDate(execution.started_at)}
                  </span>
                  <span className={`text-xs font-medium ${
                    isError ? 'text-red-600' : isSuccess ? 'text-green-600' : isRunning ? 'text-primary-600' : 'text-gray-500'
                  }`}>
                    {getStatusText(execution.status)}
                  </span>
                </div>
                {execution.duration_ms !== null && (
                  <div className="text-xs text-gray-500">
                    em {formatDuration(execution.duration_ms)}
                  </div>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
