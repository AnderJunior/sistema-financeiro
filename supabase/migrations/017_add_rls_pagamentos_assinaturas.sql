-- Migration: Adicionar políticas RLS para tabela pagamentos_assinaturas
-- Permite que admins vejam/editem/excluam tudo e usuários vejam apenas seus próprios pagamentos
-- Data: 2024

-- ============================================================================
-- HABILITAR RLS NA TABELA
-- ============================================================================
ALTER TABLE pagamentos_assinaturas ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLÍTICAS PARA SELECT (LEITURA)
-- ============================================================================

-- Política: Admins podem ver todos os pagamentos
DROP POLICY IF EXISTS "Admins podem ver todos os pagamentos" ON pagamentos_assinaturas;
CREATE POLICY "Admins podem ver todos os pagamentos"
ON pagamentos_assinaturas FOR SELECT
USING (
  auth.role() = 'service_role' OR 
  is_user_admin(auth.uid())
);

-- Política: Usuários podem ver apenas seus próprios pagamentos
DROP POLICY IF EXISTS "Usuários podem ver próprios pagamentos" ON pagamentos_assinaturas;
CREATE POLICY "Usuários podem ver próprios pagamentos"
ON pagamentos_assinaturas FOR SELECT
USING (
  auth.uid() IS NOT NULL AND 
  user_id = auth.uid()
);

-- ============================================================================
-- POLÍTICAS PARA INSERT (INSERÇÃO)
-- ============================================================================

-- Política: Admins podem inserir qualquer pagamento
DROP POLICY IF EXISTS "Admins podem inserir pagamentos" ON pagamentos_assinaturas;
CREATE POLICY "Admins podem inserir pagamentos"
ON pagamentos_assinaturas FOR INSERT
WITH CHECK (
  auth.role() = 'service_role' OR 
  is_user_admin(auth.uid())
);

-- Política: Usuários podem inserir apenas seus próprios pagamentos
DROP POLICY IF EXISTS "Usuários podem inserir próprios pagamentos" ON pagamentos_assinaturas;
CREATE POLICY "Usuários podem inserir próprios pagamentos"
ON pagamentos_assinaturas FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  user_id = auth.uid()
);

-- ============================================================================
-- POLÍTICAS PARA UPDATE (ATUALIZAÇÃO)
-- ============================================================================

-- Política: Admins podem atualizar qualquer pagamento
DROP POLICY IF EXISTS "Admins podem atualizar pagamentos" ON pagamentos_assinaturas;
CREATE POLICY "Admins podem atualizar pagamentos"
ON pagamentos_assinaturas FOR UPDATE
USING (
  auth.role() = 'service_role' OR 
  is_user_admin(auth.uid())
)
WITH CHECK (
  auth.role() = 'service_role' OR 
  is_user_admin(auth.uid())
);

-- Política: Usuários podem atualizar apenas seus próprios pagamentos
DROP POLICY IF EXISTS "Usuários podem atualizar próprios pagamentos" ON pagamentos_assinaturas;
CREATE POLICY "Usuários podem atualizar próprios pagamentos"
ON pagamentos_assinaturas FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND 
  user_id = auth.uid()
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  user_id = auth.uid()
);

-- ============================================================================
-- POLÍTICAS PARA DELETE (EXCLUSÃO)
-- ============================================================================

-- Política: Admins podem excluir qualquer pagamento
DROP POLICY IF EXISTS "Admins podem excluir pagamentos" ON pagamentos_assinaturas;
CREATE POLICY "Admins podem excluir pagamentos"
ON pagamentos_assinaturas FOR DELETE
USING (
  auth.role() = 'service_role' OR 
  is_user_admin(auth.uid())
);

-- Política: Usuários podem excluir apenas seus próprios pagamentos
DROP POLICY IF EXISTS "Usuários podem excluir próprios pagamentos" ON pagamentos_assinaturas;
CREATE POLICY "Usuários podem excluir próprios pagamentos"
ON pagamentos_assinaturas FOR DELETE
USING (
  auth.uid() IS NOT NULL AND 
  user_id = auth.uid()
);

-- ============================================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================================================
COMMENT ON POLICY "Admins podem ver todos os pagamentos" ON pagamentos_assinaturas IS 
'Permite que administradores vejam todos os registros de pagamentos de assinaturas';

COMMENT ON POLICY "Usuários podem ver próprios pagamentos" ON pagamentos_assinaturas IS 
'Permite que usuários vejam apenas seus próprios pagamentos baseado em user_id';

COMMENT ON POLICY "Admins podem inserir pagamentos" ON pagamentos_assinaturas IS 
'Permite que administradores insiram pagamentos para qualquer usuário';

COMMENT ON POLICY "Usuários podem inserir próprios pagamentos" ON pagamentos_assinaturas IS 
'Permite que usuários insiram pagamentos apenas para si mesmos';

COMMENT ON POLICY "Admins podem atualizar pagamentos" ON pagamentos_assinaturas IS 
'Permite que administradores atualizem qualquer pagamento';

COMMENT ON POLICY "Usuários podem atualizar próprios pagamentos" ON pagamentos_assinaturas IS 
'Permite que usuários atualizem apenas seus próprios pagamentos';

COMMENT ON POLICY "Admins podem excluir pagamentos" ON pagamentos_assinaturas IS 
'Permite que administradores excluam qualquer pagamento';

COMMENT ON POLICY "Usuários podem excluir próprios pagamentos" ON pagamentos_assinaturas IS 
'Permite que usuários excluam apenas seus próprios pagamentos';

