import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AsaasWebhookEvent } from '@/lib/asaas/types'

// Usar Service Role para bypass de RLS
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
  try {
    // Validar token do webhook (se configurado)
    const webhookToken = request.headers.get('asaas-access-token')
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN

    if (expectedToken && webhookToken !== expectedToken) {
      console.warn('Webhook token inválido')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: AsaasWebhookEvent = await request.json()
    const { event, payment, subscription } = body

    console.log('Webhook Asaas recebido:', { event, payment, subscription })

    // Processar eventos relacionados a pagamentos
    if (payment) {
      await processPaymentEvent(event, payment)
    }

    // Processar eventos relacionados a assinaturas
    if (subscription) {
      await processSubscriptionEvent(event, subscription)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Erro ao processar webhook do Asaas:', error)
    return NextResponse.json(
      { error: 'Erro ao processar webhook' },
      { status: 500 }
    )
  }
}

async function processPaymentEvent(
  event: string,
  payment: any
) {
  // Buscar assinatura pelo ID do pagamento ou subscription_id
  const { data: assinatura } = await supabaseAdmin
    .from('assinantes')
    .select('*')
    .or(`asaas_subscription_id.eq.${payment.subscription},externalReference.eq.${payment.externalReference}`)
    .single()

  if (!assinatura) {
    console.log('Assinatura não encontrada para o pagamento:', payment.id)
    return
  }

  // Processar diferentes eventos de pagamento
  switch (event) {
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED':
      // Pagamento confirmado - ativar assinatura
      await supabaseAdmin
        .from('assinantes')
        .update({
          status: 'ativo',
          data_ativacao: new Date().toISOString(),
          ultima_verificacao: new Date().toISOString(),
          // Calcular próximo vencimento (próximo mês)
          data_vencimento: new Date(
            new Date().setMonth(new Date().getMonth() + 1)
          ).toISOString(),
        })
        .eq('id', assinatura.id)

      console.log('Assinatura ativada:', assinatura.id)
      break

    case 'PAYMENT_OVERDUE':
      // Pagamento em atraso - suspender assinatura
      await supabaseAdmin
        .from('assinantes')
        .update({
          status: 'suspenso',
          ultima_verificacao: new Date().toISOString(),
        })
        .eq('id', assinatura.id)

      console.log('Assinatura suspensa por atraso:', assinatura.id)
      break

    case 'PAYMENT_DELETED':
    case 'PAYMENT_REFUNDED':
      // Pagamento cancelado ou estornado
      await supabaseAdmin
        .from('assinantes')
        .update({
          status: 'cancelado',
          ultima_verificacao: new Date().toISOString(),
        })
        .eq('id', assinatura.id)

      console.log('Assinatura cancelada:', assinatura.id)
      break

    default:
      console.log('Evento de pagamento não processado:', event)
  }
}

async function processSubscriptionEvent(
  event: string,
  subscription: any
) {
  // Buscar assinatura pelo subscription_id
  const { data: assinatura } = await supabaseAdmin
    .from('assinantes')
    .select('*')
    .eq('asaas_subscription_id', subscription.id)
    .single()

  if (!assinatura) {
    console.log('Assinatura não encontrada:', subscription.id)
    return
  }

  // Processar eventos de assinatura
  switch (event) {
    case 'SUBSCRIPTION_ACTIVATED':
      await supabaseAdmin
        .from('assinantes')
        .update({
          status: 'ativo',
          data_ativacao: new Date().toISOString(),
          ultima_verificacao: new Date().toISOString(),
        })
        .eq('id', assinatura.id)

      console.log('Assinatura ativada via evento:', assinatura.id)
      break

    case 'SUBSCRIPTION_CANCELED':
      await supabaseAdmin
        .from('assinantes')
        .update({
          status: 'cancelado',
          ultima_verificacao: new Date().toISOString(),
        })
        .eq('id', assinatura.id)

      console.log('Assinatura cancelada via evento:', assinatura.id)
      break

    case 'SUBSCRIPTION_EXPIRED':
      await supabaseAdmin
        .from('assinantes')
        .update({
          status: 'suspenso',
          ultima_verificacao: new Date().toISOString(),
        })
        .eq('id', assinatura.id)

      console.log('Assinatura expirada:', assinatura.id)
      break

    default:
      console.log('Evento de assinatura não processado:', event)
  }
}

// Permitir apenas POST
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

