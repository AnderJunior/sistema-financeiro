-- Migration: Otimizar políticas RLS da tabela assinantes
-- Corrige problemas de performance identificados pelo Supabase Linter:
-- 1. auth_rls_initplan: Usa (select auth.<function>()) para evitar reavaliação por linha
-- 2. multiple_permissive_policies: Consolida múltiplas políticas em uma única por ação
-- Data: 2024

-- ============================================================================
-- REMOVER POLÍTICAS ANTIGAS
-- ============================================================================
DROP POLICY IF EXISTS "Service Role pode ler assinantes" ON assinantes;
DROP POLICY IF EXISTS "Service Role pode inserir assinantes" ON assinantes;
DROP POLICY IF EXISTS "Service Role pode atualizar assinantes" ON assinantes;
DROP POLICY IF EXISTS "Usuários podem ler própria assinatura" ON assinantes;
DROP POLICY IF EXISTS "Usuários podem atualizar própria assinatura" ON assinantes;

-- ============================================================================
-- CRIAR POLÍTICAS OTIMIZADAS
-- ============================================================================

-- Política consolidada para SELECT
-- Permite: Service Role OU usuário autenticado lendo sua própria assinatura
CREATE POLICY "Política consolidada de leitura assinantes"
ON assinantes FOR SELECT
USING (
  (select auth.role()) = 'service_role' OR 
  ((select auth.uid()) = user_id AND (select auth.uid()) IS NOT NULL)
);

-- Política consolidada para INSERT
-- Permite: Apenas Service Role (para integrações e webhooks)
CREATE POLICY "Política consolidada de inserção assinantes"
ON assinantes FOR INSERT
WITH CHECK ((select auth.role()) = 'service_role');

-- Política consolidada para UPDATE
-- Permite: Service Role OU usuário autenticado atualizando sua própria assinatura
CREATE POLICY "Política consolidada de atualização assinantes"
ON assinantes FOR UPDATE
USING (
  (select auth.role()) = 'service_role' OR 
  ((select auth.uid()) = user_id AND (select auth.uid()) IS NOT NULL)
)
WITH CHECK (
  (select auth.role()) = 'service_role' OR 
  ((select auth.uid()) = user_id AND (select auth.uid()) IS NOT NULL)
);

-- Comentário explicativo
COMMENT ON POLICY "Política consolidada de leitura assinantes" ON assinantes IS 
'Política otimizada de leitura: Service Role pode ler tudo, usuários podem ler apenas sua própria assinatura. Usa (select auth.*()) para melhor performance.';

COMMENT ON POLICY "Política consolidada de inserção assinantes" ON assinantes IS 
'Política otimizada de inserção: Apenas Service Role pode inserir. Usa (select auth.role()) para melhor performance.';

COMMENT ON POLICY "Política consolidada de atualização assinantes" ON assinantes IS 
'Política otimizada de atualização: Service Role pode atualizar tudo, usuários podem atualizar apenas sua própria assinatura. Usa (select auth.*()) para melhor performance.';

