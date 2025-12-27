-- Script de verificação: Verificar se usuários podem acessar seus próprios dados
-- Execute este script no SQL Editor do Supabase para diagnosticar problemas
-- Data: 2024

-- ============================================================================
-- VERIFICAÇÕES
-- ============================================================================

-- 1. Verificar se a coluna nome_usuario existe
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'assinantes'
AND column_name = 'nome_usuario';

-- 2. Verificar registros na tabela assinantes com user_id preenchido
SELECT 
    id,
    email,
    nome_usuario,
    user_id,
    status,
    created_at
FROM assinantes
WHERE user_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verificar políticas RLS ativas na tabela assinantes
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
WHERE tablename = 'assinantes'
ORDER BY policyname, cmd;

-- 4. Verificar se RLS está habilitado
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'assinantes';

-- 5. Testar política de leitura (substitua 'SEU_USER_ID_AQUI' pelo ID real do usuário)
-- Descomente e execute com um user_id real para testar:
/*
SELECT 
    id,
    email,
    nome_usuario,
    user_id
FROM assinantes
WHERE user_id = 'SEU_USER_ID_AQUI'::uuid;
*/

-- 6. Verificar se há registros sem user_id que precisam ser atualizados
SELECT 
    id,
    email,
    nome_usuario,
    user_id,
    status
FROM assinantes
WHERE user_id IS NULL
ORDER BY created_at DESC;

