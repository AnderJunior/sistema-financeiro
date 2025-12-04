-- Migration: Otimizar políticas RLS para melhor performance
-- Substitui auth.uid() por (select auth.uid()) para evitar reavaliação em cada linha
-- Data: 2024

-- ============================================================================
-- PARTE 1: Remover e recriar todas as políticas RLS com otimização
-- ============================================================================

-- Clientes - SELECT
DROP POLICY IF EXISTS "Users can only view their own clientes" ON clientes;
CREATE POLICY "Users can only view their own clientes"
ON clientes FOR SELECT
USING ((select auth.uid()) = user_id);

-- Clientes - INSERT
DROP POLICY IF EXISTS "Users can only insert their own clientes" ON clientes;
CREATE POLICY "Users can only insert their own clientes"
ON clientes FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Clientes - UPDATE
DROP POLICY IF EXISTS "Users can only update their own clientes" ON clientes;
CREATE POLICY "Users can only update their own clientes"
ON clientes FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Clientes - DELETE
DROP POLICY IF EXISTS "Users can only delete their own clientes" ON clientes;
CREATE POLICY "Users can only delete their own clientes"
ON clientes FOR DELETE
USING ((select auth.uid()) = user_id);

-- Serviços - SELECT
DROP POLICY IF EXISTS "Users can only view their own servicos" ON servicos;
CREATE POLICY "Users can only view their own servicos"
ON servicos FOR SELECT
USING ((select auth.uid()) = user_id);

-- Serviços - INSERT
DROP POLICY IF EXISTS "Users can only insert their own servicos" ON servicos;
CREATE POLICY "Users can only insert their own servicos"
ON servicos FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Serviços - UPDATE
DROP POLICY IF EXISTS "Users can only update their own servicos" ON servicos;
CREATE POLICY "Users can only update their own servicos"
ON servicos FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Serviços - DELETE
DROP POLICY IF EXISTS "Users can only delete their own servicos" ON servicos;
CREATE POLICY "Users can only delete their own servicos"
ON servicos FOR DELETE
USING ((select auth.uid()) = user_id);

-- Grupos - SELECT
DROP POLICY IF EXISTS "Users can only view their own grupos" ON grupos;
CREATE POLICY "Users can only view their own grupos"
ON grupos FOR SELECT
USING ((select auth.uid()) = user_id);

-- Grupos - INSERT
DROP POLICY IF EXISTS "Users can only insert their own grupos" ON grupos;
CREATE POLICY "Users can only insert their own grupos"
ON grupos FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Grupos - UPDATE
DROP POLICY IF EXISTS "Users can only update their own grupos" ON grupos;
CREATE POLICY "Users can only update their own grupos"
ON grupos FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Grupos - DELETE
DROP POLICY IF EXISTS "Users can only delete their own grupos" ON grupos;
CREATE POLICY "Users can only delete their own grupos"
ON grupos FOR DELETE
USING ((select auth.uid()) = user_id);

-- Clientes Grupos - SELECT
DROP POLICY IF EXISTS "Users can only view their own clientes_grupos" ON clientes_grupos;
CREATE POLICY "Users can only view their own clientes_grupos"
ON clientes_grupos FOR SELECT
USING ((select auth.uid()) = user_id);

-- Clientes Grupos - INSERT
DROP POLICY IF EXISTS "Users can only insert their own clientes_grupos" ON clientes_grupos;
CREATE POLICY "Users can only insert their own clientes_grupos"
ON clientes_grupos FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Clientes Grupos - UPDATE
DROP POLICY IF EXISTS "Users can only update their own clientes_grupos" ON clientes_grupos;
CREATE POLICY "Users can only update their own clientes_grupos"
ON clientes_grupos FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Clientes Grupos - DELETE
DROP POLICY IF EXISTS "Users can only delete their own clientes_grupos" ON clientes_grupos;
CREATE POLICY "Users can only delete their own clientes_grupos"
ON clientes_grupos FOR DELETE
USING ((select auth.uid()) = user_id);

