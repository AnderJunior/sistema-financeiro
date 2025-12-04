-- Migration: Adicionar verificação de assinatura ativa em todas as políticas RLS
-- Usuários sem assinatura ativa ou em teste não podem acessar nenhum dado do sistema
-- Data: 2024

-- ============================================================================
-- PARTE 1: Criar função para verificar se usuário tem assinatura ativa ou em teste
-- ============================================================================
CREATE OR REPLACE FUNCTION user_has_active_subscription()
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  has_active BOOLEAN;
BEGIN
  -- Obter o ID do usuário autenticado
  current_user_id := (SELECT auth.uid());
  
  -- Se não há usuário autenticado, retornar false
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar se existe assinatura ativa ou em teste
  -- Assinatura válida = (status = 'ativo' OU status = 'teste') E (data_vencimento IS NULL OU data_vencimento >= hoje)
  SELECT EXISTS(
    SELECT 1 
    FROM assinantes 
    WHERE user_id = current_user_id
      AND status IN ('ativo', 'teste')
      AND (data_vencimento IS NULL OR data_vencimento >= CURRENT_DATE)
  ) INTO has_active;
  
  RETURN COALESCE(has_active, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário na função
COMMENT ON FUNCTION user_has_active_subscription() IS 
'Verifica se o usuário autenticado possui uma assinatura ativa ou em teste e não vencida';

-- ============================================================================
-- PARTE 2: Atualizar todas as políticas RLS para incluir verificação de assinatura
-- ============================================================================

-- Clientes - SELECT
DROP POLICY IF EXISTS "Users can only view their own clientes" ON clientes;
CREATE POLICY "Users can only view their own clientes"
ON clientes FOR SELECT
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Clientes - INSERT
DROP POLICY IF EXISTS "Users can only insert their own clientes" ON clientes;
CREATE POLICY "Users can only insert their own clientes"
ON clientes FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Clientes - UPDATE
DROP POLICY IF EXISTS "Users can only update their own clientes" ON clientes;
CREATE POLICY "Users can only update their own clientes"
ON clientes FOR UPDATE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
)
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Clientes - DELETE
DROP POLICY IF EXISTS "Users can only delete their own clientes" ON clientes;
CREATE POLICY "Users can only delete their own clientes"
ON clientes FOR DELETE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Serviços - SELECT
DROP POLICY IF EXISTS "Users can only view their own servicos" ON servicos;
CREATE POLICY "Users can only view their own servicos"
ON servicos FOR SELECT
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Serviços - INSERT
DROP POLICY IF EXISTS "Users can only insert their own servicos" ON servicos;
CREATE POLICY "Users can only insert their own servicos"
ON servicos FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Serviços - UPDATE
DROP POLICY IF EXISTS "Users can only update their own servicos" ON servicos;
CREATE POLICY "Users can only update their own servicos"
ON servicos FOR UPDATE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
)
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Serviços - DELETE
DROP POLICY IF EXISTS "Users can only delete their own servicos" ON servicos;
CREATE POLICY "Users can only delete their own servicos"
ON servicos FOR DELETE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Grupos - SELECT
DROP POLICY IF EXISTS "Users can only view their own grupos" ON grupos;
CREATE POLICY "Users can only view their own grupos"
ON grupos FOR SELECT
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Grupos - INSERT
DROP POLICY IF EXISTS "Users can only insert their own grupos" ON grupos;
CREATE POLICY "Users can only insert their own grupos"
ON grupos FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Grupos - UPDATE
DROP POLICY IF EXISTS "Users can only update their own grupos" ON grupos;
CREATE POLICY "Users can only update their own grupos"
ON grupos FOR UPDATE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
)
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Grupos - DELETE
DROP POLICY IF EXISTS "Users can only delete their own grupos" ON grupos;
CREATE POLICY "Users can only delete their own grupos"
ON grupos FOR DELETE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Clientes Grupos - SELECT
DROP POLICY IF EXISTS "Users can only view their own clientes_grupos" ON clientes_grupos;
CREATE POLICY "Users can only view their own clientes_grupos"
ON clientes_grupos FOR SELECT
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Clientes Grupos - INSERT
DROP POLICY IF EXISTS "Users can only insert their own clientes_grupos" ON clientes_grupos;
CREATE POLICY "Users can only insert their own clientes_grupos"
ON clientes_grupos FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Clientes Grupos - UPDATE
DROP POLICY IF EXISTS "Users can only update their own clientes_grupos" ON clientes_grupos;
CREATE POLICY "Users can only update their own clientes_grupos"
ON clientes_grupos FOR UPDATE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
)
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Clientes Grupos - DELETE
DROP POLICY IF EXISTS "Users can only delete their own clientes_grupos" ON clientes_grupos;
CREATE POLICY "Users can only delete their own clientes_grupos"
ON clientes_grupos FOR DELETE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Projetos - SELECT
DROP POLICY IF EXISTS "Users can only view their own projetos" ON projetos;
CREATE POLICY "Users can only view their own projetos"
ON projetos FOR SELECT
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Projetos - INSERT
DROP POLICY IF EXISTS "Users can only insert their own projetos" ON projetos;
CREATE POLICY "Users can only insert their own projetos"
ON projetos FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Projetos - UPDATE
DROP POLICY IF EXISTS "Users can only update their own projetos" ON projetos;
CREATE POLICY "Users can only update their own projetos"
ON projetos FOR UPDATE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
)
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Projetos - DELETE
DROP POLICY IF EXISTS "Users can only delete their own projetos" ON projetos;
CREATE POLICY "Users can only delete their own projetos"
ON projetos FOR DELETE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Categorias Financeiras - SELECT (já tem política especial para coringas)
DROP POLICY IF EXISTS "Users can view coringas and their own financeiro_categorias" ON financeiro_categorias;
CREATE POLICY "Users can view coringas and their own financeiro_categorias"
ON financeiro_categorias FOR SELECT
USING (
  (
    is_coringa = true 
    OR 
    (user_id = (select auth.uid()))
  )
  AND user_has_active_subscription()
);

