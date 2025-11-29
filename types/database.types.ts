export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clientes: {
        Row: {
          id: string
          nome: string
          tipo_pessoa: 'PF' | 'PJ'
          cpf_cnpj: string | null
          email: string | null
          telefone: string | null
          status: 'a_iniciar' | 'em_andamento' | 'finalizado'
          data_cadastro: string
          origem: string | null
          observacoes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          tipo_pessoa: 'PF' | 'PJ'
          cpf_cnpj?: string | null
          email?: string | null
          telefone?: string | null
          status?: 'ativo' | 'inativo' | 'em_prospeccao'
          data_cadastro?: string
          origem?: string | null
          observacoes?: string | null
        }
        Update: {
          id?: string
          nome?: string
          tipo_pessoa?: 'PF' | 'PJ'
          cpf_cnpj?: string | null
          email?: string | null
          telefone?: string | null
          status?: 'ativo' | 'inativo' | 'em_prospeccao'
          origem?: string | null
          observacoes?: string | null
        }
      }
      servicos: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          tipo: 'recorrente' | 'assinatura' | 'avulso' | 'projeto'
          valor_base: number
          unidade_cobranca: 'mensal' | 'semestral' | 'anual' | 'projeto'
          data_vencimento_faturas: string | null
          ativo: boolean
          observacoes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          tipo: 'recorrente' | 'assinatura' | 'avulso' | 'projeto'
          valor_base?: number
          unidade_cobranca: 'mensal' | 'semestral' | 'anual' | 'projeto'
          data_vencimento_faturas?: string | null
          ativo?: boolean
          observacoes?: string | null
        }
        Update: {
          nome?: string
          descricao?: string | null
          tipo?: 'recorrente' | 'assinatura' | 'avulso' | 'projeto'
          valor_base?: number
          unidade_cobranca?: 'mensal' | 'semestral' | 'anual' | 'projeto'
          data_vencimento_faturas?: string | null
          ativo?: boolean
          observacoes?: string | null
        }
      }
      grupos: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          tipo_grupo: 'plano' | 'projeto' | 'turma' | 'interno'
          data_inicio: string | null
          data_fim: string | null
          status: 'ativo' | 'encerrado' | 'em_andamento'
          responsavel: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          tipo_grupo: 'plano' | 'projeto' | 'turma' | 'interno'
          data_inicio?: string | null
          data_fim?: string | null
          status?: 'ativo' | 'encerrado' | 'em_andamento'
          responsavel?: string | null
        }
        Update: {
          nome?: string
          descricao?: string | null
          tipo_grupo?: 'plano' | 'projeto' | 'turma' | 'interno'
          data_inicio?: string | null
          data_fim?: string | null
          status?: 'ativo' | 'encerrado' | 'em_andamento'
          responsavel?: string | null
        }
      }
      clientes_grupos: {
        Row: {
          id: string
          cliente_id: string
          grupo_id: string
          data_entrada: string
          data_saida: string | null
          papel: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          grupo_id: string
          data_entrada?: string
          data_saida?: string | null
          papel?: string | null
        }
        Update: {
          cliente_id?: string
          grupo_id?: string
          data_entrada?: string
          data_saida?: string | null
          papel?: string | null
        }
      }
      projetos: {
        Row: {
          id: string
          nome: string
          cliente_principal_id: string
          grupo_id: string | null
          descricao: string | null
          status: 'em_andamento' | 'concluido' | 'cancelado'
          data_inicio: string
          data_fim_prevista: string | null
          data_fim_real: string | null
          valor_previsto: number
          valor_fechado: number
          progresso: number
          responsavel: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          cliente_principal_id: string
          grupo_id?: string | null
          descricao?: string | null
          status?: 'em_andamento' | 'concluido' | 'cancelado'
          data_inicio?: string
          data_fim_prevista?: string | null
          data_fim_real?: string | null
          valor_previsto?: number
          valor_fechado?: number
          progresso?: number
          responsavel?: string | null
        }
        Update: {
          nome?: string
          cliente_principal_id?: string
          grupo_id?: string | null
          descricao?: string | null
          status?: 'em_andamento' | 'concluido' | 'cancelado'
          data_inicio?: string
          data_fim_prevista?: string | null
          data_fim_real?: string | null
          valor_previsto?: number
          valor_fechado?: number
          progresso?: number
          responsavel?: string | null
        }
      }
      financeiro_categorias: {
        Row: {
          id: string
          tipo: 'entrada' | 'saida'
          nome: string
          descricao: string | null
          ativo: boolean
          is_coringa: boolean
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tipo: 'entrada' | 'saida'
          nome: string
          descricao?: string | null
          ativo?: boolean
          is_coringa?: boolean
          user_id?: string | null
        }
        Update: {
          tipo?: 'entrada' | 'saida'
          nome?: string
          descricao?: string | null
          ativo?: boolean
          is_coringa?: boolean
          user_id?: string | null
        }
      }
      contas_financeiras: {
        Row: {
          id: string
          nome: string
          tipo: 'bancaria' | 'carteira_digital' | 'caixa_fisico'
          agencia: string | null
          conta: string | null
          cor: string | null
          banco_id: string | null
          descricao: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          tipo: 'bancaria' | 'carteira_digital' | 'caixa_fisico'
          agencia?: string | null
          conta?: string | null
          cor?: string | null
          banco_id?: string | null
          descricao?: string | null
          ativo?: boolean
        }
        Update: {
          nome?: string
          tipo?: 'bancaria' | 'carteira_digital' | 'caixa_fisico'
          agencia?: string | null
          conta?: string | null
          cor?: string | null
          banco_id?: string | null
          descricao?: string | null
          ativo?: boolean
        }
      }
      financeiro_lancamentos: {
        Row: {
          id: string
          tipo: 'entrada' | 'saida'
          categoria_id: string | null
          conta_id: string | null
          cliente_id: string | null
          projeto_id: string | null
          grupo_id: string | null
          servico_id: string | null
          descricao: string
          data_competencia: string
          data_vencimento: string | null
          data_pagamento: string | null
          valor: number
          status: 'previsto' | 'pago' | 'em_atraso' | 'cancelado'
          status_servico: 'pendente' | 'em_andamento' | 'finalizado' | null
          forma_pagamento: 'pix' | 'boleto' | 'cartao' | 'transferencia' | 'dinheiro' | 'outro' | null
          origem: 'manual' | 'importacao' | 'outro'
          observacoes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tipo: 'entrada' | 'saida'
          categoria_id?: string | null
          conta_id?: string | null
          cliente_id?: string | null
          projeto_id?: string | null
          grupo_id?: string | null
          servico_id?: string | null
          descricao: string
          data_competencia: string
          data_vencimento?: string | null
          data_pagamento?: string | null
          valor: number
          status?: 'previsto' | 'pago' | 'em_atraso' | 'cancelado'
          status_servico?: 'pendente' | 'em_andamento' | 'finalizado' | null
          forma_pagamento?: 'pix' | 'boleto' | 'cartao' | 'transferencia' | 'dinheiro' | 'outro' | null
          origem?: 'manual' | 'importacao' | 'outro'
          observacoes?: string | null
        }
        Update: {
          tipo?: 'entrada' | 'saida'
          categoria_id?: string | null
          conta_id?: string | null
          cliente_id?: string | null
          projeto_id?: string | null
          grupo_id?: string | null
          servico_id?: string | null
          descricao?: string
          data_competencia?: string
          data_vencimento?: string | null
          data_pagamento?: string | null
          valor?: number
          status?: 'previsto' | 'pago' | 'em_atraso' | 'cancelado'
          status_servico?: 'pendente' | 'em_andamento' | 'finalizado' | null
          forma_pagamento?: 'pix' | 'boleto' | 'cartao' | 'transferencia' | 'dinheiro' | 'outro' | null
          origem?: 'manual' | 'importacao' | 'outro'
          observacoes?: string | null
        }
      }
      transferencias_bancarias: {
        Row: {
          id: string
          banco_origem_id: string
          banco_recebedor_id: string
          valor_enviado: number
          data_transferencia: string
          descricao: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          banco_origem_id: string
          banco_recebedor_id: string
          valor_enviado: number
          data_transferencia: string
          descricao?: string | null
        }
        Update: {
          banco_origem_id?: string
          banco_recebedor_id?: string
          valor_enviado?: number
          data_transferencia?: string
          descricao?: string | null
        }
      }
      notificacoes_log: {
        Row: {
          id: string
          tipo: 'pagamento' | 'projeto' | 'cobranca'
          titulo: string
          descricao: string
          data_referencia: string
          link: string | null
          relacionado_id: string | null
          relacionado_tipo: 'cliente' | 'projeto' | 'lancamento' | null
          lida: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tipo: 'pagamento' | 'projeto' | 'cobranca'
          titulo: string
          descricao: string
          data_referencia: string
          link?: string | null
          relacionado_id?: string | null
          relacionado_tipo?: 'cliente' | 'projeto' | 'lancamento' | null
          lida?: boolean
        }
        Update: {
          tipo?: 'pagamento' | 'projeto' | 'cobranca'
          titulo?: string
          descricao?: string
          data_referencia?: string
          link?: string | null
          relacionado_id?: string | null
          relacionado_tipo?: 'cliente' | 'projeto' | 'lancamento' | null
          lida?: boolean
        }
      }
      tarefas: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          data_inicio: string | null
          data_vencimento: string | null
          cliente_id: string | null
          projeto_id: string | null
          prioridade: 'urgente' | 'alta' | 'normal' | 'baixa' | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          data_inicio?: string | null
          data_vencimento?: string | null
          cliente_id?: string | null
          projeto_id?: string | null
          prioridade?: 'urgente' | 'alta' | 'normal' | 'baixa' | null
          status?: string
        }
        Update: {
          nome?: string
          descricao?: string | null
          data_inicio?: string | null
          data_vencimento?: string | null
          cliente_id?: string | null
          projeto_id?: string | null
          prioridade?: 'urgente' | 'alta' | 'normal' | 'baixa' | null
          status?: string
        }
      }
      kanban_colunas: {
        Row: {
          id: string
          nome: string
          cor: string
          ordem: number
          status_servico: 'pendente' | 'em_andamento' | 'finalizado' | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          cor?: string
          ordem?: number
          status_servico?: 'pendente' | 'em_andamento' | 'finalizado' | null
          ativo?: boolean
        }
        Update: {
          nome?: string
          cor?: string
          ordem?: number
          status_servico?: 'pendente' | 'em_andamento' | 'finalizado' | null
          ativo?: boolean
        }
      }
    }
  }
}