-- Projetos - SELECT
DROP POLICY IF EXISTS "Users can only view their own projetos" ON projetos;
CREATE POLICY "Users can only view their own projetos"
ON projetos FOR SELECT
USING ((select auth.uid()) = user_id);

-- Projetos - INSERT
DROP POLICY IF EXISTS "Users can only insert their own projetos" ON projetos;
CREATE POLICY "Users can only insert their own projetos"
ON projetos FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Projetos - UPDATE
DROP POLICY IF EXISTS "Users can only update their own projetos" ON projetos;
CREATE POLICY "Users can only update their own projetos"
ON projetos FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Projetos - DELETE
DROP POLICY IF EXISTS "Users can only delete their own projetos" ON projetos;
CREATE POLICY "Users can only delete their own projetos"
ON projetos FOR DELETE
USING ((select auth.uid()) = user_id);

-- Categorias Financeiras - SELECT (já tem política especial para coringas)
DROP POLICY IF EXISTS "Users can view coringas and their own financeiro_categorias" ON financeiro_categorias;
CREATE POLICY "Users can view coringas and their own financeiro_categorias"
ON financeiro_categorias FOR SELECT
USING (
  is_coringa = true 
  OR 
  (user_id = (select auth.uid()))
);

-- Categorias Financeiras - INSERT
DROP POLICY IF EXISTS "Users can only insert their own financeiro_categorias" ON financeiro_categorias;
CREATE POLICY "Users can only insert their own financeiro_categorias"
ON financeiro_categorias FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Categorias Financeiras - UPDATE
DROP POLICY IF EXISTS "Users can only update their own non-coringa financeiro_categorias" ON financeiro_categorias;
CREATE POLICY "Users can only update their own non-coringa financeiro_categorias"
ON financeiro_categorias FOR UPDATE
USING (
  user_id = (select auth.uid()) 
  AND 
  is_coringa = false
)
WITH CHECK (
  user_id = (select auth.uid()) 
  AND 
  is_coringa = false
);

-- Categorias Financeiras - DELETE
DROP POLICY IF EXISTS "Users can only delete their own non-coringa financeiro_categorias" ON financeiro_categorias;
CREATE POLICY "Users can only delete their own non-coringa financeiro_categorias"
ON financeiro_categorias FOR DELETE
USING (
  user_id = (select auth.uid()) 
  AND 
  is_coringa = false
);

-- Contas Financeiras - SELECT
DROP POLICY IF EXISTS "Users can only view their own contas_financeiras" ON contas_financeiras;
CREATE POLICY "Users can only view their own contas_financeiras"
ON contas_financeiras FOR SELECT
USING ((select auth.uid()) = user_id);

-- Contas Financeiras - INSERT
DROP POLICY IF EXISTS "Users can only insert their own contas_financeiras" ON contas_financeiras;
CREATE POLICY "Users can only insert their own contas_financeiras"
ON contas_financeiras FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Contas Financeiras - UPDATE
DROP POLICY IF EXISTS "Users can only update their own contas_financeiras" ON contas_financeiras;
CREATE POLICY "Users can only update their own contas_financeiras"
ON contas_financeiras FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Contas Financeiras - DELETE
DROP POLICY IF EXISTS "Users can only delete their own contas_financeiras" ON contas_financeiras;
CREATE POLICY "Users can only delete their own contas_financeiras"
ON contas_financeiras FOR DELETE
USING ((select auth.uid()) = user_id);

-- Lançamentos Financeiros - SELECT
DROP POLICY IF EXISTS "Users can only view their own financeiro_lancamentos" ON financeiro_lancamentos;
CREATE POLICY "Users can only view their own financeiro_lancamentos"
ON financeiro_lancamentos FOR SELECT
USING ((select auth.uid()) = user_id);

-- Lançamentos Financeiros - INSERT
DROP POLICY IF EXISTS "Users can only insert their own financeiro_lancamentos" ON financeiro_lancamentos;
CREATE POLICY "Users can only insert their own financeiro_lancamentos"
ON financeiro_lancamentos FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Lançamentos Financeiros - UPDATE
DROP POLICY IF EXISTS "Users can only update their own financeiro_lancamentos" ON financeiro_lancamentos;
CREATE POLICY "Users can only update their own financeiro_lancamentos"
ON financeiro_lancamentos FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Lançamentos Financeiros - DELETE
DROP POLICY IF EXISTS "Users can only delete their own financeiro_lancamentos" ON financeiro_lancamentos;
CREATE POLICY "Users can only delete their own financeiro_lancamentos"
ON financeiro_lancamentos FOR DELETE
USING ((select auth.uid()) = user_id);

