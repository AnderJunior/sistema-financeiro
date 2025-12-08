-- Migration: Corrigir search_path em todas as funções para prevenir vulnerabilidades
-- Adiciona SET search_path para prevenir ataques de injeção de schema
-- Data: 2024

-- ============================================================================
-- 1. set_user_id() - Função genérica para definir user_id
-- ============================================================================
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
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
$$;

-- ============================================================================
-- 2. prevent_user_id_change() - Prevenir alteração de user_id
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_user_id_change()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
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
$$;

-- ============================================================================
-- 3. update_assinantes_updated_at() - Atualizar updated_at na tabela assinantes
-- ============================================================================
CREATE OR REPLACE FUNCTION update_assinantes_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 4. generate_api_key() - Gerar API Key única
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  api_key TEXT;
BEGIN
  -- Gerar hash único usando UUID + timestamp
  api_key := pg_catalog.encode(pg_catalog.gen_random_bytes(32), 'base64');
  -- Remover caracteres especiais e limitar tamanho
  api_key := pg_catalog.regexp_replace(api_key, '[^a-zA-Z0-9]', '', 'g');
  api_key := pg_catalog.left(api_key, 64);
  RETURN api_key;
END;
$$;

-- ============================================================================
-- 5. user_has_active_subscription() - Verificar se usuário tem assinatura ativa
-- ============================================================================
CREATE OR REPLACE FUNCTION user_has_active_subscription()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  current_user_id UUID;
  has_active BOOLEAN;
BEGIN
  -- Obter o ID do usuário autenticado
  current_user_id := auth.uid();
  
  -- Se não há usuário autenticado, retornar false
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar se existe assinatura ativa ou em teste
  -- Assinatura válida = (status = 'ativo' OU status = 'teste') E (data_vencimento IS NULL OU data_vencimento >= hoje)
  SELECT EXISTS(
    SELECT 1 
    FROM public.assinantes 
    WHERE user_id = current_user_id
      AND status IN ('ativo', 'teste')
      AND (data_vencimento IS NULL OR data_vencimento >= CURRENT_DATE)
  ) INTO has_active;
  
  RETURN COALESCE(has_active, false);
END;
$$;

-- ============================================================================
-- 6. set_user_id_financeiro_categorias() - Função específica para categorias
-- ============================================================================
CREATE OR REPLACE FUNCTION set_user_id_financeiro_categorias()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  -- Se for categoria coringa, garantir que user_id seja NULL
  IF NEW.is_coringa = true THEN
    NEW.user_id = NULL;
    RETURN NEW;
  END IF;
  
  -- Se não for coringa e user_id não foi fornecido, usar o usuário autenticado
  IF NEW.user_id IS NULL THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'user_id is required and no authenticated user found';
    END IF;
    NEW.user_id = auth.uid();
  END IF;
  
  -- Garantir que o user_id sempre corresponde ao usuário autenticado (exceto coringas)
  IF auth.uid() IS NOT NULL AND NEW.user_id != auth.uid() AND NEW.is_coringa = false THEN
    RAISE EXCEPTION 'user_id must match authenticated user. Expected: %, Got: %', auth.uid(), NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 7. prevent_coringa_change() - Prevenir alteração de categoria coringa
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_coringa_change()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Não permitir mudar is_coringa de true para false ou vice-versa
  IF OLD.is_coringa != NEW.is_coringa THEN
    RAISE EXCEPTION 'Não é permitido alterar o status de categoria coringa';
  END IF;
  
  -- Não permitir mudar user_id de NULL para não-NULL em categorias coringas
  IF OLD.is_coringa = true AND OLD.user_id IS NULL AND NEW.user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Não é permitido atribuir user_id a categorias coringas';
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 8. update_updated_at_column() - Função genérica para atualizar updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 9. update_projeto_status_on_progress() - Atualizar status do projeto
-- ============================================================================
CREATE OR REPLACE FUNCTION update_projeto_status_on_progress()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.progresso >= 100 AND NEW.status = 'em_andamento' THEN
    NEW.status = 'concluido';
    NEW.data_fim_real = pg_catalog.coalesce(NEW.data_fim_real, pg_catalog.current_date);
  END IF;
  RETURN NEW;
END;
$$;

-- Comentários explicativos
COMMENT ON FUNCTION set_user_id() IS 
'Função de trigger para definir user_id automaticamente em INSERTs. search_path fixado para segurança.';

COMMENT ON FUNCTION prevent_user_id_change() IS 
'Função de trigger para prevenir alteração de user_id em UPDATEs. search_path fixado para segurança.';

COMMENT ON FUNCTION update_assinantes_updated_at() IS 
'Função de trigger para atualizar updated_at na tabela assinantes. search_path fixado para segurança.';

COMMENT ON FUNCTION generate_api_key() IS 
'Função para gerar API Key única. search_path fixado para segurança.';

COMMENT ON FUNCTION user_has_active_subscription() IS 
'Verifica se o usuário autenticado possui uma assinatura ativa ou em teste e não vencida. search_path fixado para segurança.';

COMMENT ON FUNCTION set_user_id_financeiro_categorias() IS 
'Função específica para definir user_id em categorias financeiras (lida com coringas). search_path fixado para segurança.';

COMMENT ON FUNCTION prevent_coringa_change() IS 
'Função para prevenir alteração de status de categoria coringa. search_path fixado para segurança.';

COMMENT ON FUNCTION update_updated_at_column() IS 
'Função genérica de trigger para atualizar updated_at. search_path fixado para segurança.';

COMMENT ON FUNCTION update_projeto_status_on_progress() IS 
'Função de trigger para atualizar status do projeto quando progresso = 100. search_path fixado para segurança.';

