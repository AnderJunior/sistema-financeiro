-- Script de teste: Verificar acesso do usuário aos seus próprios dados
-- Execute este script no SQL Editor do Supabase para testar
-- Data: 2024

-- ============================================================================
-- TESTE 1: Verificar se a coluna nome_usuario existe
-- ============================================================================
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'assinantes'
AND column_name IN ('nome_usuario', 'user_id', 'email')
ORDER BY column_name;

-- ============================================================================
-- TESTE 2: Verificar registros com user_id
-- ============================================================================
SELECT 
    id,
    email,
    nome_usuario,
    user_id,
    status
FROM assinantes
WHERE user_id IS NOT NULL
ORDER BY created_at DESC;

-- ============================================================================
-- TESTE 3: Testar acesso como usuário autenticado
-- Execute esta query enquanto estiver logado no Supabase
-- Substitua pelo seu user_id se necessário
-- ============================================================================
SELECT 
    id,
    email,
    nome_usuario,
    user_id,
    status,
    auth.uid() as current_user_id,
    CASE 
        WHEN auth.uid() = user_id THEN 'MATCH - Usuário pode acessar'
        ELSE 'NO MATCH - Usuário NÃO pode acessar'
    END as access_status
FROM assinantes
WHERE user_id = auth.uid()
OR email = (SELECT email FROM auth.users WHERE id = auth.uid());

-- ============================================================================
-- TESTE 4: Verificar políticas RLS ativas
-- ============================================================================
SELECT 
    policyname,
    cmd as command,
    permissive,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'assinantes'
AND cmd = 'SELECT'
ORDER BY policyname;

-- ============================================================================
-- TESTE 5: Verificar se RLS está habilitado
-- ============================================================================
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'assinantes';