-- Categorias Financeiras - INSERT
DROP POLICY IF EXISTS "Users can only insert their own financeiro_categorias" ON financeiro_categorias;
CREATE POLICY "Users can only insert their own financeiro_categorias"
ON financeiro_categorias FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Categorias Financeiras - UPDATE
DROP POLICY IF EXISTS "Users can only update their own non-coringa financeiro_categorias" ON financeiro_categorias;
CREATE POLICY "Users can only update their own non-coringa financeiro_categorias"
ON financeiro_categorias FOR UPDATE
USING (
  user_id = (select auth.uid()) 
  AND 
  is_coringa = false
  AND user_has_active_subscription()
)
WITH CHECK (
  user_id = (select auth.uid()) 
  AND 
  is_coringa = false
  AND user_has_active_subscription()
);

-- Categorias Financeiras - DELETE
DROP POLICY IF EXISTS "Users can only delete their own non-coringa financeiro_categorias" ON financeiro_categorias;
CREATE POLICY "Users can only delete their own non-coringa financeiro_categorias"
ON financeiro_categorias FOR DELETE
USING (
  user_id = (select auth.uid()) 
  AND 
  is_coringa = false
  AND user_has_active_subscription()
);

-- Contas Financeiras - SELECT
DROP POLICY IF EXISTS "Users can only view their own contas_financeiras" ON contas_financeiras;
CREATE POLICY "Users can only view their own contas_financeiras"
ON contas_financeiras FOR SELECT
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Contas Financeiras - INSERT
DROP POLICY IF EXISTS "Users can only insert their own contas_financeiras" ON contas_financeiras;
CREATE POLICY "Users can only insert their own contas_financeiras"
ON contas_financeiras FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Contas Financeiras - UPDATE
DROP POLICY IF EXISTS "Users can only update their own contas_financeiras" ON contas_financeiras;
CREATE POLICY "Users can only update their own contas_financeiras"
ON contas_financeiras FOR UPDATE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
)
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Contas Financeiras - DELETE
DROP POLICY IF EXISTS "Users can only delete their own contas_financeiras" ON contas_financeiras;
CREATE POLICY "Users can only delete their own contas_financeiras"
ON contas_financeiras FOR DELETE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Lançamentos Financeiros - SELECT
DROP POLICY IF EXISTS "Users can only view their own financeiro_lancamentos" ON financeiro_lancamentos;
CREATE POLICY "Users can only view their own financeiro_lancamentos"
ON financeiro_lancamentos FOR SELECT
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Lançamentos Financeiros - INSERT
DROP POLICY IF EXISTS "Users can only insert their own financeiro_lancamentos" ON financeiro_lancamentos;
CREATE POLICY "Users can only insert their own financeiro_lancamentos"
ON financeiro_lancamentos FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Lançamentos Financeiros - UPDATE
DROP POLICY IF EXISTS "Users can only update their own financeiro_lancamentos" ON financeiro_lancamentos;
CREATE POLICY "Users can only update their own financeiro_lancamentos"
ON financeiro_lancamentos FOR UPDATE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
)
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Lançamentos Financeiros - DELETE
DROP POLICY IF EXISTS "Users can only delete their own financeiro_lancamentos" ON financeiro_lancamentos;
CREATE POLICY "Users can only delete their own financeiro_lancamentos"
ON financeiro_lancamentos FOR DELETE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Transferências Bancárias - SELECT
DROP POLICY IF EXISTS "Users can only view their own transferencias_bancarias" ON transferencias_bancarias;
CREATE POLICY "Users can only view their own transferencias_bancarias"
ON transferencias_bancarias FOR SELECT
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Transferências Bancárias - INSERT
DROP POLICY IF EXISTS "Users can only insert their own transferencias_bancarias" ON transferencias_bancarias;
CREATE POLICY "Users can only insert their own transferencias_bancarias"
ON transferencias_bancarias FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Transferências Bancárias - UPDATE
DROP POLICY IF EXISTS "Users can only update their own transferencias_bancarias" ON transferencias_bancarias;
CREATE POLICY "Users can only update their own transferencias_bancarias"
ON transferencias_bancarias FOR UPDATE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
)
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Transferências Bancárias - DELETE
DROP POLICY IF EXISTS "Users can only delete their own transferencias_bancarias" ON transferencias_bancarias;
CREATE POLICY "Users can only delete their own transferencias_bancarias"
ON transferencias_bancarias FOR DELETE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Notificações Log - SELECT
DROP POLICY IF EXISTS "Users can only view their own notificacoes_log" ON notificacoes_log;
CREATE POLICY "Users can only view their own notificacoes_log"
ON notificacoes_log FOR SELECT
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Notificações Log - INSERT
DROP POLICY IF EXISTS "Users can only insert their own notificacoes_log" ON notificacoes_log;
CREATE POLICY "Users can only insert their own notificacoes_log"
ON notificacoes_log FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Notificações Log - UPDATE
DROP POLICY IF EXISTS "Users can only update their own notificacoes_log" ON notificacoes_log;
CREATE POLICY "Users can only update their own notificacoes_log"
ON notificacoes_log FOR UPDATE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
)
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Notificações Log - DELETE
DROP POLICY IF EXISTS "Users can only delete their own notificacoes_log" ON notificacoes_log;
CREATE POLICY "Users can only delete their own notificacoes_log"
ON notificacoes_log FOR DELETE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Tarefas - SELECT
DROP POLICY IF EXISTS "Users can only view their own tarefas" ON tarefas;
CREATE POLICY "Users can only view their own tarefas"
ON tarefas FOR SELECT
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Tarefas - INSERT
DROP POLICY IF EXISTS "Users can only insert their own tarefas" ON tarefas;
CREATE POLICY "Users can only insert their own tarefas"
ON tarefas FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Tarefas - UPDATE
DROP POLICY IF EXISTS "Users can only update their own tarefas" ON tarefas;
CREATE POLICY "Users can only update their own tarefas"
ON tarefas FOR UPDATE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
)
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Tarefas - DELETE
DROP POLICY IF EXISTS "Users can only delete their own tarefas" ON tarefas;
CREATE POLICY "Users can only delete their own tarefas"
ON tarefas FOR DELETE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Tarefas Atividades - SELECT
DROP POLICY IF EXISTS "Users can only view their own tarefas_atividades" ON tarefas_atividades;
CREATE POLICY "Users can only view their own tarefas_atividades"
ON tarefas_atividades FOR SELECT
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Tarefas Atividades - INSERT
DROP POLICY IF EXISTS "Users can only insert their own tarefas_atividades" ON tarefas_atividades;
CREATE POLICY "Users can only insert their own tarefas_atividades"
ON tarefas_atividades FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Tarefas Atividades - UPDATE
DROP POLICY IF EXISTS "Users can only update their own tarefas_atividades" ON tarefas_atividades;
CREATE POLICY "Users can only update their own tarefas_atividades"
ON tarefas_atividades FOR UPDATE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
)
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Tarefas Atividades - DELETE
DROP POLICY IF EXISTS "Users can only delete their own tarefas_atividades" ON tarefas_atividades;
CREATE POLICY "Users can only delete their own tarefas_atividades"
ON tarefas_atividades FOR DELETE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Tarefas Comentários - SELECT
DROP POLICY IF EXISTS "Users can only view their own tarefas_comentarios" ON tarefas_comentarios;
CREATE POLICY "Users can only view their own tarefas_comentarios"
ON tarefas_comentarios FOR SELECT
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Tarefas Comentários - INSERT
DROP POLICY IF EXISTS "Users can only insert their own tarefas_comentarios" ON tarefas_comentarios;
CREATE POLICY "Users can only insert their own tarefas_comentarios"
ON tarefas_comentarios FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Tarefas Comentários - UPDATE
DROP POLICY IF EXISTS "Users can only update their own tarefas_comentarios" ON tarefas_comentarios;
CREATE POLICY "Users can only update their own tarefas_comentarios"
ON tarefas_comentarios FOR UPDATE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
)
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Tarefas Comentários - DELETE
DROP POLICY IF EXISTS "Users can only delete their own tarefas_comentarios" ON tarefas_comentarios;
CREATE POLICY "Users can only delete their own tarefas_comentarios"
ON tarefas_comentarios FOR DELETE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Tarefas Kanban Colunas - SELECT
DROP POLICY IF EXISTS "Users can only view their own tarefas_kanban_colunas" ON tarefas_kanban_colunas;
CREATE POLICY "Users can only view their own tarefas_kanban_colunas"
ON tarefas_kanban_colunas FOR SELECT
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Tarefas Kanban Colunas - INSERT
DROP POLICY IF EXISTS "Users can only insert their own tarefas_kanban_colunas" ON tarefas_kanban_colunas;
CREATE POLICY "Users can only insert their own tarefas_kanban_colunas"
ON tarefas_kanban_colunas FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Tarefas Kanban Colunas - UPDATE
DROP POLICY IF EXISTS "Users can only update their own tarefas_kanban_colunas" ON tarefas_kanban_colunas;
CREATE POLICY "Users can only update their own tarefas_kanban_colunas"
ON tarefas_kanban_colunas FOR UPDATE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
)
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Tarefas Kanban Colunas - DELETE
DROP POLICY IF EXISTS "Users can only delete their own tarefas_kanban_colunas" ON tarefas_kanban_colunas;
CREATE POLICY "Users can only delete their own tarefas_kanban_colunas"
ON tarefas_kanban_colunas FOR DELETE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Kanban Colunas - SELECT
DROP POLICY IF EXISTS "Users can only view their own kanban_colunas" ON kanban_colunas;
CREATE POLICY "Users can only view their own kanban_colunas"
ON kanban_colunas FOR SELECT
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Kanban Colunas - INSERT
DROP POLICY IF EXISTS "Users can only insert their own kanban_colunas" ON kanban_colunas;
CREATE POLICY "Users can only insert their own kanban_colunas"
ON kanban_colunas FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Kanban Colunas - UPDATE
DROP POLICY IF EXISTS "Users can only update their own kanban_colunas" ON kanban_colunas;
CREATE POLICY "Users can only update their own kanban_colunas"
ON kanban_colunas FOR UPDATE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
)
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Kanban Colunas - DELETE
DROP POLICY IF EXISTS "Users can only delete their own kanban_colunas" ON kanban_colunas;
CREATE POLICY "Users can only delete their own kanban_colunas"
ON kanban_colunas FOR DELETE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Fluxos Automação - SELECT
DROP POLICY IF EXISTS "Users can only view their own fluxos_automacao" ON fluxos_automacao;
CREATE POLICY "Users can only view their own fluxos_automacao"
ON fluxos_automacao FOR SELECT
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Fluxos Automação - INSERT
DROP POLICY IF EXISTS "Users can only insert their own fluxos_automacao" ON fluxos_automacao;
CREATE POLICY "Users can only insert their own fluxos_automacao"
ON fluxos_automacao FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Fluxos Automação - UPDATE
DROP POLICY IF EXISTS "Users can only update their own fluxos_automacao" ON fluxos_automacao;
CREATE POLICY "Users can only update their own fluxos_automacao"
ON fluxos_automacao FOR UPDATE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
)
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Fluxos Automação - DELETE
DROP POLICY IF EXISTS "Users can only delete their own fluxos_automacao" ON fluxos_automacao;
CREATE POLICY "Users can only delete their own fluxos_automacao"
ON fluxos_automacao FOR DELETE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Workflow Executions - SELECT
DROP POLICY IF EXISTS "Users can only view their own workflow_executions" ON workflow_executions;
CREATE POLICY "Users can only view their own workflow_executions"
ON workflow_executions FOR SELECT
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Workflow Executions - INSERT
DROP POLICY IF EXISTS "Users can only insert their own workflow_executions" ON workflow_executions;
CREATE POLICY "Users can only insert their own workflow_executions"
ON workflow_executions FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Workflow Executions - UPDATE
DROP POLICY IF EXISTS "Users can only update their own workflow_executions" ON workflow_executions;
CREATE POLICY "Users can only update their own workflow_executions"
ON workflow_executions FOR UPDATE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
)
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Workflow Executions - DELETE
DROP POLICY IF EXISTS "Users can only delete their own workflow_executions" ON workflow_executions;
CREATE POLICY "Users can only delete their own workflow_executions"
ON workflow_executions FOR DELETE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Configurações Sistema - SELECT
DROP POLICY IF EXISTS "Users can only view their own configuracoes_sistema" ON configuracoes_sistema;
CREATE POLICY "Users can only view their own configuracoes_sistema"
ON configuracoes_sistema FOR SELECT
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Configurações Sistema - INSERT
DROP POLICY IF EXISTS "Users can only insert their own configuracoes_sistema" ON configuracoes_sistema;
CREATE POLICY "Users can only insert their own configuracoes_sistema"
ON configuracoes_sistema FOR INSERT
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Configurações Sistema - UPDATE
DROP POLICY IF EXISTS "Users can only update their own configuracoes_sistema" ON configuracoes_sistema;
CREATE POLICY "Users can only update their own configuracoes_sistema"
ON configuracoes_sistema FOR UPDATE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
)
WITH CHECK (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- Configurações Sistema - DELETE
DROP POLICY IF EXISTS "Users can only delete their own configuracoes_sistema" ON configuracoes_sistema;
CREATE POLICY "Users can only delete their own configuracoes_sistema"
ON configuracoes_sistema FOR DELETE
USING (
  (select auth.uid()) = user_id 
  AND user_has_active_subscription()
);

-- ============================================================================
-- NOTA IMPORTANTE:
-- ============================================================================
-- Esta migration adiciona verificação de assinatura ativa ou em teste em todas as políticas RLS.
-- Agora, usuários sem assinatura ativa ou em teste não podem acessar nenhum dado do sistema,
-- mesmo que estejam autenticados.
--
-- A função user_has_active_subscription() verifica:
-- 1. Se o usuário está autenticado
-- 2. Se existe uma assinatura com status = 'ativo' OU status = 'teste'
-- 3. Se a data_vencimento é NULL ou >= hoje
--
-- O middleware já redireciona usuários sem assinatura para /planos, mas esta
-- camada adicional garante que mesmo tentativas diretas de acesso ao banco
-- sejam bloqueadas.
-- ============================================================================

