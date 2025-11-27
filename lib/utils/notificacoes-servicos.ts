import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'

type Lancamento = Database['public']['Tables']['financeiro_lancamentos']['Row'] & {
  servicos?: Database['public']['Tables']['servicos']['Row']
  clientes?: Database['public']['Tables']['clientes']['Row']
}

// Variável para controlar execução simultânea
let verificandoEmAndamento = false

/**
 * Verifica serviços atrasados e cria notificações em notificacoes_log
 * Um serviço está atrasado quando:
 * - Tem servico_id (não é null)
 * - Tem data_vencimento
 * - data_vencimento é menor ou igual a hoje (inclui serviços que vencem hoje)
 * - status_servico não é 'finalizado'
 */
export async function verificarServicosAtrasados(): Promise<void> {
  // Evitar execuções simultâneas
  if (verificandoEmAndamento) {
    return
  }
  
  verificandoEmAndamento = true
  const supabase = createClient()
  
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const hojeISO = hoje.toISOString().split('T')[0]

  try {
    // Buscar todos os lançamentos que são serviços com vencimento até hoje (incluindo hoje)
    // Usar .lte() para incluir serviços que vencem hoje também
    const { data: lancamentos, error } = await supabase
      .from('financeiro_lancamentos')
      .select(`
        *,
        servicos (*),
        clientes (*)
      `)
      .not('servico_id', 'is', null)
      .not('data_vencimento', 'is', null)
      .lte('data_vencimento', hojeISO)
      .order('data_vencimento', { ascending: true })

    if (error) {
      console.error('Erro ao buscar serviços atrasados:', error)
      return
    }

    if (!lancamentos || lancamentos.length === 0) {
      return
    }

    // Filtrar apenas os que não estão finalizados e agrupar por servico_id e cliente_id
    const servicosUnicos = new Map<string, Lancamento>()
    
    for (const lancamento of lancamentos as Lancamento[]) {
      // Pular se estiver finalizado
      if (lancamento.status_servico === 'finalizado') {
        continue
      }
      
      const key = `${lancamento.servico_id}-${lancamento.cliente_id}`
      if (!servicosUnicos.has(key)) {
        servicosUnicos.set(key, lancamento)
      }
    }

    // Para cada serviço atrasado único, verificar se já existe notificação
    for (const lancamento of servicosUnicos.values()) {
      const nomeServico = lancamento.servicos?.nome || 'Serviço não encontrado'
      const nomeCliente = lancamento.clientes?.nome || 'Cliente não encontrado'
      const dataVencimento = lancamento.data_vencimento
      
      if (!dataVencimento || !lancamento.servico_id || !lancamento.cliente_id) {
        continue
      }

      // Verificar se status_servico é 'finalizado' - se for, não criar notificação
      if (lancamento.status_servico === 'finalizado') {
        continue
      }

      // Verificar se já existe uma notificação para este serviço/cliente nas últimas 48 horas
      // Usar relacionado_id e relacionado_tipo para verificação mais precisa
      const ultimas48Horas = new Date(Date.now() - 48 * 60 * 60 * 1000)
      
      const { data: notifExistente, error: errorNotif } = await supabase
        .from('notificacoes_log')
        .select('id')
        .eq('tipo', 'projeto')
        .eq('titulo', 'Serviço Atrasado')
        .eq('relacionado_id', lancamento.servico_id)
        .eq('relacionado_tipo', 'projeto')
        .gte('data_referencia', ultimas48Horas.toISOString())
        .limit(1)
        .maybeSingle()

      if (errorNotif) {
        console.error('Erro ao verificar notificação existente:', errorNotif)
      }

      // Se já existe notificação recente para este serviço, pular
      if (notifExistente) {
        continue
      }

      // Criar notificação
      // Garantir que a data seja tratada como local (sem conversão de timezone)
      // Se dataVencimento já está no formato YYYY-MM-DD, usar diretamente com horário local
      let dataReferencia: string
      if (typeof dataVencimento === 'string' && dataVencimento.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Criar data local (não UTC) para evitar problemas de timezone
        const [ano, mes, dia] = dataVencimento.split('-')
        const dataLocal = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
        dataReferencia = dataLocal.toISOString()
      } else {
        // Para outros formatos, usar conversão normal
        dataReferencia = new Date(dataVencimento).toISOString()
      }

      const { error: notificacaoError } = await supabase
        .from('notificacoes_log')
        .insert({
          tipo: 'projeto',
          titulo: 'Serviço Atrasado',
          descricao: `${nomeServico} - Cliente: ${nomeCliente}`,
          data_referencia: dataReferencia,
          link: `/clientes/${lancamento.cliente_id}`,
          relacionado_id: lancamento.servico_id,
          relacionado_tipo: 'projeto',
          lida: false,
        })

      if (notificacaoError) {
        console.error(`Erro ao criar notificação para serviço ${lancamento.servico_id}:`, notificacaoError)
      }
    }
  } catch (error) {
    console.error('Erro ao verificar serviços atrasados:', error)
  } finally {
    verificandoEmAndamento = false
  }
}

