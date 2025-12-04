import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Esta API Route verifica se um assinante está ativo
// Ela consulta o MESMO Supabase que o sistema usa (tabela assinantes)
// Usa Service Role Key para ter acesso à tabela de assinantes

export async function POST(request: NextRequest) {
  try {
    // Verificar se as variáveis de ambiente estão configuradas
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Variáveis de ambiente do Supabase não configuradas')
      return NextResponse.json(
        { 
          status: 'erro', 
          message: 'Serviço de licenciamento não configurado' 
        },
        { status: 500 }
      )
    }

    // Criar cliente Supabase usando Service Role Key (mesmo Supabase do sistema)
    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Obter dados da requisição
    const body = await request.json()
    const { email, dominio, api_key } = body

    if (!email || !dominio) {
      return NextResponse.json(
        { 
          status: 'invalido', 
          message: 'Email e domínio são obrigatórios' 
        },
        { status: 400 }
      )
    }

    // Construir query de verificação
    let query = supabase
      .from('assinantes')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('dominio', dominio.toLowerCase().trim())

    // Se API key for fornecida, verificar também
    if (api_key) {
      query = query.eq('api_key', api_key)
    }

    const { data: assinante, error } = await query.single()

    // Verificar se encontrou o assinante
    if (error || !assinante) {
      console.log(`Licença não encontrada: ${email} - ${dominio}`)
      return NextResponse.json(
        { 
          status: 'invalido', 
          message: 'Licença não encontrada ou inválida' 
        },
        { status: 403 }
      )
    }

    // Verificar se o status está ativo ou teste
    if (assinante.status !== 'ativo' && assinante.status !== 'teste') {
      console.log(`Licença inativa: ${email} - ${dominio} - Status: ${assinante.status}`)
      return NextResponse.json(
        { 
          status: 'invalido', 
          message: `Licença ${assinante.status}`,
          status_assinante: assinante.status
        },
        { status: 403 }
      )
    }

    // Verificar se a assinatura não está vencida
    if (assinante.data_vencimento && new Date(assinante.data_vencimento) < new Date()) {
      console.log(`Licença vencida: ${email} - ${dominio}`)
      
      // Atualizar status para suspenso
      await supabase
        .from('assinantes')
        .update({ 
          status: 'suspenso',
          updated_at: new Date().toISOString()
        })
        .eq('id', assinante.id)

      return NextResponse.json(
        { 
          status: 'invalido', 
          message: 'Licença vencida',
          status_assinante: 'vencido'
        },
        { status: 403 }
      )
    }

    // Atualizar última verificação e IP
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    await supabase
      .from('assinantes')
      .update({
        ultima_verificacao: new Date().toISOString(),
        proxima_verificacao: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // +1 dia
        ip_ultimo_acesso: clientIp,
        user_agent_ultimo_acesso: userAgent,
        updated_at: new Date().toISOString()
      })
      .eq('id', assinante.id)

    // Licença válida
    console.log(`Licença válida: ${email} - ${dominio}`)
    return NextResponse.json({
      status: 'ativo',
      data: {
        email: assinante.email,
        dominio: assinante.dominio,
        data_vencimento: assinante.data_vencimento,
        ultima_verificacao: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('Erro ao verificar licença:', error)
    return NextResponse.json(
      { 
        status: 'erro', 
        message: 'Erro interno ao verificar licença',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// Permitir apenas POST
export async function GET() {
  return NextResponse.json(
    { message: 'Método não permitido. Use POST.' },
    { status: 405 }
  )
}