-- Transferências Bancárias - SELECT
DROP POLICY IF EXISTS "Users can only view their own transferencias_bancarias" ON transferencias_bancarias;
CREATE POLICY "Users can only view their own transferencias_bancarias"
ON transferencias_bancarias FOR SELECT
USING ((select auth.uid()) = user_id);

-- Transferências Bancárias - INSERT
DROP POLICY IF EXISTS "Users can only insert their own transferencias_bancarias" ON transferencias_bancarias;
CREATE POLICY "Users can only insert their own transferencias_bancarias"
ON transferencias_bancarias FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Transferências Bancárias - UPDATE
DROP POLICY IF EXISTS "Users can only update their own transferencias_bancarias" ON transferencias_bancarias;
CREATE POLICY "Users can only update their own transferencias_bancarias"
ON transferencias_bancarias FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Transferências Bancárias - DELETE
DROP POLICY IF EXISTS "Users can only delete their own transferencias_bancarias" ON transferencias_bancarias;
CREATE POLICY "Users can only delete their own transferencias_bancarias"
ON transferencias_bancarias FOR DELETE
USING ((select auth.uid()) = user_id);

-- Notificações Log - SELECT
DROP POLICY IF EXISTS "Users can only view their own notificacoes_log" ON notificacoes_log;
CREATE POLICY "Users can only view their own notificacoes_log"
ON notificacoes_log FOR SELECT
USING ((select auth.uid()) = user_id);

-- Notificações Log - INSERT
DROP POLICY IF EXISTS "Users can only insert their own notificacoes_log" ON notificacoes_log;
CREATE POLICY "Users can only insert their own notificacoes_log"
ON notificacoes_log FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Notificações Log - UPDATE
DROP POLICY IF EXISTS "Users can only update their own notificacoes_log" ON notificacoes_log;
CREATE POLICY "Users can only update their own notificacoes_log"
ON notificacoes_log FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Notificações Log - DELETE
DROP POLICY IF EXISTS "Users can only delete their own notificacoes_log" ON notificacoes_log;
CREATE POLICY "Users can only delete their own notificacoes_log"
ON notificacoes_log FOR DELETE
USING ((select auth.uid()) = user_id);

-- Tarefas - SELECT
DROP POLICY IF EXISTS "Users can only view their own tarefas" ON tarefas;
CREATE POLICY "Users can only view their own tarefas"
ON tarefas FOR SELECT
USING ((select auth.uid()) = user_id);

-- Tarefas - INSERT
DROP POLICY IF EXISTS "Users can only insert their own tarefas" ON tarefas;
CREATE POLICY "Users can only insert their own tarefas"
ON tarefas FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Tarefas - UPDATE
DROP POLICY IF EXISTS "Users can only update their own tarefas" ON tarefas;
CREATE POLICY "Users can only update their own tarefas"
ON tarefas FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Tarefas - DELETE
DROP POLICY IF EXISTS "Users can only delete their own tarefas" ON tarefas;
CREATE POLICY "Users can only delete their own tarefas"
ON tarefas FOR DELETE
USING ((select auth.uid()) = user_id);

-- Tarefas Atividades - SELECT
DROP POLICY IF EXISTS "Users can only view their own tarefas_atividades" ON tarefas_atividades;
CREATE POLICY "Users can only view their own tarefas_atividades"
ON tarefas_atividades FOR SELECT
USING ((select auth.uid()) = user_id);

