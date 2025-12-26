-- Schema do Sistema Financeiro ERP
-- Execute este script no Supabase SQL Editor

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela: Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  tipo_pessoa VARCHAR(2) NOT NULL CHECK (tipo_pessoa IN ('PF', 'PJ')),
  cpf_cnpj VARCHAR(18) UNIQUE,
  email VARCHAR(255),
  telefone VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'a_iniciar' CHECK (status IN ('a_iniciar', 'em_andamento', 'finalizado')),
  data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  origem VARCHAR(100),
  observacoes TEXT,
  asaas_customer_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: Serviços
CREATE TABLE IF NOT EXISTS servicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('recorrente', 'assinatura', 'avulso', 'projeto')),
  valor_base DECIMAL(10, 2) NOT NULL DEFAULT 0,
  unidade_cobranca VARCHAR(20) NOT NULL CHECK (unidade_cobranca IN ('mensal', 'semestral', 'anual', 'projeto')),
  data_vencimento_faturas DATE,
  ativo BOOLEAN DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: Grupos
CREATE TABLE IF NOT EXISTS grupos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo_grupo VARCHAR(20) NOT NULL CHECK (tipo_grupo IN ('plano', 'projeto', 'turma', 'interno')),
  data_inicio DATE,
  data_fim DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'encerrado', 'em_andamento')),
  responsavel VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: Relação Cliente x Grupo
CREATE TABLE IF NOT EXISTS clientes_grupos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  grupo_id UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  data_entrada DATE DEFAULT CURRENT_DATE,
  data_saida DATE,
  papel VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cliente_id, grupo_id)
);

-- Tabela: Projetos
CREATE TABLE IF NOT EXISTS projetos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  cliente_principal_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  grupo_id UUID REFERENCES grupos(id) ON DELETE SET NULL,
  descricao TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluido', 'cancelado')),
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim_prevista DATE,
  data_fim_real DATE,
  valor_previsto DECIMAL(10, 2) DEFAULT 0,
  valor_fechado DECIMAL(10, 2) DEFAULT 0,
  progresso INTEGER DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
  responsavel VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: Categorias Financeiras
CREATE TABLE IF NOT EXISTS financeiro_categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: Contas Financeiras
CREATE TABLE IF NOT EXISTS contas_financeiras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('bancaria', 'carteira_digital', 'caixa_fisico')),
  agencia VARCHAR(10),
  conta VARCHAR(20),
  cor VARCHAR(7),
  banco_id VARCHAR(10),
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: Lançamentos Financeiros
CREATE TABLE IF NOT EXISTS financeiro_lancamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  categoria_id UUID REFERENCES financeiro_categorias(id) ON DELETE SET NULL,
  conta_id UUID REFERENCES contas_financeiras(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL,
  grupo_id UUID REFERENCES grupos(id) ON DELETE SET NULL,
  servico_id UUID REFERENCES servicos(id) ON DELETE SET NULL,
  descricao VARCHAR(500) NOT NULL,
  data_competencia DATE NOT NULL,
  data_vencimento DATE,
  data_pagamento DATE,
  valor DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'previsto' CHECK (status IN ('previsto', 'pago', 'em_atraso', 'cancelado')),
  forma_pagamento VARCHAR(20) CHECK (forma_pagamento IN ('pix', 'boleto', 'cartao', 'transferencia', 'dinheiro', 'outro')),
  origem VARCHAR(20) DEFAULT 'manual' CHECK (origem IN ('manual', 'importacao', 'outro')),
  asaas_payment_id VARCHAR(255),
  asaas_subscription_id VARCHAR(255),
  invoice_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: Transferências Bancárias
CREATE TABLE IF NOT EXISTS transferencias_bancarias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  banco_origem_id UUID NOT NULL REFERENCES contas_financeiras(id) ON DELETE RESTRICT,
  banco_recebedor_id UUID NOT NULL REFERENCES contas_financeiras(id) ON DELETE RESTRICT,
  valor_enviado DECIMAL(10, 2) NOT NULL CHECK (valor_enviado > 0),
  data_transferencia DATE NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (banco_origem_id != banco_recebedor_id)
);

