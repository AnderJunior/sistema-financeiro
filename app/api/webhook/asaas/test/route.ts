import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Endpoint para testar webhooks manualmente em desenvolvimento
// Acesse: POST /api/webhook/asaas/test

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function POST(request: NextRequest) {
  // Apenas em desenvolvimento
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { subscriptionId, event = 'PAYMENT_CONFIRMED' } = body

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'subscriptionId é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar assinatura
    const { data: assinatura } = await supabaseAdmin
      .from('assinantes')
      .select('*')
      .eq('asaas_subscription_id', subscriptionId)
      .single()

    if (!assinatura) {
      return NextResponse.json(
        { error: 'Assinatura não encontrada' },
        { status: 404 }
      )
    }

    // Simular evento de pagamento confirmado
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      await supabaseAdmin
        .from('assinantes')
        .update({
          status: 'ativo',
          data_ativacao: new Date().toISOString(),
          ultima_verificacao: new Date().toISOString(),
          data_vencimento: new Date(
            new Date().setMonth(new Date().getMonth() + 1)
          ).toISOString(),
        })
        .eq('id', assinatura.id)

      return NextResponse.json({
        success: true,
        message: 'Assinatura ativada com sucesso',
        assinatura: {
          id: assinatura.id,
          status: 'ativo',
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: `Evento ${event} processado`,
    })
  } catch (error: any) {
    console.error('Erro ao processar webhook de teste:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar webhook' },
      { status: 500 }
    )
  }
}

// GET para mostrar instruções
export async function GET() {
  return NextResponse.json({
    message: 'Endpoint de teste de webhook',
    instrucoes: {
      metodo: 'POST',
      body: {
        subscriptionId: 'ID da assinatura no Asaas',
        event: 'PAYMENT_CONFIRMED (opcional)',
      },
      exemplo: {
        subscriptionId: 'sub_abc123',
        event: 'PAYMENT_CONFIRMED',
      },
    },
  })
}

