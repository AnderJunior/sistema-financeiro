-- Script de Debug: Verificar por que o usuário não consegue ver seus dados
-- Execute este script no SQL Editor do Supabase enquanto estiver logado
-- Data: 2024

-- ============================================================================
-- PASSO 1: Verificar seu user_id atual
-- ============================================================================
SELECT 
    id as user_id,
    email as user_email,
    created_at as user_created_at
FROM auth.users
WHERE id = auth.uid();

-- ============================================================================
-- PASSO 2: Verificar se existe registro na tabela assinantes com seu user_id
-- ============================================================================
SELECT 
    id,
    email,
    nome_usuario,
    user_id,
    status,
    CASE 
        WHEN user_id = auth.uid() THEN '✅ MATCH - user_id corresponde'
        WHEN user_id IS NULL THEN '⚠️ user_id está NULL'
        ELSE '❌ NO MATCH - user_id diferente'
    END as user_id_status,
    CASE 
        WHEN email = (SELECT email FROM auth.users WHERE id = auth.uid()) THEN '✅ MATCH - email corresponde'
        ELSE '❌ NO MATCH - email diferente'
    END as email_status
FROM assinantes
WHERE user_id = auth.uid()
   OR email = (SELECT email FROM auth.users WHERE id = auth.uid());

-- ============================================================================
-- PASSO 3: Testar se consegue ler os dados (simular a query da aplicação)
-- ============================================================================
SELECT 
    id,
    nome_usuario,
    email,
    user_id
FROM assinantes
WHERE user_id = auth.uid()
LIMIT 1;

-- ============================================================================
-- PASSO 4: Verificar políticas RLS que permitem SELECT
-- ============================================================================
SELECT 
    policyname,
    cmd,
    permissive,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'assinantes'
AND cmd = 'SELECT'
ORDER BY policyname;

-- ============================================================================
-- PASSO 5: Verificar se RLS está habilitado
-- ============================================================================
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'assinantes';

-- ============================================================================
-- PASSO 6: Se o user_id não corresponder, atualizar manualmente
-- Substitua 'SEU_USER_ID_AQUI' pelo resultado do PASSO 1
-- ============================================================================
/*
UPDATE assinantes
SET user_id = auth.uid()
WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
AND (user_id IS NULL OR user_id != auth.uid());
*/

-- ============================================================================
-- PASSO 7: Se nome_usuario estiver NULL, atualizar com um valor padrão
-- ============================================================================
/*
UPDATE assinantes
SET nome_usuario = COALESCE(
    nome_usuario,
    (SELECT COALESCE(
        raw_user_meta_data->>'nome_completo',
        raw_user_meta_data->>'full_name',
        split_part(email, '@', 1)
    ) FROM auth.users WHERE id = auth.uid())
)
WHERE user_id = auth.uid();
*/

