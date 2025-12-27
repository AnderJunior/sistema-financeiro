-- Migration: Garantir que a coluna nome_usuario existe na tabela assinantes
-- Se a coluna não existir, será criada
-- Data: 2024

-- Verificar se a coluna nome_usuario existe e criar se não existir
DO $$
BEGIN
  -- Verificar se a coluna existe
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'assinantes' 
    AND column_name = 'nome_usuario'
  ) THEN
    -- Criar a coluna se não existir
    ALTER TABLE assinantes 
    ADD COLUMN nome_usuario VARCHAR(255);
    
    RAISE NOTICE 'Coluna nome_usuario criada com sucesso';
  ELSE
    RAISE NOTICE 'Coluna nome_usuario já existe';
  END IF;
END $$;

-- Verificar estrutura da coluna
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'assinantes'
AND column_name = 'nome_usuario';