-- Tabela: Log de Notificações
CREATE TABLE IF NOT EXISTS notificacoes_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('pagamento', 'projeto', 'cobranca')),
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT NOT NULL,
  data_referencia TIMESTAMP WITH TIME ZONE NOT NULL,
  link VARCHAR(500),
  relacionado_id UUID,
  relacionado_tipo VARCHAR(20) CHECK (relacionado_tipo IN ('cliente', 'projeto', 'lancamento')),
  lida BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_clientes_status ON clientes(status);
CREATE INDEX IF NOT EXISTS idx_clientes_tipo_pessoa ON clientes(tipo_pessoa);
CREATE INDEX IF NOT EXISTS idx_clientes_asaas_customer_id ON clientes(asaas_customer_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_asaas_payment_id ON financeiro_lancamentos(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_asaas_subscription_id ON financeiro_lancamentos(asaas_subscription_id);
CREATE INDEX IF NOT EXISTS idx_projetos_cliente ON projetos(cliente_principal_id);
CREATE INDEX IF NOT EXISTS idx_projetos_status ON projetos(status);
CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo ON financeiro_lancamentos(tipo);
CREATE INDEX IF NOT EXISTS idx_lancamentos_status ON financeiro_lancamentos(status);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data_competencia ON financeiro_lancamentos(data_competencia);
CREATE INDEX IF NOT EXISTS idx_lancamentos_cliente ON financeiro_lancamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_projeto ON financeiro_lancamentos(projeto_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_origem ON transferencias_bancarias(banco_origem_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_recebedor ON transferencias_bancarias(banco_recebedor_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_data ON transferencias_bancarias(data_transferencia);
CREATE INDEX IF NOT EXISTS idx_notificacoes_tipo ON notificacoes_log(tipo);
CREATE INDEX IF NOT EXISTS idx_notificacoes_data_referencia ON notificacoes_log(data_referencia);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes_log(lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_relacionado ON notificacoes_log(relacionado_tipo, relacionado_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_servicos_updated_at BEFORE UPDATE ON servicos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grupos_updated_at BEFORE UPDATE ON grupos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projetos_updated_at BEFORE UPDATE ON projetos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financeiro_categorias_updated_at BEFORE UPDATE ON financeiro_categorias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contas_financeiras_updated_at BEFORE UPDATE ON contas_financeiras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financeiro_lancamentos_updated_at BEFORE UPDATE ON financeiro_lancamentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transferencias_bancarias_updated_at BEFORE UPDATE ON transferencias_bancarias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notificacoes_log_updated_at BEFORE UPDATE ON notificacoes_log
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar status do projeto quando progresso = 100
CREATE OR REPLACE FUNCTION update_projeto_status_on_progress()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.progresso >= 100 AND NEW.status = 'em_andamento' THEN
    NEW.status = 'concluido';
    NEW.data_fim_real = COALESCE(NEW.data_fim_real, CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projeto_status_trigger BEFORE UPDATE ON projetos
  FOR EACH ROW EXECUTE FUNCTION update_projeto_status_on_progress();

-- Função para atualizar status de cobranças atrasadas automaticamente
CREATE OR REPLACE FUNCTION update_cobranca_status_on_vencimento()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se é uma cobrança (tipo = 'entrada')
  -- e se a data de vencimento é menor que a data atual
  IF NEW.tipo = 'entrada' 
     AND NEW.data_vencimento IS NOT NULL 
     AND NEW.data_vencimento < CURRENT_DATE 
     AND NEW.status NOT IN ('pago', 'cancelado') THEN
    NEW.status = 'em_atraso';
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar status de cobranças atrasadas
CREATE TRIGGER trigger_update_cobranca_status_on_vencimento
  BEFORE INSERT OR UPDATE ON financeiro_lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_cobranca_status_on_vencimento();

-- Função para atualizar cobranças existentes que estão atrasadas
CREATE OR REPLACE FUNCTION atualizar_cobrancas_atrasadas()
RETURNS INTEGER AS $$
DECLARE
  registros_atualizados INTEGER;
BEGIN
  -- Atualizar cobranças que estão atrasadas mas não estão marcadas como atrasadas
  UPDATE financeiro_lancamentos
  SET status = 'em_atraso',
      updated_at = NOW()
  WHERE tipo = 'entrada'
    AND data_vencimento IS NOT NULL
    AND data_vencimento < CURRENT_DATE
    AND status NOT IN ('pago', 'cancelado', 'em_atraso');
  
  GET DIAGNOSTICS registros_atualizados = ROW_COUNT;
  
  RETURN registros_atualizados;
END;
$$ language 'plpgsql';

-- Inserir categorias padrão
INSERT INTO financeiro_categorias (tipo, nome, descricao) VALUES
  ('entrada', 'Venda de Serviços', 'Receitas provenientes de vendas de serviços'),
  ('entrada', 'Recebimento de Projetos', 'Receitas de projetos concluídos'),
  ('entrada', 'Outras Receitas', 'Outras fontes de receita'),
  ('saida', 'Custo Operacional', 'Custos gerais de operação'),
  ('saida', 'Custo de Projeto', 'Custos específicos de projetos'),
  ('saida', 'Despesas Administrativas', 'Despesas administrativas gerais'),
  ('saida', 'Outras Despesas', 'Outras despesas')
ON CONFLICT DO NOTHING;

-- Inserir conta padrão
INSERT INTO contas_financeiras (nome, tipo, descricao) VALUES
  ('Conta Principal', 'bancaria', 'Conta bancária principal')
ON CONFLICT DO NOTHING;

-- Tabela: Tarefas
CREATE TABLE IF NOT EXISTS tarefas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  data_inicio DATE,
  data_vencimento TIMESTAMP WITH TIME ZONE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  projeto_id UUID REFERENCES projetos(id) ON DELETE SET NULL,
  prioridade VARCHAR(20) CHECK (prioridade IN ('urgente', 'alta', 'normal', 'baixa')),
  status VARCHAR(255) NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: Atividades de Tarefas (Log de mudanças)
CREATE TABLE IF NOT EXISTS tarefas_atividades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tarefa_id UUID NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('criacao', 'alteracao', 'status', 'comentario', 'vinculacao', 'desvinculacao')),
  campo_alterado VARCHAR(100),
  valor_anterior TEXT,
  valor_novo TEXT,
  descricao TEXT NOT NULL,
  usuario_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: Comentários de Tarefas
CREATE TABLE IF NOT EXISTS tarefas_comentarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tarefa_id UUID NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  comentario TEXT NOT NULL,
  usuario_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para tarefas
CREATE INDEX IF NOT EXISTS idx_tarefas_cliente ON tarefas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_projeto ON tarefas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas(status);
CREATE INDEX IF NOT EXISTS idx_tarefas_data_vencimento ON tarefas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_tarefas_atividades_tarefa ON tarefas_atividades(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_comentarios_tarefa ON tarefas_comentarios(tarefa_id);

-- Tabela: Colunas do Kanban de Tarefas
CREATE TABLE IF NOT EXISTS tarefas_kanban_colunas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  cor VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  -- Nota: Não há constraint UNIQUE no nome para permitir colunas com nomes iguais
);

CREATE INDEX IF NOT EXISTS idx_tarefas_kanban_colunas_ordem ON tarefas_kanban_colunas(ordem);
CREATE INDEX IF NOT EXISTS idx_tarefas_kanban_colunas_ativo ON tarefas_kanban_colunas(ativo);

-- Inserir colunas padrão (verificando se já existem antes de inserir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tarefas_kanban_colunas WHERE nome = 'Pendente') THEN
    INSERT INTO tarefas_kanban_colunas (nome, cor, ordem, ativo) VALUES ('Pendente', '#FBBF24', 0, true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tarefas_kanban_colunas WHERE nome = 'Em andamento') THEN
    INSERT INTO tarefas_kanban_colunas (nome, cor, ordem, ativo) VALUES ('Em andamento', '#2563EB', 1, true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tarefas_kanban_colunas WHERE nome = 'Concluídas') THEN
    INSERT INTO tarefas_kanban_colunas (nome, cor, ordem, ativo) VALUES ('Concluídas', '#16A34A', 2, true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tarefas_kanban_colunas WHERE nome = 'Canceladas') THEN
    INSERT INTO tarefas_kanban_colunas (nome, cor, ordem, ativo) VALUES ('Canceladas', '#DC2626', 3, true);
  END IF;
END $$;

-- Trigger para updated_at em tarefas
CREATE TRIGGER update_tarefas_updated_at BEFORE UPDATE ON tarefas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at em tarefas_comentarios
CREATE TRIGGER update_tarefas_comentarios_updated_at BEFORE UPDATE ON tarefas_comentarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