-- Tarefas Atividades - INSERT
DROP POLICY IF EXISTS "Users can only insert their own tarefas_atividades" ON tarefas_atividades;
CREATE POLICY "Users can only insert their own tarefas_atividades"
ON tarefas_atividades FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Tarefas Atividades - UPDATE
DROP POLICY IF EXISTS "Users can only update their own tarefas_atividades" ON tarefas_atividades;
CREATE POLICY "Users can only update their own tarefas_atividades"
ON tarefas_atividades FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Tarefas Atividades - DELETE
DROP POLICY IF EXISTS "Users can only delete their own tarefas_atividades" ON tarefas_atividades;
CREATE POLICY "Users can only delete their own tarefas_atividades"
ON tarefas_atividades FOR DELETE
USING ((select auth.uid()) = user_id);

-- Tarefas Comentários - SELECT
DROP POLICY IF EXISTS "Users can only view their own tarefas_comentarios" ON tarefas_comentarios;
CREATE POLICY "Users can only view their own tarefas_comentarios"
ON tarefas_comentarios FOR SELECT
USING ((select auth.uid()) = user_id);

-- Tarefas Comentários - INSERT
DROP POLICY IF EXISTS "Users can only insert their own tarefas_comentarios" ON tarefas_comentarios;
CREATE POLICY "Users can only insert their own tarefas_comentarios"
ON tarefas_comentarios FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Tarefas Comentários - UPDATE
DROP POLICY IF EXISTS "Users can only update their own tarefas_comentarios" ON tarefas_comentarios;
CREATE POLICY "Users can only update their own tarefas_comentarios"
ON tarefas_comentarios FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Tarefas Comentários - DELETE
DROP POLICY IF EXISTS "Users can only delete their own tarefas_comentarios" ON tarefas_comentarios;
CREATE POLICY "Users can only delete their own tarefas_comentarios"
ON tarefas_comentarios FOR DELETE
USING ((select auth.uid()) = user_id);

-- Tarefas Kanban Colunas - SELECT
DROP POLICY IF EXISTS "Users can only view their own tarefas_kanban_colunas" ON tarefas_kanban_colunas;
CREATE POLICY "Users can only view their own tarefas_kanban_colunas"
ON tarefas_kanban_colunas FOR SELECT
USING ((select auth.uid()) = user_id);

-- Tarefas Kanban Colunas - INSERT
DROP POLICY IF EXISTS "Users can only insert their own tarefas_kanban_colunas" ON tarefas_kanban_colunas;
CREATE POLICY "Users can only insert their own tarefas_kanban_colunas"
ON tarefas_kanban_colunas FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Tarefas Kanban Colunas - UPDATE
DROP POLICY IF EXISTS "Users can only update their own tarefas_kanban_colunas" ON tarefas_kanban_colunas;
CREATE POLICY "Users can only update their own tarefas_kanban_colunas"
ON tarefas_kanban_colunas FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Tarefas Kanban Colunas - DELETE
DROP POLICY IF EXISTS "Users can only delete their own tarefas_kanban_colunas" ON tarefas_kanban_colunas;
CREATE POLICY "Users can only delete their own tarefas_kanban_colunas"
ON tarefas_kanban_colunas FOR DELETE
USING ((select auth.uid()) = user_id);

-- Kanban Colunas - SELECT
DROP POLICY IF EXISTS "Users can only view their own kanban_colunas" ON kanban_colunas;
CREATE POLICY "Users can only view their own kanban_colunas"
ON kanban_colunas FOR SELECT
USING ((select auth.uid()) = user_id);

-- Kanban Colunas - INSERT
DROP POLICY IF EXISTS "Users can only insert their own kanban_colunas" ON kanban_colunas;
CREATE POLICY "Users can only insert their own kanban_colunas"
ON kanban_colunas FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Kanban Colunas - UPDATE
DROP POLICY IF EXISTS "Users can only update their own kanban_colunas" ON kanban_colunas;
CREATE POLICY "Users can only update their own kanban_colunas"
ON kanban_colunas FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Kanban Colunas - DELETE
DROP POLICY IF EXISTS "Users can only delete their own kanban_colunas" ON kanban_colunas;
CREATE POLICY "Users can only delete their own kanban_colunas"
ON kanban_colunas FOR DELETE
USING ((select auth.uid()) = user_id);

