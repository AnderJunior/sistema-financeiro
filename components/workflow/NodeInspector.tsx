'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Maximize2, FileText } from 'lucide-react'
import { Node } from 'reactflow'
import { AutomationNodeData, AutomationNodeType, AutomationNode, AutomationEdge } from '@/types/automation.types'
import { getNodeById } from '@/lib/automations/nodes/registry'
import { NodeParam } from '@/lib/automations/nodes/types'
import { createClient } from '@/lib/supabase/client'
import { ExpressionInput } from './ExpressionInput'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'

interface NodeInspectorProps {
  selectedNode: Node<AutomationNodeData> | null
  onUpdate: (nodeId: string, data: Partial<AutomationNodeData>) => void
  onClose: () => void
  nodes?: AutomationNode[]
  edges?: AutomationEdge[]
  readOnly?: boolean
}

interface ParamValue {
  mode: 'fixed' | 'expression'
  value: any
}

export function NodeInspector({ selectedNode, onUpdate, onClose, nodes = [], edges = [], readOnly = false }: NodeInspectorProps) {
  const [formData, setFormData] = useState<AutomationNodeData>({
    label: '',
    description: '',
    url: '',
    method: 'POST',
    messageTemplate: '',
    conditionExpression: '',
    delaySeconds: 0,
    values: {}
  })
  const [isMinimized, setIsMinimized] = useState(true)
  const [nodeDefinition, setNodeDefinition] = useState<any>(null)
  const [clientes, setClientes] = useState<Array<{ id: string; nome: string }>>([])
  const [servicos, setServicos] = useState<Array<{ id: string; nome: string; valor_base: number }>>([])
  const [loadingData, setLoadingData] = useState(false)
  const [isDescriptionEditorOpen, setIsDescriptionEditorOpen] = useState(false)
  
  // Ref para rastrear se é a primeira renderização (deve estar antes de qualquer return)
  const isInitialMount = useRef(true)
  
  // Verificar se tem descrição
  const hasDescription = formData.description && formData.description.trim() !== '' && formData.description !== '<p></p>'
  
  // O editor deve estar aberto se tem descrição OU se foi aberto manualmente
  const shouldShowEditor = hasDescription || isDescriptionEditorOpen

  // Editor de texto rico para descrição
  const descriptionEditor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary-600 underline',
        },
      }),
      Placeholder.configure({
        placeholder: 'Digite sua descrição aqui... Você pode colar imagens, links e formatar o texto.',
      }),
    ],
    content: formData.description || '<p></p>',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      // Só atualizar se o conteúdo realmente mudou e não for apenas um parágrafo vazio
      const cleanHtml = html === '<p></p>' ? '' : html
      if (cleanHtml !== formData.description) {
        setFormData({ ...formData, description: cleanHtml })
      }
    },
    editorProps: {
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || [])
        const imageItem = items.find(item => item.type.startsWith('image/'))
        
        if (imageItem) {
          event.preventDefault()
          const file = imageItem.getAsFile()
          if (file) {
            const reader = new FileReader()
            reader.onload = (e) => {
              const src = e.target?.result as string
              if (src) {
                descriptionEditor?.chain().focus().setImage({ src }).run()
              }
            }
            reader.readAsDataURL(file)
          }
          return true
        }
        return false
      },
      handleDrop: (view, event) => {
        const items = Array.from(event.dataTransfer?.items || [])
        const imageItem = items.find(item => item.type.startsWith('image/'))
        
        if (imageItem) {
          event.preventDefault()
          const file = imageItem.getAsFile()
          if (file) {
            const reader = new FileReader()
            reader.onload = (e) => {
              const src = e.target?.result as string
              if (src) {
                const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY })
                if (coordinates) {
                  descriptionEditor?.chain().focus().setImage({ src }).run()
                }
              }
            }
            reader.readAsDataURL(file)
          }
          return true
        }
        return false
      },
    },
  })

  // Atualizar conteúdo do editor quando formData.description mudar externamente
  useEffect(() => {
    if (descriptionEditor && formData.description !== descriptionEditor.getHTML()) {
      descriptionEditor.commands.setContent(formData.description || '')
    }
  }, [formData.description, descriptionEditor])
  
  // Atualizar estado do editor quando descrição mudar (para manter aberto se tiver conteúdo)
  useEffect(() => {
    if (hasDescription && !isDescriptionEditorOpen) {
      setIsDescriptionEditorOpen(true)
    }
  }, [hasDescription])
  
  // Quando o editor for aberto manualmente, garantir que esteja inicializado
  useEffect(() => {
    if (isDescriptionEditorOpen && descriptionEditor && !hasDescription) {
      // Se o editor foi aberto mas não tem conteúdo, inicializar com conteúdo vazio
      const currentContent = descriptionEditor.getHTML()
      if (!currentContent || currentContent === '<p></p>') {
        descriptionEditor.commands.setContent('<p></p>')
        // Focar no editor após um pequeno delay para garantir que está renderizado
        setTimeout(() => {
          descriptionEditor.commands.focus()
        }, 100)
      }
    }
  }, [isDescriptionEditorOpen, descriptionEditor, hasDescription])

  // Carregar clientes e serviços do banco
  const loadClientesEServicos = useCallback(async () => {
    setLoadingData(true)
    const supabase = createClient()
    
    const [clientesRes, servicosRes] = await Promise.all([
      supabase.from('clientes').select('id, nome').order('nome'),
      supabase.from('servicos').select('id, nome, valor_base').eq('ativo', true).order('nome')
    ])

    if (clientesRes.data) setClientes(clientesRes.data)
    if (servicosRes.data) setServicos(servicosRes.data)
    setLoadingData(false)
  }, [])

  // Carregar dados do nó selecionado
  useEffect(() => {
    if (selectedNode) {
      // Buscar definição do nó se for um tipo dinâmico
      const nodeDef = getNodeById(selectedNode.type || '')
      setNodeDefinition(nodeDef)

      // Carregar dados se for o nó Criar Projeto
      if (selectedNode.type === 'acaoCriarProjeto') {
        loadClientesEServicos()
      }

      // Normalizar valores para estrutura { mode, value }
      const normalizedValues: Record<string, ParamValue> = {}
      const existingValues = selectedNode.data.values || {}
      
      // Sempre usar os valores do nó selecionado (que são os valores salvos)
      Object.keys(existingValues).forEach(key => {
        const val = existingValues[key]
        if (val && typeof val === 'object' && 'mode' in val && 'value' in val) {
          // Já está no formato correto
          normalizedValues[key] = val as ParamValue
        } else {
          // Converter para formato novo (assumir fixed por padrão)
          normalizedValues[key] = {
            mode: 'fixed',
            value: val
          }
        }
      })

      const newFormData = {
        label: selectedNode.data.label || '',
        description: selectedNode.data.description || '',
        url: selectedNode.data.url || '',
        method: selectedNode.data.method || 'POST',
        messageTemplate: selectedNode.data.messageTemplate || '',
        conditionExpression: selectedNode.data.conditionExpression || '',
        delaySeconds: selectedNode.data.delaySeconds || 0,
        values: normalizedValues
      }
      
      setFormData(newFormData)
      
      // Expandir automaticamente quando um nó é selecionado
      setIsMinimized(false)
      // Abrir editor automaticamente se tiver descrição
      const hasDesc = newFormData.description && newFormData.description.trim() !== '' && newFormData.description !== '<p></p>'
      setIsDescriptionEditorOpen(hasDesc)
    } else {
      // Minimizar quando nenhum nó está selecionado
      setIsMinimized(true)
      setNodeDefinition(null)
      setIsDescriptionEditorOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode?.id, loadClientesEServicos])
  
  // Minimizar quando clicar fora (nó for desmarcado)
  useEffect(() => {
    if (!selectedNode) {
      setIsMinimized(true)
    }
  }, [selectedNode])

  // Salvar automaticamente com debounce (apenas se não estiver em modo readOnly)
  useEffect(() => {
    if (!selectedNode || readOnly) return
    
    // Ignorar a primeira renderização para evitar salvar valores iniciais
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    // Debounce de 500ms para salvar automaticamente
    const timeoutId = setTimeout(() => {
      const dataToUpdate: Partial<AutomationNodeData> = {
        label: formData.label,
        description: formData.description,
        url: formData.url,
        method: formData.method,
        messageTemplate: formData.messageTemplate,
        conditionExpression: formData.conditionExpression,
        delaySeconds: formData.delaySeconds,
        values: { ...formData.values }
      }
      
      onUpdate(selectedNode.id, dataToUpdate)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [formData, selectedNode, onUpdate, readOnly])

  // Resetar flag quando o nó selecionado mudar
  useEffect(() => {
    isInitialMount.current = true
  }, [selectedNode?.id])

  // Estado minimizado - ocultar completamente quando minimizado
  if (isMinimized || !selectedNode) {
    return null
  }

  const getParamValue = (paramId: string): ParamValue => {
    const val = formData.values?.[paramId]
    if (val && typeof val === 'object' && 'mode' in val && 'value' in val) {
      return val as ParamValue
    }
    return { mode: 'fixed', value: val ?? '' }
  }

  const setParamValue = (paramId: string, paramValue: ParamValue) => {
    setFormData({
      ...formData,
      values: {
        ...formData.values,
        [paramId]: paramValue
      }
    })
  }

  const renderModeButtons = (paramId: string, paramValue: ParamValue) => {
    if (readOnly) return null // Não mostrar botões de modo em modo readOnly
    const isExpression = paramValue.mode === 'expression'
    return (
      <div className="flex gap-0.5 ml-auto">
        <button
          type="button"
          onClick={() => setParamValue(paramId, { mode: 'fixed', value: paramValue.value })}
          className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
            !isExpression
              ? 'bg-gray-200 text-gray-900'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          Fixo
        </button>
        <button
          type="button"
          onClick={() => setParamValue(paramId, { mode: 'expression', value: paramValue.value })}
          className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
            isExpression
              ? 'bg-gray-800 text-white'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          Expressão
        </button>
      </div>
    )
  }

  const renderParamInput = (param: NodeParam) => {
    const paramValue = getParamValue(param.id)
    const isExpression = paramValue.mode === 'expression'

    // Para o nó Criar Projeto, campos especiais
    if (selectedNode?.type === 'acaoCriarProjeto') {
      if (param.id === 'clienteId') {
        return (
          <>
            {isExpression ? (
              <ExpressionInput
                value={paramValue.value ?? ''}
                onChange={(newValue) => setParamValue(param.id, { mode: 'expression', value: newValue })}
                placeholder='Ex: {{ $json.body.payment.id }} ou {{ nodeId.campo }}'
                nodes={nodes}
                edges={edges}
                currentNodeId={selectedNode?.id || ''}
                disabled={readOnly}
              />
            ) : (
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={paramValue.value ?? ''}
                onChange={(e) => setParamValue(param.id, { mode: 'fixed', value: e.target.value })}
                disabled={loadingData || readOnly}
              >
                <option value="">Selecione um cliente...</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
            )}
          </>
        )
      }

      if (param.id === 'servicoId') {
        return (
          <>
            {isExpression ? (
              <ExpressionInput
                value={paramValue.value ?? ''}
                onChange={(newValue) => setParamValue(param.id, { mode: 'expression', value: newValue })}
                placeholder='Ex: {{ $json.body.payment.id }} ou {{ nodeId.campo }}'
                nodes={nodes}
                edges={edges}
                currentNodeId={selectedNode?.id || ''}
                disabled={readOnly}
              />
            ) : (
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={paramValue.value ?? ''}
                onChange={(e) => {
                  const servicoSelecionado = servicos.find(s => s.id === e.target.value)
                  setParamValue(param.id, { mode: 'fixed', value: e.target.value })
                  // Atualizar valor automaticamente se servico for selecionado
                  if (servicoSelecionado) {
                    const valorValue = getParamValue('valor')
                    if (valorValue.mode === 'fixed' && !valorValue.value) {
                      setParamValue('valor', { mode: 'fixed', value: servicoSelecionado.valor_base })
                    }
                  }
                }}
                disabled={loadingData || readOnly}
              >
                <option value="">Selecione um serviço...</option>
                {servicos.map((servico) => (
                  <option key={servico.id} value={servico.id}>
                    {servico.nome} - R$ {servico.valor_base.toFixed(2)}
                  </option>
                ))}
              </select>
            )}
          </>
        )
      }

      if (param.id === 'valor') {
        const servicoIdValue = getParamValue('servicoId')
        const servicoSelecionado = servicoIdValue.mode === 'fixed' && servicoIdValue.value
          ? servicos.find(s => s.id === servicoIdValue.value)
          : null

        return (
          <>
            {isExpression ? (
              <ExpressionInput
                value={paramValue.value ?? ''}
                onChange={(newValue) => setParamValue(param.id, { mode: 'expression', value: newValue })}
                placeholder='Ex: {{ $json.body.payment.value }} ou {{ nodeId.valor }}'
                nodes={nodes}
                edges={edges}
                currentNodeId={selectedNode?.id || ''}
                disabled={readOnly}
              />
            ) : (
              <>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={paramValue.value ?? (servicoSelecionado?.valor_base ?? '')}
                  onChange={(e) => setParamValue(param.id, { mode: 'fixed', value: e.target.value })}
                  placeholder="0.00"
                  disabled={readOnly}
                />
                {servicoSelecionado && (
                  <p className="text-xs text-gray-500 mt-1">
                    Valor padrão do serviço: R$ {servicoSelecionado.valor_base.toFixed(2)}
                  </p>
                )}
              </>
            )}
          </>
        )
      }
    }

    // Para outros campos, renderizar com Fixed/Expression genérico
    return (
      <>
            {isExpression ? (
              <ExpressionInput
                value={paramValue.value ?? ''}
                onChange={(newValue) => setParamValue(param.id, { mode: 'expression', value: newValue })}
                placeholder='Ex: {{ $json.body.payment.id }} ou {{ nodeId.campo }}'
                nodes={nodes}
                edges={edges}
                currentNodeId={selectedNode?.id || ''}
                disabled={readOnly}
              />
            ) : (
          (() => {
            switch (param.type) {
              case 'select':
                return (
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={paramValue.value ?? ''}
                    onChange={(e) => setParamValue(param.id, { mode: 'fixed', value: e.target.value })}
                    disabled={readOnly}
                  >
                    <option value="">Selecione...</option>
                    {param.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )
              case 'number':
                return (
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={paramValue.value ?? ''}
                    onChange={(e) => setParamValue(param.id, { mode: 'fixed', value: Number(e.target.value) })}
                    disabled={readOnly}
                  />
                )
              case 'date':
                return (
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={paramValue.value ?? ''}
                    onChange={(e) => setParamValue(param.id, { mode: 'fixed', value: e.target.value })}
                    disabled={readOnly}
                  />
                )
              case 'boolean':
                return (
                  <input
                    type="checkbox"
                    checked={!!paramValue.value}
                    onChange={(e) => setParamValue(param.id, { mode: 'fixed', value: e.target.checked })}
                    className="w-4 h-4"
                    disabled={readOnly}
                  />
                )
              case 'json':
              case 'code':
                return (
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm min-h-[100px]"
                    value={paramValue.value ?? ''}
                    onChange={(e) => setParamValue(param.id, { mode: 'fixed', value: e.target.value })}
                    placeholder={param.type === 'code' ? 'Digite o código...' : 'Digite o JSON...'}
                    disabled={readOnly}
                  />
                )
              case 'string':
              default:
                return (
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={paramValue.value ?? ''}
                    onChange={(e) => setParamValue(param.id, { mode: 'fixed', value: e.target.value })}
                    disabled={readOnly}
                  />
                )
            }
          })()
        )}
      </>
    )
  }

  const renderFields = () => {
    // Se for um nó dinâmico, renderizar parâmetros da definição
    if (nodeDefinition && nodeDefinition.params && nodeDefinition.params.length > 0) {
      return (
        <>
          {nodeDefinition.params.map((param: NodeParam) => {
            const paramValue = getParamValue(param.id)
            return (
              <div key={param.id}>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    {param.label}
                    {param.required && <span className="text-red-500"> *</span>}
                  </label>
                  {renderModeButtons(param.id, paramValue)}
                </div>
                {renderParamInput(param)}
              </div>
            )
          })}
        </>
      )
    }

    // Caso contrário, usar campos legados
    switch (selectedNode.type) {
      case 'webhook':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL *
              </label>
              <input
                type="text"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://exemplo.com/webhook"
                disabled={readOnly}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Método HTTP *
              </label>
              <select
                value={formData.method}
                onChange={(e) => setFormData({ ...formData, method: e.target.value as 'GET' | 'POST' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={readOnly}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>
          </>
        )

      case 'message':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template da Mensagem *
            </label>
            <textarea
              value={formData.messageTemplate}
              onChange={(e) => setFormData({ ...formData, messageTemplate: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Digite o template da mensagem..."
              disabled={readOnly}
            />
          </div>
        )

      case 'condition':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expressão de Condição *
            </label>
            <textarea
              value={formData.conditionExpression}
              onChange={(e) => setFormData({ ...formData, conditionExpression: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
              placeholder="Ex: status === 'ativo'"
              disabled={readOnly}
            />
            <p className="text-xs text-gray-500 mt-1">
              Use expressões JavaScript válidas
            </p>
          </div>
        )

      case 'delay':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tempo em Segundos *
            </label>
            <input
              type="number"
              min="0"
              value={formData.delaySeconds}
              onChange={(e) => setFormData({ ...formData, delaySeconds: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="0"
              disabled={readOnly}
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="bg-white border-l border-gray-200 flex flex-col h-full w-96">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Propriedades do Nó</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsMinimized(true)
              onClose()
            }}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded"
            title="Minimizar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome do Nó *
          </label>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Nome do nó"
            disabled={readOnly}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descrição
          </label>
          {shouldShowEditor ? (
            descriptionEditor ? (
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => descriptionEditor.chain().focus().toggleBold().run()}
                      disabled={readOnly}
                      className={`px-2 py-1 text-sm font-semibold rounded hover:bg-gray-200 transition-colors disabled:opacity-50 ${
                        descriptionEditor.isActive('bold') ? 'bg-gray-200' : ''
                      }`}
                      title="Negrito"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => descriptionEditor.chain().focus().toggleItalic().run()}
                      disabled={readOnly}
                      className={`px-2 py-1 text-sm italic rounded hover:bg-gray-200 transition-colors disabled:opacity-50 ${
                        descriptionEditor.isActive('italic') ? 'bg-gray-200' : ''
                      }`}
                      title="Itálico"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (descriptionEditor.isActive('link')) {
                          descriptionEditor.chain().focus().unsetLink().run()
                        } else {
                          const url = window.prompt('Digite a URL do link:')
                          if (url) {
                            descriptionEditor.chain().focus().setLink({ href: url }).run()
                          }
                        }
                      }}
                      disabled={readOnly}
                      className={`px-2 py-1 text-sm rounded hover:bg-gray-200 transition-colors disabled:opacity-50 ${
                        descriptionEditor.isActive('link') ? 'bg-gray-200' : ''
                      }`}
                      title={descriptionEditor.isActive('link') ? 'Remover link' : 'Adicionar link'}
                    >
                      🔗
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            const src = event.target?.result as string
                            if (src) {
                              descriptionEditor.chain().focus().setImage({ src }).run()
                            }
                          }
                          reader.readAsDataURL(file)
                        }
                        e.target.value = '' // Reset input
                      }}
                      disabled={readOnly}
                      className="hidden"
                      id="image-upload"
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('image-upload')?.click()}
                      disabled={readOnly}
                      className="px-2 py-1 text-sm rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
                      title="Inserir imagem"
                    >
                      🖼️
                    </button>
                  </div>
                  {!readOnly && hasDescription && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, description: '' })
                        descriptionEditor.commands.clearContent()
                        setIsDescriptionEditorOpen(false)
                      }}
                      className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                      title="Limpar descrição"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                <div className="p-3 min-h-[200px] max-h-[400px] overflow-y-auto">
                  <EditorContent editor={descriptionEditor} />
                </div>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg p-3 min-h-[200px] flex items-center justify-center text-gray-500">
                Carregando editor...
              </div>
            )
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!readOnly) {
                  setIsDescriptionEditorOpen(true)
                  // Garantir que o editor seja inicializado com conteúdo vazio se necessário
                  if (descriptionEditor && !formData.description) {
                    descriptionEditor.commands.setContent('<p></p>')
                  }
                }
              }}
              disabled={readOnly}
              className="w-full flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-left text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span>Adicionar descrição</span>
            </button>
          )}
        </div>

        {renderFields()}
      </div>
    </div>
  )
}

