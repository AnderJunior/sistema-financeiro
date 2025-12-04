-- Script para verificar se a migration 006 foi executada corretamente
-- Execute este script no SQL Editor do Supabase para verificar

-- Verificar se a coluna user_id existe
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'assinantes'
AND column_name = 'user_id';

-- Verificar se as outras colunas foram adicionadas
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'assinantes'
AND column_name IN ('plano_nome', 'valor', 'periodo')
ORDER BY column_name;

-- Verificar se o índice foi criado
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'assinantes'
AND indexname = 'idx_assinantes_user_id';

-- Verificar políticas RLS
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'assinantes'
AND policyname LIKE '%Usuários%';

-- Se alguma dessas queries não retornar resultados, a migration não foi executada completamente


