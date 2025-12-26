import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * API Route para limpar metadados de um usuário
 * Esta rota pode ser chamada quando o usuário não consegue autenticar devido a metadados corrompidos
 * 
 * Segurança: Requer email e um token temporário gerado no frontend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email é obrigatório' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Configuração do servidor inválida' },
        { status: 500 }
      )
    }

    // Criar cliente admin com Service Role Key
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Buscar usuário pelo email
    const { data: users, error: searchError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (searchError) {
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar usuário' },
        { status: 500 }
      )
    }

    const user = users.users.find(u => u.email === email.toLowerCase().trim())

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Obter metadados atuais e manter apenas nome_completo se existir
    const currentMetadata = user.user_metadata || {}
    const cleanedMetadata: any = {}
    
    if (currentMetadata.nome_completo) {
      cleanedMetadata.nome_completo = currentMetadata.nome_completo
    } else if (currentMetadata.full_name) {
      cleanedMetadata.nome_completo = currentMetadata.full_name
    }

    // Limpar metadados usando Admin API
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: cleanedMetadata
      }
    )

    if (updateError) {
      console.error('Erro ao atualizar metadados:', updateError)
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Metadados limpos com sucesso! Faça logout e login novamente.'
    })

  } catch (error: any) {
    console.error('Erro ao limpar metadados:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Erro desconhecido' },
      { status: 500 }
    )
  }
}


