'use client'

import { useState, useMemo } from 'react'
import { X, ChevronRight, ChevronDown, Search, FileJson } from 'lucide-react'
import { AutomationNode, AutomationEdge } from '@/types/automation.types'

interface DataReferencePickerProps {
  nodes: AutomationNode[]
  edges: AutomationEdge[]
  currentNodeId: string
  onSelect: (expression: string) => void
  onClose: () => void
}

interface DataNode {
  nodeId: string
  label: string
  type: string
  data: any
  level: number
}

export function DataReferencePicker({
  nodes,
  edges,
  currentNodeId,
  onSelect,
  onClose
}: DataReferencePickerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedPath, setSelectedPath] = useState<string>('')

  // Encontrar nós anteriores conectados ao nó atual
  const previousNodes = useMemo(() => {
    const previousNodeIds = new Set<string>()
    
    // Encontrar nós que têm edges apontando para o nó atual
    edges.forEach(edge => {
      if (edge.target === currentNodeId) {
        previousNodeIds.add(edge.source)
      }
    })

    // Também incluir o gatilho (webhook) que pode ter dados iniciais
    // Se o nó atual não é um gatilho, incluir gatilhos como nós anteriores
    const currentNode = nodes.find(n => n.id === currentNodeId)
    if (currentNode && !currentNode.type.startsWith('gatilho')) {
      const triggerNode = nodes.find(n => 
        (n.type === 'gatilhoWebhookEntrada' || 
         n.type === 'webhook' ||
         n.type.startsWith('gatilho')) &&
        n.id !== currentNodeId
      )

      if (triggerNode) {
        previousNodeIds.add(triggerNode.id)
      }
    }

    return nodes.filter(n => previousNodeIds.has(n.id))
  }, [nodes, edges, currentNodeId])

  // Função para navegar recursivamente pelos dados
  const renderDataTree = (data: any, path: string = '', level: number = 0): JSX.Element[] => {
    if (data === null || data === undefined) {
      return []
    }

    const elements: JSX.Element[] = []

    if (typeof data === 'object' && !Array.isArray(data)) {
      Object.keys(data).forEach(key => {
        const currentPath = path ? `${path}.${key}` : key
        const value = data[key]
        const isExpanded = expandedNodes.has(currentPath)
        const hasChildren = typeof value === 'object' && value !== null && !Array.isArray(value)

        elements.push(
          <div key={currentPath} style={{ paddingLeft: `${level * 16}px` }}>
            <div
              className={`flex items-center gap-2 py-2 px-3 rounded transition-all ${
                selectedPath === currentPath 
                  ? 'bg-blue-100 border-2 border-blue-400 shadow-sm' 
                  : 'hover:bg-gray-100 border border-transparent'
              } cursor-pointer`}
              onClick={() => {
                if (hasChildren) {
                  setExpandedNodes(prev => {
                    const next = new Set(prev)
                    if (next.has(currentPath)) {
                      next.delete(currentPath)
                    } else {
                      next.add(currentPath)
                    }
                    return next
                  })
                } else {
                  setSelectedPath(currentPath)
                }
              }}
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )
              ) : (
                <div className="w-4 h-4" />
              )}
              <FileJson className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-mono text-gray-700">{key}</span>
              {!hasChildren && (
                <span className="text-xs text-gray-500 ml-auto font-mono bg-white px-2 py-0.5 rounded border border-gray-200">
                  {typeof value === 'string' 
                    ? `"${value.substring(0, 40)}${value.length > 40 ? '...' : ''}"` 
                    : typeof value === 'number'
                    ? value
                    : typeof value === 'boolean'
                    ? String(value)
                    : String(value)}
                </span>
              )}
            </div>
            {isExpanded && hasChildren && (
              <div>
                {renderDataTree(value, currentPath, level + 1)}
              </div>
            )}
          </div>
        )
      })
    } else if (Array.isArray(data)) {
      data.forEach((item, index) => {
        const currentPath = `${path}[${index}]`
        elements.push(...renderDataTree(item, currentPath, level))
      })
    }

    return elements
  }

  // Gerar expressão baseada no nó e caminho selecionado
  const generateExpression = (nodeId: string, path: string) => {
    // Formato: {{ nodeId.campo.subcampo }} ou {{ $json.body.payment.id }}
    // Se o caminho começa com body ou headers, usar $json (padrão para webhooks)
    if (path.startsWith('body.') || path.startsWith('headers.')) {
      return `{{ $json.${path} }}`
    }
    // Caso contrário, usar o ID do nó
    return `{{ ${nodeId}.${path} }}`
  }

  const handleInsert = () => {
    if (!selectedPath || previousNodes.length === 0) return
    
    // Usar o primeiro nó anterior (ou o nó selecionado se houver seleção futura)
    const selectedNode = previousNodes[0]
    const expression = generateExpression(selectedNode.id, selectedPath)
    onSelect(expression)
    onClose()
  }

  // Função para gerar dados de exemplo realistas baseados no tipo do nó
  const getExampleDataForNode = (node: AutomationNode): any => {
    const nodeType = node.type

    // Webhook / Gatilho Webhook
    if (nodeType === 'gatilhoWebhookEntrada' || nodeType === 'webhook') {
      return {
        body: {
          payment: {
            id: 'pay_gs816r8cjq07ws5f',
            status: 'CONFIRMED',
            value: 150.50,
            customer: 'cus_000005123456',
            billingType: 'PIX',
            dueDate: '2024-12-15',
            description: 'Pagamento de serviço'
          },
          event: 'PAYMENT_CONFIRMED',
          cliente: {
            id: 'cliente-123',
            nome: 'João Silva',
            email: 'joao@exemplo.com'
          }
        },
        headers: {
          'content-type': 'application/json',
          'user-agent': 'Asaas_Hmlg/3.0',
          'host': 'webhook.eaivendeu.com.br'
        }
      }
    }

    // Criar Projeto
    if (nodeType === 'acaoCriarProjeto') {
      return {
        id: 'proj_abc123def456',
        clienteId: 'cliente-123',
        servicoId: 'servico-456',
        valor: 2500.00,
        dataVencimento: '2024-12-31',
        descricao: 'Desenvolvimento de sistema',
        statusServico: 'em_andamento',
        projeto: {
          id: 'proj_abc123def456',
          nome: 'Projeto Exemplo',
          status: 'em_andamento',
          valor_previsto: 2500.00
        }
      }
    }

    // Criar Cobrança
    if (nodeType === 'acaoCriarCobranca') {
      return {
        id: 'cobranca_xyz789',
        clienteId: 'cliente-123',
        valor: 500.00,
        descricao: 'Serviço prestado',
        vencimento: '2024-12-20',
        cobranca: {
          id: 'cobranca_xyz789',
          status: 'previsto',
          valor: 500.00,
          data_vencimento: '2024-12-20'
        }
      }
    }

    // Requisição HTTP
    if (nodeType === 'acaoHTTPRequest') {
      return {
        status: 200,
        statusText: 'OK',
        data: {
          id: 'resposta_123',
          success: true,
          message: 'Requisição realizada com sucesso',
          resultado: {
            campo1: 'valor1',
            campo2: 'valor2'
          }
        },
        headers: {
          'content-type': 'application/json'
        }
      }
    }

    // Criar Entrada Financeira
    if (nodeType === 'acaoCriarEntrada') {
      return {
        id: 'entrada_fin_123',
        valor: 1000.00,
        descricao: 'Recebimento de pagamento',
        lancamento: {
          id: 'entrada_fin_123',
          tipo: 'entrada',
          valor: 1000.00,
          status: 'pago',
          data_competencia: '2024-12-01'
        }
      }
    }

    // Criar Saída Financeira
    if (nodeType === 'acaoCriarSaida') {
      return {
        id: 'saida_fin_123',
        valor: 350.00,
        descricao: 'Pagamento de fornecedor',
        lancamento: {
          id: 'saida_fin_123',
          tipo: 'saida',
          valor: 350.00,
          status: 'pago',
          data_competencia: '2024-12-01'
        }
      }
    }

    // Gatilho Nova Cobrança
    if (nodeType === 'gatilhoNovaCobranca') {
      return {
        cobranca: {
          id: 'cobranca_nova_123',
          clienteId: 'cliente-123',
          valor: 750.00,
          status: 'previsto',
          data_vencimento: '2024-12-25',
          descricao: 'Nova cobrança criada'
        }
      }
    }

    // Gatilho Novo Cliente
    if (nodeType === 'gatilhoNovoCliente') {
      return {
        cliente: {
          id: 'cliente_novo_123',
          nome: 'Maria Santos',
          email: 'maria@exemplo.com',
          telefone: '(11) 98765-4321',
          status: 'a_iniciar'
        }
      }
    }

    // Gatilho Novo Projeto
    if (nodeType === 'gatilhoNovoProjeto') {
      return {
        projeto: {
          id: 'projeto_novo_123',
          nome: 'Novo Projeto',
          cliente_principal_id: 'cliente-123',
          valor_previsto: 3000.00,
          status: 'em_andamento'
        }
      }
    }

    // Atualizar Registro
    if (nodeType === 'acaoAtualizarRegistro') {
      return {
        id: 'registro_atualizado_123',
        tipo: 'cliente',
        dados: {
          status: 'finalizado',
          observacoes: 'Registro atualizado com sucesso'
        },
        registro: {
          id: 'registro_atualizado_123',
          atualizado: true
        }
      }
    }

    // Padrão genérico para outros tipos
    return {
      id: 'exemplo-id-123',
      status: 'success',
      output: {
        resultado: 'Operação realizada com sucesso',
        dados: {
          campo1: 'valor1',
          campo2: 'valor2',
          campo3: 123
        }
      }
    }
  }

  // Filtrar nós anteriores baseado na busca
  const filteredPreviousNodes = useMemo(() => {
    if (!searchTerm) return previousNodes
    
    return previousNodes.filter(node => 
      node.data?.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.type.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [previousNodes, searchTerm])


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Selecionar Dados do Nó Anterior
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar nós ou campos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {previousNodes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhum nó anterior encontrado.</p>
              <p className="text-sm mt-2">Conecte um nó antes deste para acessar seus dados.</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  Nós Anteriores:
                </h4>
                {filteredPreviousNodes.map(node => (
                  <div key={node.id} className="mb-4 border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-900">{node.data?.label || node.type}</span>
                      <span className="text-xs text-gray-500">({node.type})</span>
                    </div>
                    <div className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded">
                      {node.id}
                    </div>
                  </div>
                ))}
              </div>

              {/* Preview de dados dos nós anteriores */}
              {previousNodes.map(node => {
                const nodeData = getExampleDataForNode(node)

                return (
                  <div key={node.id} className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-700">
                        Dados de saída de: <span className="text-primary-600">{node.data?.label || node.type}</span>
                      </h4>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {node.type}
                      </span>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-96 overflow-y-auto">
                      {Object.keys(nodeData).length > 0 ? (
                        <>
                          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                            💡 <strong>Dica:</strong> Clique em um campo para selecioná-lo e ver a expressão gerada abaixo
                          </div>
                          <div className="space-y-0.5">
                            {renderDataTree(nodeData)}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-gray-500 italic">Nenhum dado disponível para preview</p>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Expressão selecionada */}
              {selectedPath && previousNodes.length > 0 && (() => {
                const selectedNode = previousNodes[0]
                const expression = generateExpression(selectedNode.id, selectedPath)
                const nodeData = getExampleDataForNode(selectedNode)
                
                // Tentar obter o valor real do caminho selecionado
                const getValueByPath = (obj: any, path: string): any => {
                  const parts = path.split('.')
                  let current = obj
                  for (const part of parts) {
                    if (current && typeof current === 'object' && part in current) {
                      current = current[part]
                    } else {
                      return null
                    }
                  }
                  return current
                }
                
                const previewValue = getValueByPath(nodeData, selectedPath)
                
                return (
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">Expressão gerada:</p>
                        <code className="text-sm font-mono text-blue-900 break-all bg-white px-3 py-2 rounded border border-blue-200 block">
                          {expression}
                        </code>
                      </div>
                    </div>
                    
                    {previewValue !== null && (
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Valor de exemplo:</p>
                        <div className="bg-white px-3 py-2 rounded border border-blue-200">
                          <span className="text-sm font-mono text-gray-800">
                            {typeof previewValue === 'string' 
                              ? `"${previewValue}"` 
                              : typeof previewValue === 'object'
                              ? JSON.stringify(previewValue, null, 2)
                              : String(previewValue)}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-3">
                      📌 Dados do nó: <span className="font-medium text-gray-700">{selectedNode.data?.label || selectedNode.type}</span>
                    </p>
                  </div>
                )
              })()}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleInsert}
            disabled={!selectedPath}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Inserir Expressão
          </button>
        </div>
      </div>
    </div>
  )
}

