-- Script SQL para limpar metadados corrompidos de um usuário
-- Execute este script no Supabase Dashboard > SQL Editor
-- Substitua 'SEU_EMAIL_AQUI' pelo email da conta que precisa ser limpa

DO $$
DECLARE
    user_id uuid;
    current_metadata jsonb;
    cleaned_metadata jsonb;
    nome_completo text;
BEGIN
    -- Buscar o user_id pelo email
    SELECT id INTO user_id
    FROM auth.users
    WHERE email = 'SEU_EMAIL_AQUI';
    
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não encontrado com este email. Verifique se o email está correto.';
    END IF;
    
    RAISE NOTICE 'Usuário encontrado: %', user_id;
    
    -- Obter metadados atuais
    SELECT raw_user_meta_data INTO current_metadata
    FROM auth.users
    WHERE id = user_id;
    
    RAISE NOTICE 'Metadados atuais: %', current_metadata;
    
    -- Criar metadados limpos (apenas nome_completo se existir)
    cleaned_metadata := '{}'::jsonb;
    
    -- Tentar manter nome_completo
    IF current_metadata ? 'nome_completo' THEN
        nome_completo := current_metadata->>'nome_completo';
        cleaned_metadata := cleaned_metadata || jsonb_build_object('nome_completo', nome_completo);
        RAISE NOTICE 'Mantendo nome_completo: %', nome_completo;
    ELSIF current_metadata ? 'full_name' THEN
        nome_completo := current_metadata->>'full_name';
        cleaned_metadata := cleaned_metadata || jsonb_build_object('nome_completo', nome_completo);
        RAISE NOTICE 'Convertendo full_name para nome_completo: %', nome_completo;
    ELSE
        RAISE NOTICE 'Nenhum nome encontrado nos metadados';
    END IF;
    
    -- Remover foto_url e outros campos problemáticos
    -- (já não estão em cleaned_metadata, então serão removidos)
    
    -- Atualizar metadados
    UPDATE auth.users
    SET raw_user_meta_data = cleaned_metadata,
        updated_at = now()
    WHERE id = user_id;
    
    RAISE NOTICE '✅ Metadados limpos com sucesso!';
    RAISE NOTICE 'Metadados após limpeza: %', cleaned_metadata;
    RAISE NOTICE '';
    RAISE NOTICE 'Próximos passos:';
    RAISE NOTICE '1. Faça logout no sistema';
    RAISE NOTICE '2. Limpe os cookies do navegador';
    RAISE NOTICE '3. Faça login novamente';
END $$;

-- ============================================
-- VERSÃO SIMPLES: Remove TODOS os metadados
-- Use esta versão se quiser limpar completamente:
-- ============================================
/*
UPDATE auth.users
SET raw_user_meta_data = '{}'::jsonb,
    updated_at = now()
WHERE email = 'SEU_EMAIL_AQUI';
*/

