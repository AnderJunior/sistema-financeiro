-- Migration: Permitir que o usuário autenticado leia seu registro em assinantes também por email
-- Motivo: em alguns cenários o registro do assinante ainda não tem user_id preenchido; mesmo assim
-- o usuário deve conseguir ver Nome/E-mail no menu do TopBar.
-- Data: 2025

BEGIN;

-- Garantir que RLS está habilitado
ALTER TABLE assinantes ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas/alternativas que possam existir para SELECT
DROP POLICY IF EXISTS "Política consolidada de leitura assinantes" ON assinantes;
DROP POLICY IF EXISTS "Usuários podem ler própria assinatura" ON assinantes;

-- Recriar política de SELECT permitindo:
-- - Service Role lê tudo
-- - Usuário autenticado lê seu registro por user_id
-- - Usuário autenticado lê seu registro por email (claim do JWT)
CREATE POLICY "Usuários podem ler assinatura (user_id ou email)"
ON assinantes FOR SELECT
USING (
  (select auth.role()) = 'service_role'
  OR (
    (select auth.uid()) IS NOT NULL
    AND (
      ((select auth.uid()) = user_id AND user_id IS NOT NULL)
      OR (
        email IS NOT NULL
        AND lower(email) = lower((auth.jwt() ->> 'email'))
      )
    )
  )
);

COMMIT;


