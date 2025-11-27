// lib/automations/nodes/createNodeComponent.tsx

import React from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';
import { NodeDefinition } from './types';
import { getIcon } from './iconMap';

interface BaseNodeData {
  values?: Record<string, any>;
  onChange?: (paramId: string, value: any) => void;
  onDelete?: (nodeId: string) => void;
  onDuplicate?: (nodeId: string) => void;
  onDoubleClick?: (nodeId: string) => void;
  label?: string;
  description?: string;
}

export function createNodeComponent(def: NodeDefinition) {
  return function DynamicNodeComponent(props: NodeProps<BaseNodeData>) {
    const { data, id, selected } = props;

    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (data?.onDelete) {
        data.onDelete(id);
      }
    };

    const handleDuplicate = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (data?.onDuplicate) {
        data.onDuplicate(id);
      }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (data?.onDoubleClick) {
        data.onDoubleClick(id);
      }
    };

    // Renderizar handles de entrada
    const inputHandles = def.inputs.map((input) => (
      <Handle
        key={input.id}
        type="target"
        position={Position.Top}
        id={input.id}
        className="w-3 h-3 bg-gray-400 hover:bg-primary-500"
        style={{ left: `${(def.inputs.indexOf(input) + 1) * (100 / (def.inputs.length + 1))}%` }}
      />
    ));

    // Renderizar handles de saída
    const outputHandles = def.outputs.map((output) => (
      <Handle
        key={output.id}
        type="source"
        position={Position.Bottom}
        id={output.id}
        className="w-3 h-3 bg-gray-400 hover:bg-primary-500"
        style={{ left: `${(def.outputs.indexOf(output) + 1) * (100 / (def.outputs.length + 1))}%` }}
      />
    ));

    // Obter o componente de ícone
    const IconComponent = getIcon(def.icon);

    // Mostrar resumo dos valores configurados (se houver)
    const getSummaryText = () => {
      if (!data?.values || Object.keys(data.values).length === 0) {
        return null;
      }
      
      // Pegar o primeiro valor não vazio para mostrar como resumo
      const firstValue = Object.entries(data.values).find(([_, value]) => value !== null && value !== undefined && value !== '');
      if (firstValue) {
        const [key, value] = firstValue;
        const param = def.params.find(p => p.id === key);
        if (param && value) {
          if (typeof value === 'string' && value.length > 30) {
            return value.substring(0, 30) + '...';
          }
          return String(value);
        }
      }
      return null;
    };

    const summaryText = getSummaryText();

    return (
      <div
        className={`rounded-lg border-2 shadow-md bg-white min-w-[180px] relative cursor-pointer ${
          selected ? 'ring-2 ring-primary-500 ring-offset-1' : ''
        }`}
        style={{ borderColor: def.color }}
        onDoubleClick={handleDoubleClick}
      >
        {inputHandles}
        
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: def.color }}
            >
              {IconComponent ? (
                <IconComponent className="w-5 h-5 text-white" />
              ) : (
                <span className="text-lg text-white">{def.icon}</span>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                {data?.label || def.label}
              </h3>
              {summaryText && (
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {summaryText}
                </p>
              )}
            </div>
          </div>
        </div>

        {outputHandles}

        {selected && (
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 flex gap-1 z-10 bg-gray-800 rounded-lg px-2 py-1.5 shadow-lg">
            <button
              onClick={handleDuplicate}
              className="w-7 h-7 text-gray-300 hover:text-white hover:bg-gray-700 rounded flex items-center justify-center transition-colors"
              title="Duplicar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="w-7 h-7 text-gray-300 hover:text-white hover:bg-gray-700 rounded flex items-center justify-center transition-colors"
              title="Deletar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>
    );
  };
}

