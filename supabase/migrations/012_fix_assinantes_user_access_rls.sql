-- Migration: Corrigir políticas RLS para permitir que usuários leiam e atualizem seus próprios dados
-- Garante que usuários possam acessar nome_usuario e email da tabela assinantes
-- Mantém as políticas de Admins intactas
-- Data: 2024

-- ============================================================================
-- GARANTIR QUE POLÍTICAS CONSOLIDADAS ESTEJAM CORRETAS
-- ============================================================================

-- Remover apenas as políticas consolidadas antigas para recriar
-- Mantém as políticas de Admins intactas
DROP POLICY IF EXISTS "Política consolidada de leitura assinantes" ON assinantes;
DROP POLICY IF EXISTS "Política consolidada de inserção assinantes" ON assinantes;
DROP POLICY IF EXISTS "Política consolidada de atualização assinantes" ON assinantes;
DROP POLICY IF EXISTS "Política consolidada de exclusão assinantes" ON assinantes;

-- Política para SELECT - Usuários podem ler seus próprios dados
-- Permite: Service Role OU Admin OU usuário autenticado lendo sua própria assinatura
-- IMPORTANTE: Verifica se auth.uid() = user_id para permitir acesso aos próprios dados
-- Esta política funciona em conjunto com as políticas de Admins (que são permissivas)
CREATE POLICY "Política consolidada de leitura assinantes"
ON assinantes FOR SELECT
USING (
  (select auth.role()) = 'service_role' OR 
  ((select auth.uid()) = user_id AND (select auth.uid()) IS NOT NULL AND user_id IS NOT NULL)
);

-- Política para INSERT - Apenas Service Role pode inserir
CREATE POLICY "Política consolidada de inserção assinantes"
ON assinantes FOR INSERT
WITH CHECK (
  (select auth.role()) = 'service_role'
);

-- Política para UPDATE - Usuários podem atualizar seus próprios dados
-- Permite: Service Role OU Admin OU usuário autenticado atualizando sua própria assinatura
-- IMPORTANTE: Verifica se auth.uid() = user_id para permitir atualização dos próprios dados
-- Esta política funciona em conjunto com as políticas de Admins (que são permissivas)
CREATE POLICY "Política consolidada de atualização assinantes"
ON assinantes FOR UPDATE
USING (
  (select auth.role()) = 'service_role' OR 
  ((select auth.uid()) = user_id AND (select auth.uid()) IS NOT NULL AND user_id IS NOT NULL)
)
WITH CHECK (
  (select auth.role()) = 'service_role' OR 
  ((select auth.uid()) = user_id AND (select auth.uid()) IS NOT NULL AND user_id IS NOT NULL)
);

-- Política para DELETE - Apenas Service Role pode deletar
CREATE POLICY "Política consolidada de exclusão assinantes"
ON assinantes FOR DELETE
USING (
  (select auth.role()) = 'service_role'
);

-- Comentários explicativos
COMMENT ON POLICY "Política consolidada de leitura assinantes" ON assinantes IS 
'Política de leitura: Service Role pode ler tudo, usuários podem ler apenas sua própria assinatura quando auth.uid() = user_id.';

COMMENT ON POLICY "Política consolidada de inserção assinantes" ON assinantes IS 
'Política de inserção: Apenas Service Role pode inserir novos registros.';

COMMENT ON POLICY "Política consolidada de atualização assinantes" ON assinantes IS 
'Política de atualização: Service Role pode atualizar tudo, usuários podem atualizar apenas sua própria assinatura quando auth.uid() = user_id.';

COMMENT ON POLICY "Política consolidada de exclusão assinantes" ON assinantes IS 
'Política de exclusão: Apenas Service Role pode deletar registros.';

