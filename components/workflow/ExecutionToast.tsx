'use client'

import { useEffect, useState } from 'react'
import { XCircle, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { WorkflowExecutionState } from '@/types/automation.types'

interface ExecutionToastProps {
  executionState: WorkflowExecutionState | null
  onClose?: () => void
}

export function ExecutionToast({ executionState, onClose }: ExecutionToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (executionState) {
      setIsVisible(true)
      
      // Auto-fechar após 5 segundos se for sucesso (apenas ocultar o toast, não limpar estado)
      if (executionState.status === 'completed') {
        const timer = setTimeout(() => {
          setIsVisible(false)
          // Não chamar onClose para manter os logs visíveis
        }, 5000)
        return () => clearTimeout(timer)
      }
    } else {
      setIsVisible(false)
    }
  }, [executionState, onClose])

  if (!executionState || !isVisible) return null

  const hasErrors = executionState.status === 'failed' || 
                    Object.values(executionState.nodeStates).some(state => state.status === 'error')

  // Contar erros
  const errorCount = Object.values(executionState.nodeStates).filter(
    state => state.status === 'error'
  ).length

  // Obter mensagem de erro
  const getErrorMessage = () => {
    if (executionState.status === 'failed') {
      return 'Fluxo executado com falha'
    }
    
    const errorNodes = Object.values(executionState.nodeStates).filter(
      state => state.status === 'error'
    )
    
    if (errorNodes.length > 0) {
      const firstError = errorNodes[0]
      return firstError.error || `Erro em ${errorNodes.length} nó(s)`
    }
    
    return 'Erro desconhecido'
  }

  return (
    <div className={`absolute bottom-24 right-4 z-50 transition-all duration-300 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
    }`} style={{ marginBottom: '120px' }}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border-2 min-w-[300px] max-w-[400px] ${
        hasErrors
          ? 'bg-red-50 border-red-500'
          : executionState.status === 'completed'
          ? 'bg-green-50 border-green-500'
          : 'bg-blue-50 border-blue-500'
      }`}>
        {/* Ícone */}
        <div className={`flex-shrink-0 ${
          hasErrors ? 'text-red-600' : executionState.status === 'completed' ? 'text-green-600' : 'text-blue-600'
        }`}>
          {hasErrors ? (
            <XCircle className="w-5 h-5" />
          ) : executionState.status === 'completed' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
        </div>

        {/* Mensagem */}
        <div className="flex-1 min-w-0">
          <div className={`font-semibold text-sm ${
            hasErrors ? 'text-red-900' : executionState.status === 'completed' ? 'text-green-900' : 'text-blue-900'
          }`}>
            {hasErrors ? 'Erro na Execução' : executionState.status === 'completed' ? 'Execução Concluída' : 'Executando...'}
          </div>
          <div className={`text-xs mt-1 ${
            hasErrors ? 'text-red-700' : executionState.status === 'completed' ? 'text-green-700' : 'text-blue-700'
          }`}>
            {hasErrors ? getErrorMessage() : executionState.status === 'completed' ? 'Fluxo executado com sucesso' : 'Processando nós...'}
          </div>
          {errorCount > 0 && (
            <div className="text-xs text-red-600 mt-1">
              {errorCount} {errorCount === 1 ? 'erro encontrado' : 'erros encontrados'}
            </div>
          )}
        </div>

        {/* Botão fechar */}
        <button
          onClick={() => {
            setIsVisible(false)
            // Não chamar onClose para manter os logs visíveis
          }}
          className={`flex-shrink-0 p-1 rounded hover:bg-opacity-20 transition-colors ${
            hasErrors ? 'text-red-600 hover:bg-red-200' : executionState.status === 'completed' ? 'text-green-600 hover:bg-green-200' : 'text-blue-600 hover:bg-blue-200'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

