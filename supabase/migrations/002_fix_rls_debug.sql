-- Migration: Correção e diagnóstico de problemas com RLS
-- Execute este script se estiver tendo problemas com RLS bloqueando queries

-- ============================================================================
-- DIAGNÓSTICO: Verificar se as políticas RLS estão funcionando
-- ============================================================================

-- Verificar se RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'clientes', 'servicos', 'grupos', 'clientes_grupos', 'projetos',
    'financeiro_categorias', 'contas_financeiras', 'financeiro_lancamentos',
    'transferencias_bancarias', 'notificacoes_log', 'tarefas',
    'tarefas_atividades', 'tarefas_comentarios', 'tarefas_kanban_colunas',
    'kanban_colunas', 'fluxos_automacao', 'workflow_executions',
    'workflow_execution_node_states', 'configuracoes_sistema'
  )
ORDER BY tablename;

-- Verificar políticas RLS existentes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename = 'clientes'
ORDER BY tablename, policyname;

-- ============================================================================
-- CORREÇÃO: Ajustar função set_user_id para ser mais robusta
-- ============================================================================

-- Atualizar função set_user_id para lidar melhor com casos onde auth.uid() pode ser NULL
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Se user_id não foi fornecido, usar o usuário autenticado
  IF NEW.user_id IS NULL THEN
    -- Verificar se há um usuário autenticado
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'user_id is required and no authenticated user found';
    END IF;
    NEW.user_id = auth.uid();
  END IF;
  
  -- Garantir que o user_id sempre corresponde ao usuário autenticado
  -- Isso previne tentativas de inserir dados para outros usuários
  IF auth.uid() IS NOT NULL AND NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'user_id must match authenticated user. Expected: %, Got: %', auth.uid(), NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICAÇÃO: Verificar se há dados sem user_id
-- ============================================================================

-- Verificar clientes sem user_id (isso não deveria acontecer após aplicar RLS)
SELECT COUNT(*) as clientes_sem_user_id FROM clientes WHERE user_id IS NULL;
SELECT COUNT(*) as servicos_sem_user_id FROM servicos WHERE user_id IS NULL;
SELECT COUNT(*) as grupos_sem_user_id FROM grupos WHERE user_id IS NULL;

-- ============================================================================
-- TESTE: Verificar se as políticas estão funcionando corretamente
-- ============================================================================

-- Este teste deve ser executado enquanto você está autenticado
-- Deve retornar apenas os clientes do usuário autenticado
-- SELECT * FROM clientes;

-- ============================================================================
-- NOTA IMPORTANTE:
-- ============================================================================
-- Se você ainda está tendo problemas após executar este script:
--
-- 1. Verifique se você está autenticado quando cria os dados
-- 2. Verifique se a sessão está sendo passada corretamente no servidor
-- 3. Verifique se os cookies estão sendo enviados corretamente
-- 4. Verifique os logs do Supabase para ver erros específicos
--
-- Para testar manualmente:
-- 1. Faça login no sistema
-- 2. Crie um novo cliente
-- 3. Verifique no banco se o cliente tem user_id definido:
--    SELECT id, nome, user_id FROM clientes ORDER BY created_at DESC LIMIT 5;
-- 4. Verifique se o user_id corresponde ao seu usuário:
--    SELECT id, email FROM auth.users WHERE id = (SELECT user_id FROM clientes ORDER BY created_at DESC LIMIT 1);
-- ============================================================================













