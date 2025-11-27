'use client'

import { useCallback, useState } from 'react'
import { X, ChevronDown, ChevronRight } from 'lucide-react'
import { AutomationNodeType } from '@/types/automation.types'
import { getSidebarGroups } from '@/lib/automations/nodes/registry'
import { NodeDefinition } from '@/lib/automations/nodes/types'
import { getIcon } from '@/lib/automations/nodes/iconMap'

interface NodePaletteProps {
  onAddNode: (type: string, position: { x: number; y: number }) => void
  onClose?: () => void
}

// Mapeamento de tipos antigos para compatibilidade
const legacyNodeTypes: Record<string, { label: string; icon: string; color: string }> = {
  start: { label: 'Início', icon: '▶️', color: 'bg-green-500' },
  message: { label: 'Mensagem', icon: '💬', color: 'bg-blue-500' },
  webhook: { label: 'Webhook', icon: '🌐', color: 'bg-purple-500' },
  condition: { label: 'Condição', icon: '🔀', color: 'bg-yellow-500' },
  delay: { label: 'Aguardar', icon: '⏱️', color: 'bg-orange-500' },
  end: { label: 'Fim', icon: '⏹️', color: 'bg-red-500' }
}

export function NodePalette({ onAddNode, onClose }: NodePaletteProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    gatilhos: true,
    acoes: true,
    transformacoes: true
  })

  const handleDragStart = useCallback((event: React.DragEvent, type: string) => {
    event.dataTransfer.setData('application/reactflow', type)
    event.dataTransfer.effectAllowed = 'move'
  }, [])

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }, [])

  const sidebarGroups = getSidebarGroups()

  const renderNodeItem = (nodeDef: NodeDefinition | { type: string; label: string; icon: string; color: string; description: string }) => {
    const isLegacy = 'type' in nodeDef && legacyNodeTypes[nodeDef.type]
    const nodeId = isLegacy ? nodeDef.type : (nodeDef as NodeDefinition).id
    const label = isLegacy ? nodeDef.label : (nodeDef as NodeDefinition).label
    const icon = isLegacy ? nodeDef.icon : (nodeDef as NodeDefinition).icon
    const color = isLegacy ? nodeDef.color : (nodeDef as NodeDefinition).color
    const description = isLegacy ? nodeDef.description : (nodeDef as NodeDefinition).description

    // Obter o componente de ícone do lucide-react
    const IconComponent = !isLegacy ? getIcon(icon) : null

    return (
      <div
        key={nodeId}
        draggable
        onDragStart={(e) => handleDragStart(e, nodeId)}
        className="flex items-center gap-3 p-3 rounded-lg border-2 border-transparent hover:border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors cursor-move"
        style={{ borderColor: isLegacy ? undefined : (nodeDef as NodeDefinition).color }}
      >
        <div 
          className={`w-10 h-10 ${isLegacy ? color : ''} rounded-lg flex items-center justify-center text-white flex-shrink-0`}
          style={!isLegacy ? { backgroundColor: color } : undefined}
        >
          {IconComponent ? (
            <IconComponent className="w-5 h-5" />
          ) : (
            <span className="text-lg">{icon}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">Blocos Disponíveis</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {sidebarGroups.map((group) => {
          const isExpanded = expandedGroups[group.id] ?? true
          
          return (
            <div key={group.id} className="mb-4">
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between py-2 px-1 text-xs font-semibold text-gray-700 uppercase hover:bg-gray-50 rounded transition-colors group"
              >
                <span className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  )}
                  {group.label}
                </span>
              </button>
              
              {isExpanded && (
                <div className="mt-2 space-y-2">
                  {group.nodes.map(renderNodeItem)}
                </div>
              )}
            </div>
          )
        })}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Arraste os blocos para o canvas para adicionar ao fluxo
          </p>
        </div>
      </div>
    </div>
  )
}

