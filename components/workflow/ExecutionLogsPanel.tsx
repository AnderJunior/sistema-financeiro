'use client'

import { useState, useEffect, useRef } from 'react'
import { ExecutionLogEntry, WorkflowExecutionState } from '@/types/automation.types'
import { 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  AlertTriangle,
  X,
  Trash2,
  Download,
  Filter
} from 'lucide-react'

interface ExecutionLogsPanelProps {
  executionState: WorkflowExecutionState | null
  selectedNodeId?: string | null
  onClose?: () => void
  onExpandedChange?: (isExpanded: boolean) => void
}

export function ExecutionLogsPanel({ 
  executionState, 
  selectedNodeId,
  onClose,
  onExpandedChange
}: ExecutionLogsPanelProps) {
  // Verificar se há logs
  const hasLogs = executionState && executionState.logs && executionState.logs.length > 0
  const [isExpanded, setIsExpanded] = useState(false) // Sempre iniciar fechado
  
  // Notificar mudanças no estado de expansão sempre que mudar
  useEffect(() => {
    onExpandedChange?.(isExpanded)
  }, [isExpanded, onExpandedChange])
  
  // Função para alternar expansão
  const toggleExpanded = () => {
    setIsExpanded(prev => !prev)
  }
  const [filterLevel, setFilterLevel] = useState<'all' | 'info' | 'warning' | 'error' | 'success'>('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const logsContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll quando novos logs aparecem
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [executionState?.logs, autoScroll])

  // Detectar quando usuário rola manualmente para cima
  useEffect(() => {
    const container = logsContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const isScrolledToBottom = 
        container.scrollHeight - container.scrollTop <= container.clientHeight + 50
      setAutoScroll(isScrolledToBottom)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // Se não houver estado de execução, não renderizar nada
  if (!executionState) {
    return null
  }

  const logs = executionState.logs || []
  
  // Filtrar logs por nó selecionado e nível
  const filteredLogs = logs.filter((log) => {
    const matchesNode = !selectedNodeId || log.nodeId === selectedNodeId
    const matchesLevel = filterLevel === 'all' || log.level === filterLevel
    return matchesNode && matchesLevel
  })

  // Obter ícone baseado no nível do log
  const getLogIcon = (level: ExecutionLogEntry['level']) => {
    switch (level) {
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Info className="w-4 h-4 text-gray-500" />
    }
  }

  // Obter cor de fundo baseado no nível
  const getLogBgColor = (level: ExecutionLogEntry['level']) => {
    switch (level) {
      case 'info':
        return 'bg-blue-50 border-blue-200'
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  // Formatar timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    })
  }

  // Exportar logs como JSON
  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `execution-logs-${executionState.executionId}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Status da execução
  const getExecutionStatusBadge = () => {
    const { status } = executionState
    const statusConfig = {
      idle: { label: 'Ocioso', color: 'bg-gray-100 text-gray-700' },
      running: { label: 'Executando', color: 'bg-blue-100 text-blue-700 animate-pulse' },
      completed: { label: 'Concluído', color: 'bg-green-100 text-green-700' },
      failed: { label: 'Falhou', color: 'bg-red-100 text-red-700' },
      paused: { label: 'Pausado', color: 'bg-yellow-100 text-yellow-700' }
    }

    const config = statusConfig[status] || statusConfig.idle

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  return (
    <div className={`bg-white border-t border-gray-200 flex flex-col ${isExpanded ? 'h-96' : 'h-12'} transition-all duration-300`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleExpanded()
            }}
            className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer p-1 -ml-1 rounded hover:bg-gray-200"
            title={isExpanded ? 'Minimizar logs' : 'Expandir logs'}
            type="button"
            aria-label={isExpanded ? 'Minimizar logs' : 'Expandir logs'}
          >
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
          
          <h3 className="text-sm font-semibold text-gray-900">
            Logs de Execução
          </h3>
          
          {getExecutionStatusBadge()}
          
          <span className="text-xs text-gray-500">
            {hasLogs ? `${filteredLogs.length} ${filteredLogs.length === 1 ? 'log' : 'logs'}` : 'Nenhum log'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filtro de nível */}
          <div className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-gray-400" />
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as any)}
              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Todos</option>
              <option value="info">Info</option>
              <option value="success">Sucesso</option>
              <option value="warning">Avisos</option>
              <option value="error">Erros</option>
            </select>
          </div>

          {/* Botões de ação */}
          <button
            onClick={exportLogs}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Exportar logs"
          >
            <Download className="w-4 h-4" />
          </button>
          
          {onClose && (
            <button
              onClick={() => {
                setIsExpanded(false)
                onExpandedChange?.(false)
                onClose()
              }}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Logs Container */}
      {isExpanded && (
        <div 
          ref={logsContainerRef}
          className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50"
        >
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <Info className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum log disponível</p>
              </div>
            </div>
          ) : (
            <>
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border ${getLogBgColor(log.level)} transition-all hover:shadow-sm`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      {getLogIcon(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-500">
                          {formatTimestamp(log.timestamp)}
                        </span>
                        <span className="text-xs font-medium text-gray-600">
                          Nó: {log.nodeId}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 break-words">
                        {log.message}
                      </p>
                      {log.data && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">
                            Ver dados
                          </summary>
                          <pre className="mt-2 p-2 bg-white rounded text-xs overflow-x-auto border border-gray-200">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={logsEndRef} />
            </>
          )}
        </div>
      )}

      {/* Footer com informações da execução */}
      {isExpanded && executionState.startedAt && (
        <div className="px-4 py-2 border-t border-gray-200 bg-white">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              Iniciado em: {new Date(executionState.startedAt).toLocaleString('pt-BR')}
            </span>
            {executionState.completedAt && (
              <span>
                Concluído em: {new Date(executionState.completedAt).toLocaleString('pt-BR')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

