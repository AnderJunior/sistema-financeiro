'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { AutomationNodeData, NodeExecutionStatus } from '@/types/automation.types'
import { 
  Play, 
  GitBranch, 
  Webhook, 
  Clock, 
  MessageSquare, 
  Square,
  Edit2,
  Copy,
  Trash2,
  Zap,
  Loader2,
  CheckCircle2,
  XCircle,
  Pause,
  AlertTriangle
} from 'lucide-react'

const nodeConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
  start: { icon: Play, color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' },
  gatilhoManual: { icon: Zap, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
  message: { icon: MessageSquare, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
  webhook: { icon: Webhook, color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200' },
  condition: { icon: GitBranch, color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200' },
  delay: { icon: Clock, color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200' },
  end: { icon: Square, color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' }
}

const CustomNodeComponent = ({ data, selected, type, id }: NodeProps<AutomationNodeData>) => {
  const config = nodeConfig[type] || nodeConfig.gatilhoManual
  const Icon = config.icon
  
  // Status de execução injetado pelo WorkflowCanvas
  const executionStatus = (data as any).executionStatus as NodeExecutionStatus | undefined
  const executionError = (data as any).executionError as string | undefined

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
  }

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    
    if (typeof window !== 'undefined' && (window as any).duplicateNodeById) {
      const duplicateFn = (window as any).duplicateNodeById
      if (typeof duplicateFn === 'function') {
        try {
          duplicateFn(id)
          return
        } catch (error) {
          console.error('Erro ao duplicar nó:', error)
        }
      }
    }
    
    const onDuplicate = (data as any)?.onDuplicate
    if (onDuplicate && typeof onDuplicate === 'function') {
      try {
        onDuplicate(id)
      } catch (error) {
        console.error('Erro ao duplicar nó:', error)
      }
    }
  }

  const handleDelete = () => {
    if (!window.confirm('Tem certeza que deseja deletar este nó?')) {
      return
    }
    
    if (typeof window !== 'undefined' && (window as any).deleteNodeById) {
      const deleteFn = (window as any).deleteNodeById
      if (typeof deleteFn === 'function') {
        try {
          deleteFn(id)
          return
        } catch (error) {
          console.error('Erro ao deletar nó:', error)
        }
      }
    }
    
    const onDelete = (data as any)?.onDelete
    if (onDelete && typeof onDelete === 'function') {
      try {
        if (typeof window !== 'undefined' && (window as any).manualDeletionRef) {
          (window as any).manualDeletionRef.current = true
        }
        onDelete(id)
        return
      } catch (error) {
        console.error('Erro ao deletar nó:', error)
      }
    }
    
    if (typeof window !== 'undefined') {
      const deleteEvent = new CustomEvent('reactflow-node-delete', { 
        detail: { nodeId: id },
        bubbles: true 
      })
      window.dispatchEvent(deleteEvent)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    handleDelete()
  }

  // ESTILOS DO NÓ CONFORME EXECUTION STATUS
  const getExecutionStyles = () => {
    // Sem status ou idle → usa o padrão do tipo
    if (!executionStatus || executionStatus === 'idle') {
      return {
        containerClass: config.bgColor,
        borderClass: '',
        pulseClass: '',
        shadowClass: ''
      }
    }

    // Em execução
    if (executionStatus === 'running') {
      return {
        containerClass: 'bg-blue-500 border-blue-600 text-white',
        borderClass: 'border-blue-600',
        pulseClass: 'animate-pulse',
        shadowClass: 'shadow-lg shadow-blue-500/60'
      }
    }

    // Concluiu com sucesso → TODO VERDE
    if (executionStatus === 'success') {
      return {
        containerClass: 'bg-green-500 border-green-600 text-white',
        borderClass: 'border-green-600',
        pulseClass: '',
        shadowClass: 'shadow-lg shadow-green-500/60'
      }
    }

    // Deu erro → TODO VERMELHO
    if (executionStatus === 'error') {
      return {
        containerClass: 'bg-red-500 border-red-700 text-white',
        borderClass: 'border-red-700 border-2',
        pulseClass: '',
        shadowClass: 'shadow-lg shadow-red-600/70'
      }
    }

    // Em espera
    if (executionStatus === 'waiting') {
      return {
        containerClass: 'bg-yellow-400 border-yellow-600 text-black',
        borderClass: 'border-yellow-600',
        pulseClass: '',
        shadowClass: 'shadow-lg shadow-yellow-500/60'
      }
    }

    // Fallback
    return {
      containerClass: config.bgColor,
      borderClass: '',
      pulseClass: '',
      shadowClass: ''
    }
  }

  const executionStyles = getExecutionStyles()

  const ExecutionStatusIcon = () => {
    if (!executionStatus || executionStatus === 'idle') return null

    switch (executionStatus) {
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-100" />
      case 'error':
        return <AlertTriangle className="w-3 h-3 text-white" />
      case 'waiting':
        return <Pause className="w-4 h-4 text-yellow-900" />
      default:
        return null
    }
  }

  return (
    <div
      className={`
        group px-4 py-3 rounded-lg border-2 min-w-[180px] relative
        transition-all duration-300
        ${executionStyles.containerClass}
        ${executionStyles.borderClass}
        ${executionStyles.pulseClass}
        ${executionStyles.shadowClass}
        ${selected ? 'ring-2 ring-primary-500 ring-offset-2' : executionStatus === 'idle' ? 'shadow-md' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={`w-3 h-3 transition-all duration-300 ${
          executionStatus === 'error' 
            ? 'bg-red-500 ring-2 ring-red-300 ring-offset-1' 
            : executionStatus === 'running' 
            ? 'bg-blue-500 ring-2 ring-blue-300 ring-offset-1' 
            : executionStatus === 'success' 
            ? 'bg-green-500' 
            : 'bg-gray-400'
        } hover:bg-primary-500`}
      />
      
      {/* Badge de status de execução */}
      {executionStatus && executionStatus !== 'idle' && (
        <div className="absolute -top-2 -right-2 z-10">
          <div
            className={`
              rounded-full p-1 shadow-lg border-2
              ${
                executionStatus === 'error' 
                  ? 'bg-red-500 border-red-700' 
                  : executionStatus === 'success'
                  ? 'bg-green-500 border-green-100'
                  : executionStatus === 'running'
                  ? 'bg-blue-500 border-blue-100'
                  : 'bg-white border-white'
              }
            `}
          >
            <ExecutionStatusIcon />
          </div>
        </div>
      )}
      
      {/* Ícone de erro extra no canto inferior direito */}
      {executionStatus === 'error' && (
        <div className="absolute -bottom-1 -right-1 z-10">
          <div className="bg-red-700 rounded-full p-0.5 shadow-lg border-2 border-white">
            <AlertTriangle className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
      )}
      
      {/* Tooltip de erro */}
      {executionStatus === 'error' && executionError && (
        <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 z-50 bg-red-700 text-white text-xs rounded-lg px-3 py-2 shadow-xl max-w-xs pointer-events-none">
          <div className="font-semibold mb-1 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Erro:
          </div>
          <div className="whitespace-normal break-words text-[11px]">{executionError}</div>
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-red-700"></div>
        </div>
      )}
      
      <div className="flex items-center gap-2 mb-1 relative">
        <Icon
          className={
            `w-5 h-5 ` +
            (executionStatus && executionStatus !== 'idle'
              ? 'text-white'
              : config.color)
          }
        />
        <h3
          className={
            `font-semibold text-sm ` +
            (executionStatus && executionStatus !== 'idle'
              ? 'text-white'
              : 'text-gray-900')
          }
        >
          {data.label}
        </h3>

        {executionStatus === 'error' && (
          <AlertTriangle className="w-3 h-3 text-white flex-shrink-0" />
        )}
      </div>
      
      {data.description && (
        <p
          className={
            `text-xs mt-1 line-clamp-2 ` +
            (executionStatus && executionStatus !== 'idle'
              ? 'text-white/90'
              : 'text-gray-600')
          }
        >
          {data.description}
        </p>
      )}

      {type === 'webhook' && (data as any).url && (
        <p className="text-xs text-gray-100 mt-2 truncate">
          {(data as any).method} {(data as any).url}
        </p>
      )}

      {type === 'delay' && (data as any).delaySeconds !== undefined && (
        <p className="text-xs text-gray-100 mt-2">
          {(data as any).delaySeconds}s
        </p>
      )}

      {type !== 'end' && (
        <Handle
          type="source"
          position={Position.Bottom}
          className={`w-3 h-3 transition-all duration-300 ${
            executionStatus === 'error' 
              ? 'bg-red-500 ring-2 ring-red-300 ring-offset-1' 
              : executionStatus === 'running' 
              ? 'bg-blue-500 ring-2 ring-blue-300 ring-offset-1' 
              : executionStatus === 'success' 
              ? 'bg-green-500' 
              : 'bg-gray-400'
          } hover:bg-primary-500`}
        />
      )}

      {selected && (
        <div 
          className="absolute -top-12 left-1/2 transform -translate-x-1/2 flex gap-1 z-50 bg-gray-800 rounded-lg px-2 py-1.5 shadow-lg"
          style={{ pointerEvents: 'auto' }}
        >
          <button
            onClick={handleEdit}
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            className="w-7 h-7 text-gray-300 hover:text-white hover:bg-gray-700 rounded flex items-center justify-center transition-colors cursor-pointer"
            title="Editar"
            type="button"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDuplicate}
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
            }}
            className="w-7 h-7 text-gray-300 hover:text-white hover:bg-gray-700 rounded flex items-center justify-center transition-colors cursor-pointer"
            title="Duplicar"
            type="button"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleDeleteClick}
            onMouseDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
              handleDelete()
            }}
            className="w-7 h-7 text-gray-300 hover:text-white hover:bg-gray-700 rounded flex items-center justify-center transition-colors cursor-pointer hover:text-red-400"
            title="Deletar (ou pressione Delete)"
            type="button"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

CustomNodeComponent.displayName = 'CustomNode'

// IMPORTANTE: deixa o memo SEM comparador customizado
export const CustomNode = CustomNodeComponent