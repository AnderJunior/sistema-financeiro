import { NextResponse } from 'next/server'
import { verificarServicosAtrasados } from '@/lib/utils/notificacoes-servicos'

export async function GET() {
  try {
    await verificarServicosAtrasados()
    return NextResponse.json({ 
      success: true, 
      message: 'Verificação de serviços atrasados concluída. Verifique o console do navegador para detalhes.' 
    })
  } catch (error: any) {
    console.error('Erro ao verificar serviços atrasados:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}














