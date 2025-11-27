// app/api/webhook/[flowId]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { executeWorkflow } from '@/lib/automations/executor'
import { AutomationFlow } from '@/types/automation.types'

export async function POST(
  request: NextRequest,
  { params }: { params: { flowId: string } }
) {
  try {
    const flowId = params.flowId
    let body
    try {
      body = await request.json()
    } catch {
      body = {}
    }
    const headers = request.headers

    // Buscar o fluxo no banco de dados
    const supabase = createClient()
    const { data: fluxo, error } = await supabase
      .from('fluxos_automacao')
      .select('*')
      .eq('id', flowId)
      .eq('status', 'ativo')
      .single()

    if (error || !fluxo) {
      return NextResponse.json(
        { error: 'Fluxo não encontrado ou inativo' },
        { status: 404 }
      )
    }

    // Verificar se o fluxo tem um gatilho de webhook
    const config = fluxo.configuracao as any || {}
    const nodes = config.nodes || []
    const edges = config.edges || []

    const webhookTrigger = nodes.find((node: any) => 
      node.type === 'gatilhoWebhookEntrada'
    )

    if (!webhookTrigger) {
      return NextResponse.json(
        { error: 'Fluxo não possui gatilho de webhook' },
        { status: 400 }
      )
    }

    // Verificar segredo se configurado
    const values = webhookTrigger.data?.values || {}
    const secret = values.secret?.value || values.secret
    if (secret) {
      const providedSecret = headers.get('x-webhook-secret') || body.secret
      if (providedSecret !== secret) {
        return NextResponse.json(
          { error: 'Segredo inválido' },
          { status: 401 }
        )
      }
    }

    // Executar o fluxo com o contexto do webhook
    await executeWorkflow(
      nodes,
      edges,
      {
        onLog: (nodeId, level, message, data) => {
          console.log(`[Webhook ${flowId}] ${level}: ${message}`, data)
        }
      },
      'gatilhoWebhookEntrada',
      {
        tipo: 'webhook',
        body,
        headers: Object.fromEntries(headers.entries()),
        timestamp: new Date().toISOString()
      }
    )

    return NextResponse.json({ 
      success: true,
      message: 'Webhook processado com sucesso'
    })
  } catch (error) {
    console.error('Erro ao processar webhook:', error)
    return NextResponse.json(
      { error: 'Erro ao processar webhook' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { flowId: string } }
) {
  // Retornar informações sobre o webhook
  const flowId = params.flowId
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  
  return NextResponse.json({
    webhookUrl: `${baseUrl}/api/webhook/${flowId}`,
    method: 'POST',
    description: 'Envie uma requisição POST para este endpoint para acionar o fluxo'
  })
}

