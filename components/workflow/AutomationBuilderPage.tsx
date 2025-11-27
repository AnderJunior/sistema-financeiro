'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getAutomationFlow, saveAutomationFlow } from '@/lib/api/automations'
import { AutomationFlow, AutomationNode, AutomationEdge } from '@/types/automation.types'
import { WorkflowShell } from './WorkflowShell'
import { Loader2 } from 'lucide-react'
import { useModal } from '@/contexts/ModalContext'

export function AutomationBuilderPage() {
  const params = useParams()
  const { alert } = useModal()
  const [flow, setFlow] = useState<AutomationFlow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flowStatus, setFlowStatus] = useState<'ativo' | 'inativo' | 'rascunho'>('inativo')

  useEffect(() => {
    async function loadFlow() {
      try {
        setLoading(true)
        setError(null)

        // Primeiro tentar buscar do Supabase
        const supabase = createClient()
        const { data, error: supabaseError } = await supabase
          .from('fluxos_automacao')
          .select('*')
          .eq('id', params.id)
          .single()

        if (supabaseError || !data) {
          // Se não encontrar, usar mock
          const mockFlow = await getAutomationFlow(params.id as string)
          if (mockFlow) {
            setFlow(mockFlow)
          } else {
            setError('Fluxo não encontrado')
          }
        } else {
          // Converter dados do Supabase para o formato AutomationFlow
          const config = data.configuracao as any || {}
          
          // Validar e normalizar nodes do banco
          const nodesFromDB = config.nodes || []
          const validatedNodes = nodesFromDB.length > 0 
            ? nodesFromDB.map((node: any) => ({
                ...node,
                position: node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number'
                  ? node.position
                  : { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
                data: node.data || { label: 'Nó sem nome' }
              }))
            : [
                {
                  id: 'gatilhoManual-1',
                  type: 'gatilhoManual',
                  position: { x: 250, y: 100 },
                  data: { label: 'Gatilho Manual' }
                }
              ]
          
          const automationFlow: AutomationFlow = {
            id: data.id,
            name: data.nome,
            nodes: validatedNodes,
            edges: config.edges || [],
            updatedAt: data.updated_at || new Date().toISOString()
          }
          setFlow(automationFlow)
          setFlowStatus((data.status as 'ativo' | 'inativo' | 'rascunho') || 'inativo')
        }
      } catch (err) {
        setError('Erro ao carregar fluxo')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadFlow()
    }
  }, [params.id])

  const handleSave = async (nodes: AutomationNode[], edges: AutomationEdge[], flowName?: string) => {
    if (!flow) return

    try {
      // Remover handlers antes de salvar (são funções e não podem ser serializadas)
      const nodesToSave = nodes.map(node => {
        const { onDelete, onDuplicate, ...dataWithoutHandlers } = node.data as any
        return {
          ...node,
          data: dataWithoutHandlers
        }
      })

      // Salvar no Supabase
      const supabase = createClient()
      const configuracao = {
        nodes: nodesToSave,
        edges
      }

      const updateData: any = { configuracao }
      
      // Se o nome foi alterado, atualizar também
      if (flowName && flowName !== flow.name) {
        updateData.nome = flowName
      }

      const { error: updateError } = await supabase
        .from('fluxos_automacao')
        .update(updateData)
        .eq('id', flow.id)

      if (updateError) {
        throw updateError
      }

      // Também salvar via API mock (para compatibilidade)
      await saveAutomationFlow(flow.id, {
        name: flowName || flow.name,
        nodes: nodesToSave,
        edges
      })

      // Atualizar estado local (com handlers removidos)
      setFlow({
        ...flow,
        name: flowName || flow.name,
        nodes: nodesToSave,
        edges,
        updatedAt: new Date().toISOString()
      })

      // Feedback visual será mostrado no botão de salvar
    } catch (err: any) {
      await alert('Erro ao salvar fluxo: ' + (err.message || 'Erro desconhecido'), 'Erro')
      throw err
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando workflow...</p>
        </div>
      </div>
    )
  }

  if (error || !flow) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Fluxo não encontrado'}</p>
        </div>
      </div>
    )
  }

  const handleStatusToggle = async (newStatus: 'ativo' | 'inativo') => {
    if (!flow) return

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('fluxos_automacao')
        .update({ status: newStatus })
        .eq('id', flow.id)

      if (updateError) {
        throw updateError
      }

      setFlowStatus(newStatus)
    } catch (err: any) {
      await alert('Erro ao atualizar status: ' + (err.message || 'Erro desconhecido'), 'Erro')
    }
  }

  return (
    <WorkflowShell
      flowName={flow.name}
      initialNodes={flow.nodes}
      initialEdges={flow.edges}
      onSave={handleSave}
      workflowId={flow.id}
      enableRuntimeExecution={true}
      flowStatus={flowStatus}
      onStatusToggle={handleStatusToggle}
    />
  )
}

