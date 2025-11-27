/**
 * API Route para atualizar cobrança ou assinatura no Asaas
 * TEMPORARIAMENTE DESABILITADO PARA BUILD
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Integração com Asaas temporariamente desabilitada' },
    { status: 501 }
  )
}