-- Fluxos Automação - SELECT
DROP POLICY IF EXISTS "Users can only view their own fluxos_automacao" ON fluxos_automacao;
CREATE POLICY "Users can only view their own fluxos_automacao"
ON fluxos_automacao FOR SELECT
USING ((select auth.uid()) = user_id);

-- Fluxos Automação - INSERT
DROP POLICY IF EXISTS "Users can only insert their own fluxos_automacao" ON fluxos_automacao;
CREATE POLICY "Users can only insert their own fluxos_automacao"
ON fluxos_automacao FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Fluxos Automação - UPDATE
DROP POLICY IF EXISTS "Users can only update their own fluxos_automacao" ON fluxos_automacao;
CREATE POLICY "Users can only update their own fluxos_automacao"
ON fluxos_automacao FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Fluxos Automação - DELETE
DROP POLICY IF EXISTS "Users can only delete their own fluxos_automacao" ON fluxos_automacao;
CREATE POLICY "Users can only delete their own fluxos_automacao"
ON fluxos_automacao FOR DELETE
USING ((select auth.uid()) = user_id);

-- Workflow Executions - SELECT
DROP POLICY IF EXISTS "Users can only view their own workflow_executions" ON workflow_executions;
CREATE POLICY "Users can only view their own workflow_executions"
ON workflow_executions FOR SELECT
USING ((select auth.uid()) = user_id);

-- Workflow Executions - INSERT
DROP POLICY IF EXISTS "Users can only insert their own workflow_executions" ON workflow_executions;
CREATE POLICY "Users can only insert their own workflow_executions"
ON workflow_executions FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Workflow Executions - UPDATE
DROP POLICY IF EXISTS "Users can only update their own workflow_executions" ON workflow_executions;
CREATE POLICY "Users can only update their own workflow_executions"
ON workflow_executions FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Workflow Executions - DELETE
DROP POLICY IF EXISTS "Users can only delete their own workflow_executions" ON workflow_executions;
CREATE POLICY "Users can only delete their own workflow_executions"
ON workflow_executions FOR DELETE
USING ((select auth.uid()) = user_id);

-- Configurações Sistema - SELECT
DROP POLICY IF EXISTS "Users can only view their own configuracoes_sistema" ON configuracoes_sistema;
CREATE POLICY "Users can only view their own configuracoes_sistema"
ON configuracoes_sistema FOR SELECT
USING ((select auth.uid()) = user_id);

-- Configurações Sistema - INSERT
DROP POLICY IF EXISTS "Users can only insert their own configuracoes_sistema" ON configuracoes_sistema;
CREATE POLICY "Users can only insert their own configuracoes_sistema"
ON configuracoes_sistema FOR INSERT
WITH CHECK ((select auth.uid()) = user_id);

-- Configurações Sistema - UPDATE
DROP POLICY IF EXISTS "Users can only update their own configuracoes_sistema" ON configuracoes_sistema;
CREATE POLICY "Users can only update their own configuracoes_sistema"
ON configuracoes_sistema FOR UPDATE
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Configurações Sistema - DELETE
DROP POLICY IF EXISTS "Users can only delete their own configuracoes_sistema" ON configuracoes_sistema;
CREATE POLICY "Users can only delete their own configuracoes_sistema"
ON configuracoes_sistema FOR DELETE
USING ((select auth.uid()) = user_id);

-- ============================================================================
-- PARTE 2: Remover índice duplicado na tabela configuracoes_sistema
-- ============================================================================

-- Verificar qual índice manter (vamos manter idx_configuracoes_sistema_chave)
-- e remover idx_configuracoes_chave se existir
DROP INDEX IF EXISTS idx_configuracoes_chave;

-- ============================================================================
-- NOTA IMPORTANTE:
-- ============================================================================
-- Esta migration otimiza todas as políticas RLS substituindo auth.uid() por
-- (select auth.uid()). Isso evita que a função seja reavaliada para cada linha,
-- melhorando significativamente a performance das queries em escala.
--
-- A mudança é transparente para a aplicação - o comportamento de segurança
-- permanece exatamente o mesmo, apenas a performance é melhorada.
-- ============================================================================

