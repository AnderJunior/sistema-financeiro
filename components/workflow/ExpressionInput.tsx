'use client'

import { useState, useRef, useEffect } from 'react'
import { Code, X } from 'lucide-react'
import { AutomationNode, AutomationEdge } from '@/types/automation.types'
import { DataReferencePicker } from './DataReferencePicker'

interface ExpressionInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  nodes: AutomationNode[]
  edges: AutomationEdge[]
  currentNodeId: string
  className?: string
  disabled?: boolean
}

export function ExpressionInput({
  value,
  onChange,
  placeholder = 'Ex: {{ $json.body.payment.id }}',
  nodes,
  edges,
  currentNodeId,
  className = '',
  disabled = false
}: ExpressionInputProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [previewValue, setPreviewValue] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Detectar expressões no valor e tentar fazer preview
  useEffect(() => {
    // Por enquanto, apenas mostrar o valor como preview
    // Em produção, isso seria resolvido com dados reais do contexto
    const expressionMatch = value.match(/\{\{\s*([^}]+)\s*\}\}/)
    if (expressionMatch) {
      setPreviewValue(`Preview: ${expressionMatch[1]}`)
    } else {
      setPreviewValue(null)
    }
  }, [value])

  const handleInsertExpression = (expression: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const textBefore = value.substring(0, start)
    const textAfter = value.substring(end)
    const newValue = textBefore + expression + textAfter

    onChange(newValue)

    // Reposicionar cursor após a expressão inserida
    setTimeout(() => {
      const newCursorPos = start + expression.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
      textarea.focus()
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Permitir Tab para indentação
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const textBefore = value.substring(0, start)
      const textAfter = value.substring(end)

      if (e.shiftKey) {
        // Shift+Tab: remover indentação
        if (textBefore.endsWith('  ')) {
          onChange(textBefore.slice(0, -2) + textAfter)
          setTimeout(() => {
            textarea.setSelectionRange(start - 2, end - 2)
          }, 0)
        }
      } else {
        // Tab: adicionar indentação
        onChange(textBefore + '  ' + textAfter)
        setTimeout(() => {
          textarea.setSelectionRange(start + 2, end + 2)
        }, 0)
      }
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm min-h-[80px] bg-gray-50 ${className}`}
          spellCheck={false}
          disabled={disabled}
        />
        {!disabled && (
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
            title="Inserir referência de dados"
          >
            <Code className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Preview do valor */}
      {previewValue && (
        <div className="mt-1 px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded border border-gray-200">
          {previewValue}
        </div>
      )}

      {/* Picker de referências */}
      {showPicker && !disabled && (
        <DataReferencePicker
          nodes={nodes}
          edges={edges}
          currentNodeId={currentNodeId}
          onSelect={handleInsertExpression}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  )
}




