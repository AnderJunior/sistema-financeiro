// lib/automations/nodes/executors.ts

import { AutomationNode } from '@/types/automation.types'
import { ExecutionContext } from '../executor'
import { createClient } from '@/lib/supabase/client'
import { getPrimeiraColunaKanbanId } from '@/lib/utils/kanban'

export interface NodeExecutionResult {
  success: boolean
  error?: string
  output?: any
}

/**
 * Executa um nó específico baseado no seu tipo
 */
export async function executeNode(
  node: AutomationNode,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  try {
    switch (node.type) {
      case 'gatilhoManual':
        // Gatilho manual apenas inicia o fluxo, não precisa fazer nada
        return { success: true, output: { triggered: true } }

      case 'acaoCriarProjeto':
        return await executeCriarProjeto(node, context)

      // Adicionar outros casos conforme necessário
      default:
        // Para nós não implementados, apenas passar adiante
        return { success: true, output: context.variables[node.id] }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}

/**
 * Executa o nó "Criar Projeto"
 * Valida campos obrigatórios e cria um lançamento financeiro vinculado ao serviço e cliente
 * (mesma lógica do modal de adicionar serviço manualmente)
 */
async function executeCriarProjeto(
  node: AutomationNode,
  context: ExecutionContext
): Promise<NodeExecutionResult> {
  try {
    // Obter valores dos parâmetros do nó (podem estar no formato { mode, value })
    const values = node.data.values || {}
    
    // Função helper para extrair valor (suporta formato antigo e novo)
    const getValue = (key: string, defaultValue: any = null) => {
      const val = values[key]
      if (val && typeof val === 'object' && 'mode' in val && 'value' in val) {
        // Formato novo: { mode: 'fixed' | 'expression', value: any }
        // Por enquanto, usar o valor diretamente (no futuro pode avaliar expressões)
        return val.value ?? defaultValue
      }
      // Formato antigo: valor direto
      return val ?? defaultValue
    }

    const clienteId = getValue('clienteId')
    const servicoId = getValue('servicoId')
    const valor = getValue('valor')
    const dataVencimento = getValue('dataVencimento')
    const descricao = getValue('descricao')
    const statusServico = getValue('statusServico', 'pendente')

    // Validar campos obrigatórios
    if (!clienteId || typeof clienteId !== 'string' || clienteId.trim() === '') {
      return {
        success: false,
        error: 'Campo obrigatório "ID do Cliente" não foi preenchido'
      }
    }

    if (!servicoId || typeof servicoId !== 'string' || servicoId.trim() === '') {
      return {
        success: false,
        error: 'Campo obrigatório "ID do Serviço" não foi preenchido'
      }
    }

    if (valor === undefined || valor === null || valor === '') {
      return {
        success: false,
        error: 'Campo obrigatório "Valor" não foi preenchido'
      }
    }

    const valorNumerico = typeof valor === 'string' ? parseFloat(valor) : Number(valor)
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      return {
        success: false,
        error: 'Campo "Valor" deve ser um número maior que zero'
      }
    }

    if (!dataVencimento || typeof dataVencimento !== 'string' || dataVencimento.trim() === '') {
      return {
        success: false,
        error: 'Campo obrigatório "Data de Vencimento" não foi preenchido'
      }
    }

    // Validação do statusServico removida - sempre usaremos a primeira coluna do kanban
    // O statusServico será definido automaticamente como o ID da coluna "A iniciar"

    const supabase = createClient()

    // Verificar se o cliente existe
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('id')
      .eq('id', clienteId)
      .single()

    if (clienteError || !cliente) {
      return {
        success: false,
        error: `Cliente com ID ${clienteId} não encontrado`
      }
    }

    // Verificar se o serviço existe e obter seus dados
    const { data: servico, error: servicoError } = await supabase
      .from('servicos')
      .select('id, nome, valor_base')
      .eq('id', servicoId)
      .single()

    if (servicoError || !servico) {
      return {
        success: false,
        error: `Serviço com ID ${servicoId} não encontrado`
      }
    }

    // Buscar categoria de entrada padrão
    const { data: categoria } = await supabase
      .from('financeiro_categorias')
      .select('id')
      .eq('tipo', 'entrada')
      .eq('ativo', true)
      .limit(1)
      .single()

    // Obter ID da primeira coluna do kanban (coluna "A iniciar")
    // Todos os projetos criados por automação devem aparecer em "A iniciar"
    const statusServicoId = await getPrimeiraColunaKanbanId()
    
    if (!statusServicoId) {
      return {
        success: false,
        error: 'Não foi possível encontrar a coluna "A iniciar" no kanban. Verifique se as colunas do kanban estão configuradas.'
      }
    }

    // Criar o lançamento financeiro (mesma lógica do modal manual)
    const dataToInsert = {
      tipo: 'entrada' as const,
      categoria_id: categoria?.id || null,
      cliente_id: clienteId,
      servico_id: servicoId,
      descricao: descricao?.trim() || servico.nome || 'Serviço',
      data_competencia: new Date().toISOString().split('T')[0],
      data_vencimento: dataVencimento,
      valor: valorNumerico,
      status: 'previsto' as const,
      status_servico: statusServicoId,
    }

    const { data: lancamento, error: lancamentoError } = await supabase
      .from('financeiro_lancamentos')
      .insert([dataToInsert])
      .select('id, descricao, valor, status_servico')
      .single()

    if (lancamentoError) {
      return {
        success: false,
        error: `Erro ao criar projeto/serviço: ${lancamentoError.message}`
      }
    }

    // Retornar sucesso com os dados do lançamento criado
    return {
      success: true,
      output: {
        lancamentoId: lancamento.id,
        clienteId: clienteId,
        servicoId: servicoId,
        descricao: lancamento.descricao,
        valor: lancamento.valor,
        statusServico: lancamento.status_servico,
        dataVencimento: dataVencimento
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao criar projeto'
    }
  }
}

