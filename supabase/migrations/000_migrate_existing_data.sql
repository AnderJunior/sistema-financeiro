-- Migration: Migrar dados existentes para ter user_id
-- ⚠️ IMPORTANTE: Execute este script ANTES de executar 001_add_user_isolation_rls.sql
-- se você já possui dados no banco de dados
--
-- INSTRUÇÕES:
-- 1. Substitua 'SEU-USER-ID-AQUI' pelo UUID do usuário que deve possuir os dados existentes
-- 2. Execute este script primeiro
-- 3. Depois execute 001_add_user_isolation_rls.sql
--
-- Para obter o user_id de um usuário:
-- SELECT id FROM auth.users WHERE email = 'email-do-usuario@exemplo.com';

-- ============================================================================
-- ATENÇÃO: Substitua 'SEU-USER-ID-AQUI' pelo UUID real do usuário
-- ============================================================================
DO $$
DECLARE
  default_user_id UUID := 'SEU-USER-ID-AQUI'::UUID; -- ⚠️ SUBSTITUA AQUI
BEGIN
  -- Verificar se o user_id foi substituído
  IF default_user_id = 'SEU-USER-ID-AQUI'::UUID THEN
    RAISE EXCEPTION 'Por favor, substitua SEU-USER-ID-AQUI pelo UUID real do usuário antes de executar este script';
  END IF;

  -- Verificar se o usuário existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = default_user_id) THEN
    RAISE EXCEPTION 'Usuário com ID % não encontrado. Verifique se o UUID está correto.', default_user_id;
  END IF;

  -- Adicionar coluna user_id se ainda não existir
  -- (Esta migration pode ser executada antes de adicionar as colunas)
  
  -- Migrar dados existentes atribuindo user_id
  -- Nota: Estas queries só funcionarão após adicionar as colunas user_id
  -- Se as colunas ainda não existem, execute primeiro a parte 1 de 001_add_user_isolation_rls.sql
  
  UPDATE clientes SET user_id = default_user_id WHERE user_id IS NULL;
  UPDATE servicos SET user_id = default_user_id WHERE user_id IS NULL;
  UPDATE grupos SET user_id = default_user_id WHERE user_id IS NULL;
  UPDATE clientes_grupos SET user_id = default_user_id WHERE user_id IS NULL;
  UPDATE projetos SET user_id = default_user_id WHERE user_id IS NULL;
  UPDATE financeiro_categorias SET user_id = default_user_id WHERE user_id IS NULL;
  UPDATE contas_financeiras SET user_id = default_user_id WHERE user_id IS NULL;
  UPDATE financeiro_lancamentos SET user_id = default_user_id WHERE user_id IS NULL;
  UPDATE transferencias_bancarias SET user_id = default_user_id WHERE user_id IS NULL;
  UPDATE notificacoes_log SET user_id = default_user_id WHERE user_id IS NULL;
  UPDATE tarefas SET user_id = default_user_id WHERE user_id IS NULL;
  UPDATE tarefas_atividades SET user_id = default_user_id WHERE user_id IS NULL;
  UPDATE tarefas_comentarios SET user_id = default_user_id WHERE user_id IS NULL;
  UPDATE tarefas_kanban_colunas SET user_id = default_user_id WHERE user_id IS NULL;
  UPDATE kanban_colunas SET user_id = default_user_id WHERE user_id IS NULL;
  UPDATE fluxos_automacao SET user_id = default_user_id WHERE user_id IS NULL;
  UPDATE workflow_executions SET user_id = default_user_id WHERE user_id IS NULL;
  UPDATE workflow_execution_node_states SET user_id = default_user_id WHERE user_id IS NULL;
  UPDATE configuracoes_sistema SET user_id = default_user_id WHERE user_id IS NULL;

  RAISE NOTICE 'Migração concluída! Todos os dados existentes foram atribuídos ao usuário: %', default_user_id;
END $$;

-- ============================================================================
-- Script alternativo: Migrar dados para múltiplos usuários baseado em critério
-- ============================================================================
-- Se você quiser distribuir dados existentes entre múltiplos usuários,
-- você pode usar este exemplo como base e adaptar conforme necessário:

/*
-- Exemplo: Atribuir clientes para diferentes usuários baseado em algum critério
-- (Este é apenas um exemplo - adapte conforme sua necessidade)

UPDATE clientes 
SET user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'usuario1@exemplo.com'
  LIMIT 1
)
WHERE id IN (
  SELECT id FROM clientes 
  WHERE data_cadastro < '2024-01-01'
  LIMIT 100
);

UPDATE clientes 
SET user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'usuario2@exemplo.com'
  LIMIT 1
)
WHERE id IN (
  SELECT id FROM clientes 
  WHERE data_cadastro >= '2024-01-01'
  LIMIT 100
);
*/











