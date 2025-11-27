-- Migration: Implementar isolamento completo de dados por usuário (SaaS)
-- Esta migration adiciona Row Level Security (RLS) em todas as tabelas
-- Garantindo que cada usuário só possa acessar seus próprios dados

-- ============================================================================
-- PARTE 1: Adicionar coluna user_id em todas as tabelas
-- ============================================================================

-- Clientes
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Serviços
ALTER TABLE servicos 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Grupos
ALTER TABLE grupos 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Clientes Grupos (tabela de relacionamento)
ALTER TABLE clientes_grupos 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Projetos
ALTER TABLE projetos 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Categorias Financeiras
ALTER TABLE financeiro_categorias 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Contas Financeiras
ALTER TABLE contas_financeiras 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Lançamentos Financeiros
ALTER TABLE financeiro_lancamentos 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Transferências Bancárias
ALTER TABLE transferencias_bancarias 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Notificações Log
ALTER TABLE notificacoes_log 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tarefas
ALTER TABLE tarefas 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tarefas Atividades
ALTER TABLE tarefas_atividades 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tarefas Comentários
ALTER TABLE tarefas_comentarios 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tarefas Kanban Colunas
ALTER TABLE tarefas_kanban_colunas 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Kanban Colunas (para projetos/serviços)
ALTER TABLE kanban_colunas 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Fluxos Automação
ALTER TABLE fluxos_automacao 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Workflow Executions
ALTER TABLE workflow_executions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Workflow Execution Node States
ALTER TABLE workflow_execution_node_states 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Configurações Sistema
ALTER TABLE configuracoes_sistema 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================================
-- PARTE 2: Criar índices para melhor performance nas queries filtradas por user_id
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_servicos_user_id ON servicos(user_id);
CREATE INDEX IF NOT EXISTS idx_grupos_user_id ON grupos(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_grupos_user_id ON clientes_grupos(user_id);
CREATE INDEX IF NOT EXISTS idx_projetos_user_id ON projetos(user_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_categorias_user_id ON financeiro_categorias(user_id);
CREATE INDEX IF NOT EXISTS idx_contas_financeiras_user_id ON contas_financeiras(user_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_lancamentos_user_id ON financeiro_lancamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_bancarias_user_id ON transferencias_bancarias(user_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_log_user_id ON notificacoes_log(user_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_user_id ON tarefas(user_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_atividades_user_id ON tarefas_atividades(user_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_comentarios_user_id ON tarefas_comentarios(user_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_kanban_colunas_user_id ON tarefas_kanban_colunas(user_id);
CREATE INDEX IF NOT EXISTS idx_kanban_colunas_user_id ON kanban_colunas(user_id);
CREATE INDEX IF NOT EXISTS idx_fluxos_automacao_user_id ON fluxos_automacao(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_id ON workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_node_states_user_id ON workflow_execution_node_states(user_id);
CREATE INDEX IF NOT EXISTS idx_configuracoes_sistema_user_id ON configuracoes_sistema(user_id);

-- ============================================================================
-- PARTE 3: Habilitar Row Level Security (RLS) em todas as tabelas
-- ============================================================================

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transferencias_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas_kanban_colunas ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_colunas ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxos_automacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_execution_node_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PARTE 4: Criar políticas RLS para SELECT (usuários só veem seus próprios dados)
-- ============================================================================

-- Clientes
CREATE POLICY "Users can only view their own clientes"
ON clientes FOR SELECT
USING (auth.uid() = user_id);

-- Serviços
CREATE POLICY "Users can only view their own servicos"
ON servicos FOR SELECT
USING (auth.uid() = user_id);

-- Grupos
CREATE POLICY "Users can only view their own grupos"
ON grupos FOR SELECT
USING (auth.uid() = user_id);

-- Clientes Grupos
CREATE POLICY "Users can only view their own clientes_grupos"
ON clientes_grupos FOR SELECT
USING (auth.uid() = user_id);

-- Projetos
CREATE POLICY "Users can only view their own projetos"
ON projetos FOR SELECT
USING (auth.uid() = user_id);

-- Categorias Financeiras
CREATE POLICY "Users can only view their own financeiro_categorias"
ON financeiro_categorias FOR SELECT
USING (auth.uid() = user_id);

-- Contas Financeiras
CREATE POLICY "Users can only view their own contas_financeiras"
ON contas_financeiras FOR SELECT
USING (auth.uid() = user_id);

-- Lançamentos Financeiros
CREATE POLICY "Users can only view their own financeiro_lancamentos"
ON financeiro_lancamentos FOR SELECT
USING (auth.uid() = user_id);

-- Transferências Bancárias
CREATE POLICY "Users can only view their own transferencias_bancarias"
ON transferencias_bancarias FOR SELECT
USING (auth.uid() = user_id);

-- Notificações Log
CREATE POLICY "Users can only view their own notificacoes_log"
ON notificacoes_log FOR SELECT
USING (auth.uid() = user_id);

-- Tarefas
CREATE POLICY "Users can only view their own tarefas"
ON tarefas FOR SELECT
USING (auth.uid() = user_id);

-- Tarefas Atividades
CREATE POLICY "Users can only view their own tarefas_atividades"
ON tarefas_atividades FOR SELECT
USING (auth.uid() = user_id);

-- Tarefas Comentários
CREATE POLICY "Users can only view their own tarefas_comentarios"
ON tarefas_comentarios FOR SELECT
USING (auth.uid() = user_id);

-- Tarefas Kanban Colunas
CREATE POLICY "Users can only view their own tarefas_kanban_colunas"
ON tarefas_kanban_colunas FOR SELECT
USING (auth.uid() = user_id);

-- Kanban Colunas
CREATE POLICY "Users can only view their own kanban_colunas"
ON kanban_colunas FOR SELECT
USING (auth.uid() = user_id);

-- Fluxos Automação
CREATE POLICY "Users can only view their own fluxos_automacao"
ON fluxos_automacao FOR SELECT
USING (auth.uid() = user_id);

-- Workflow Executions
CREATE POLICY "Users can only view their own workflow_executions"
ON workflow_executions FOR SELECT
USING (auth.uid() = user_id);

-- Workflow Execution Node States
CREATE POLICY "Users can only view their own workflow_execution_node_states"
ON workflow_execution_node_states FOR SELECT
USING (auth.uid() = user_id);

-- Configurações Sistema
CREATE POLICY "Users can only view their own configuracoes_sistema"
ON configuracoes_sistema FOR SELECT
USING (auth.uid() = user_id);

-- ============================================================================
-- PARTE 5: Criar políticas RLS para INSERT (usuários só podem inserir com seu user_id)
-- ============================================================================

-- Clientes
CREATE POLICY "Users can only insert their own clientes"
ON clientes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Serviços
CREATE POLICY "Users can only insert their own servicos"
ON servicos FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Grupos
CREATE POLICY "Users can only insert their own grupos"
ON grupos FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Clientes Grupos
CREATE POLICY "Users can only insert their own clientes_grupos"
ON clientes_grupos FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Projetos
CREATE POLICY "Users can only insert their own projetos"
ON projetos FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Categorias Financeiras
CREATE POLICY "Users can only insert their own financeiro_categorias"
ON financeiro_categorias FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Contas Financeiras
CREATE POLICY "Users can only insert their own contas_financeiras"
ON contas_financeiras FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Lançamentos Financeiros
CREATE POLICY "Users can only insert their own financeiro_lancamentos"
ON financeiro_lancamentos FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Transferências Bancárias
CREATE POLICY "Users can only insert their own transferencias_bancarias"
ON transferencias_bancarias FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Notificações Log
CREATE POLICY "Users can only insert their own notificacoes_log"
ON notificacoes_log FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Tarefas
CREATE POLICY "Users can only insert their own tarefas"
ON tarefas FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Tarefas Atividades
CREATE POLICY "Users can only insert their own tarefas_atividades"
ON tarefas_atividades FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Tarefas Comentários
CREATE POLICY "Users can only insert their own tarefas_comentarios"
ON tarefas_comentarios FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Tarefas Kanban Colunas
CREATE POLICY "Users can only insert their own tarefas_kanban_colunas"
ON tarefas_kanban_colunas FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Kanban Colunas
CREATE POLICY "Users can only insert their own kanban_colunas"
ON kanban_colunas FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Fluxos Automação
CREATE POLICY "Users can only insert their own fluxos_automacao"
ON fluxos_automacao FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Workflow Executions
CREATE POLICY "Users can only insert their own workflow_executions"
ON workflow_executions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Workflow Execution Node States
CREATE POLICY "Users can only insert their own workflow_execution_node_states"
ON workflow_execution_node_states FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Configurações Sistema
CREATE POLICY "Users can only insert their own configuracoes_sistema"
ON configuracoes_sistema FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- PARTE 6: Criar políticas RLS para UPDATE (usuários só podem atualizar seus próprios dados)
-- ============================================================================

-- Clientes
CREATE POLICY "Users can only update their own clientes"
ON clientes FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Serviços
CREATE POLICY "Users can only update their own servicos"
ON servicos FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Grupos
CREATE POLICY "Users can only update their own grupos"
ON grupos FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Clientes Grupos
CREATE POLICY "Users can only update their own clientes_grupos"
ON clientes_grupos FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Projetos
CREATE POLICY "Users can only update their own projetos"
ON projetos FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Categorias Financeiras
CREATE POLICY "Users can only update their own financeiro_categorias"
ON financeiro_categorias FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Contas Financeiras
CREATE POLICY "Users can only update their own contas_financeiras"
ON contas_financeiras FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Lançamentos Financeiros
CREATE POLICY "Users can only update their own financeiro_lancamentos"
ON financeiro_lancamentos FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Transferências Bancárias
CREATE POLICY "Users can only update their own transferencias_bancarias"
ON transferencias_bancarias FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Notificações Log
CREATE POLICY "Users can only update their own notificacoes_log"
ON notificacoes_log FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Tarefas
CREATE POLICY "Users can only update their own tarefas"
ON tarefas FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Tarefas Atividades
CREATE POLICY "Users can only update their own tarefas_atividades"
ON tarefas_atividades FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Tarefas Comentários
CREATE POLICY "Users can only update their own tarefas_comentarios"
ON tarefas_comentarios FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Tarefas Kanban Colunas
CREATE POLICY "Users can only update their own tarefas_kanban_colunas"
ON tarefas_kanban_colunas FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Kanban Colunas
CREATE POLICY "Users can only update their own kanban_colunas"
ON kanban_colunas FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Fluxos Automação
CREATE POLICY "Users can only update their own fluxos_automacao"
ON fluxos_automacao FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Workflow Executions
CREATE POLICY "Users can only update their own workflow_executions"
ON workflow_executions FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Workflow Execution Node States
CREATE POLICY "Users can only update their own workflow_execution_node_states"
ON workflow_execution_node_states FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Configurações Sistema
CREATE POLICY "Users can only update their own configuracoes_sistema"
ON configuracoes_sistema FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- PARTE 7: Criar políticas RLS para DELETE (usuários só podem deletar seus próprios dados)
-- ============================================================================

-- Clientes
CREATE POLICY "Users can only delete their own clientes"
ON clientes FOR DELETE
USING (auth.uid() = user_id);

-- Serviços
CREATE POLICY "Users can only delete their own servicos"
ON servicos FOR DELETE
USING (auth.uid() = user_id);

-- Grupos
CREATE POLICY "Users can only delete their own grupos"
ON grupos FOR DELETE
USING (auth.uid() = user_id);

-- Clientes Grupos
CREATE POLICY "Users can only delete their own clientes_grupos"
ON clientes_grupos FOR DELETE
USING (auth.uid() = user_id);

-- Projetos
CREATE POLICY "Users can only delete their own projetos"
ON projetos FOR DELETE
USING (auth.uid() = user_id);

-- Categorias Financeiras
CREATE POLICY "Users can only delete their own financeiro_categorias"
ON financeiro_categorias FOR DELETE
USING (auth.uid() = user_id);

-- Contas Financeiras
CREATE POLICY "Users can only delete their own contas_financeiras"
ON contas_financeiras FOR DELETE
USING (auth.uid() = user_id);

-- Lançamentos Financeiros
CREATE POLICY "Users can only delete their own financeiro_lancamentos"
ON financeiro_lancamentos FOR DELETE
USING (auth.uid() = user_id);

-- Transferências Bancárias
CREATE POLICY "Users can only delete their own transferencias_bancarias"
ON transferencias_bancarias FOR DELETE
USING (auth.uid() = user_id);

-- Notificações Log
CREATE POLICY "Users can only delete their own notificacoes_log"
ON notificacoes_log FOR DELETE
USING (auth.uid() = user_id);

-- Tarefas
CREATE POLICY "Users can only delete their own tarefas"
ON tarefas FOR DELETE
USING (auth.uid() = user_id);

-- Tarefas Atividades
CREATE POLICY "Users can only delete their own tarefas_atividades"
ON tarefas_atividades FOR DELETE
USING (auth.uid() = user_id);

-- Tarefas Comentários
CREATE POLICY "Users can only delete their own tarefas_comentarios"
ON tarefas_comentarios FOR DELETE
USING (auth.uid() = user_id);

-- Tarefas Kanban Colunas
CREATE POLICY "Users can only delete their own tarefas_kanban_colunas"
ON tarefas_kanban_colunas FOR DELETE
USING (auth.uid() = user_id);

-- Kanban Colunas
CREATE POLICY "Users can only delete their own kanban_colunas"
ON kanban_colunas FOR DELETE
USING (auth.uid() = user_id);

-- Fluxos Automação
CREATE POLICY "Users can only delete their own fluxos_automacao"
ON fluxos_automacao FOR DELETE
USING (auth.uid() = user_id);

-- Workflow Executions
CREATE POLICY "Users can only delete their own workflow_executions"
ON workflow_executions FOR DELETE
USING (auth.uid() = user_id);

-- Workflow Execution Node States
CREATE POLICY "Users can only delete their own workflow_execution_node_states"
ON workflow_execution_node_states FOR DELETE
USING (auth.uid() = user_id);

-- Configurações Sistema
CREATE POLICY "Users can only delete their own configuracoes_sistema"
ON configuracoes_sistema FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- PARTE 8: Criar função para definir user_id automaticamente em INSERTs
-- ============================================================================

-- Função genérica para definir user_id automaticamente
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Se user_id não foi fornecido, usar o usuário autenticado
  IF NEW.user_id IS NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  
  -- Garantir que o user_id sempre corresponde ao usuário autenticado
  -- Isso previne tentativas de inserir dados para outros usuários
  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'user_id must match authenticated user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger em todas as tabelas
CREATE TRIGGER set_user_id_clientes
  BEFORE INSERT ON clientes
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_servicos
  BEFORE INSERT ON servicos
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_grupos
  BEFORE INSERT ON grupos
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_clientes_grupos
  BEFORE INSERT ON clientes_grupos
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_projetos
  BEFORE INSERT ON projetos
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_financeiro_categorias
  BEFORE INSERT ON financeiro_categorias
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_contas_financeiras
  BEFORE INSERT ON contas_financeiras
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_financeiro_lancamentos
  BEFORE INSERT ON financeiro_lancamentos
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_transferencias_bancarias
  BEFORE INSERT ON transferencias_bancarias
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_notificacoes_log
  BEFORE INSERT ON notificacoes_log
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_tarefas
  BEFORE INSERT ON tarefas
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_tarefas_atividades
  BEFORE INSERT ON tarefas_atividades
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_tarefas_comentarios
  BEFORE INSERT ON tarefas_comentarios
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_tarefas_kanban_colunas
  BEFORE INSERT ON tarefas_kanban_colunas
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_kanban_colunas
  BEFORE INSERT ON kanban_colunas
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_fluxos_automacao
  BEFORE INSERT ON fluxos_automacao
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_workflow_executions
  BEFORE INSERT ON workflow_executions
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_workflow_execution_node_states
  BEFORE INSERT ON workflow_execution_node_states
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_configuracoes_sistema
  BEFORE INSERT ON configuracoes_sistema
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

-- ============================================================================
-- PARTE 9: Criar função para prevenir alteração de user_id em UPDATEs
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_user_id_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevenir alteração de user_id após criação
  IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'Cannot change user_id after creation';
  END IF;
  
  -- Garantir que o user_id sempre corresponde ao usuário autenticado
  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'user_id must match authenticated user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger em todas as tabelas para UPDATEs
CREATE TRIGGER prevent_user_id_change_clientes
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();

CREATE TRIGGER prevent_user_id_change_servicos
  BEFORE UPDATE ON servicos
  FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();

CREATE TRIGGER prevent_user_id_change_grupos
  BEFORE UPDATE ON grupos
  FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();

CREATE TRIGGER prevent_user_id_change_clientes_grupos
  BEFORE UPDATE ON clientes_grupos
  FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();

CREATE TRIGGER prevent_user_id_change_projetos
  BEFORE UPDATE ON projetos
  FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();

CREATE TRIGGER prevent_user_id_change_financeiro_categorias
  BEFORE UPDATE ON financeiro_categorias
  FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();

CREATE TRIGGER prevent_user_id_change_contas_financeiras
  BEFORE UPDATE ON contas_financeiras
  FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();

CREATE TRIGGER prevent_user_id_change_financeiro_lancamentos
  BEFORE UPDATE ON financeiro_lancamentos
  FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();

CREATE TRIGGER prevent_user_id_change_transferencias_bancarias
  BEFORE UPDATE ON transferencias_bancarias
  FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();

CREATE TRIGGER prevent_user_id_change_notificacoes_log
  BEFORE UPDATE ON notificacoes_log
  FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();

CREATE TRIGGER prevent_user_id_change_tarefas
  BEFORE UPDATE ON tarefas
  FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();

CREATE TRIGGER prevent_user_id_change_tarefas_atividades
  BEFORE UPDATE ON tarefas_atividades
  FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();

CREATE TRIGGER prevent_user_id_change_tarefas_comentarios
  BEFORE UPDATE ON tarefas_comentarios
  FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();

CREATE TRIGGER prevent_user_id_change_tarefas_kanban_colunas
  BEFORE UPDATE ON tarefas_kanban_colunas
  FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();

CREATE TRIGGER prevent_user_id_change_kanban_colunas
  BEFORE UPDATE ON kanban_colunas
  FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();

CREATE TRIGGER prevent_user_id_change_fluxos_automacao
  BEFORE UPDATE ON fluxos_automacao
  FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();

CREATE TRIGGER prevent_user_id_change_workflow_executions
  BEFORE UPDATE ON workflow_executions
  FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();

CREATE TRIGGER prevent_user_id_change_workflow_execution_node_states
  BEFORE UPDATE ON workflow_execution_node_states
  FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();

CREATE TRIGGER prevent_user_id_change_configuracoes_sistema
  BEFORE UPDATE ON configuracoes_sistema
  FOR EACH ROW EXECUTE FUNCTION prevent_user_id_change();

-- ============================================================================
-- NOTA IMPORTANTE:
-- ============================================================================
-- Esta migration implementa isolamento completo de dados por usuário.
-- 
-- SEGURANÇA GARANTIDA:
-- 1. Row Level Security (RLS) habilitado em todas as tabelas
-- 2. Políticas RLS garantem que usuários só vejam/modifiquem seus próprios dados
-- 3. Triggers garantem que user_id seja sempre definido automaticamente
-- 4. Triggers previnem alteração de user_id após criação
-- 5. Todas as operações são validadas no nível do banco de dados
--
-- Mesmo que alguém tente acessar dados via console do navegador ou modificar
-- requisições HTTP, o Supabase bloqueará qualquer acesso a dados de outros usuários.
--
-- IMPORTANTE: Após executar esta migration, todos os dados existentes precisarão
-- ter user_id definido. Se houver dados existentes, execute um script de migração
-- para atribuir user_id aos dados existentes antes de habilitar RLS.
-- ============================================================================

