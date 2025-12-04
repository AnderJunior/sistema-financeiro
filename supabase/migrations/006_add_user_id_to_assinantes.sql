-- Migration: Adicionar user_id e campos de plano na tabela assinantes
-- Permite relacionar assinaturas com usuários autenticados do Supabase
-- Data: 2024

-- Adicionar relação com usuários do Supabase
ALTER TABLE assinantes 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Adicionar campos de plano
ALTER TABLE assinantes 
ADD COLUMN IF NOT EXISTS plano_nome VARCHAR(100),
ADD COLUMN IF NOT EXISTS valor DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS periodo VARCHAR(20);

-- Adicionar constraint CHECK para periodo (se a coluna foi criada)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'assinantes_periodo_check'
  ) THEN
    ALTER TABLE assinantes 
    ADD CONSTRAINT assinantes_periodo_check 
    CHECK (periodo IS NULL OR periodo IN ('mensal', 'trimestral', 'semestral', 'anual'));
  END IF;
END $$;

-- Tornar dominio opcional (pode ser NULL)
-- Verificar se a coluna tem NOT NULL antes de remover
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assinantes' 
    AND column_name = 'dominio' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE assinantes ALTER COLUMN dominio DROP NOT NULL;
  END IF;
END $$;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_assinantes_user_id ON assinantes(user_id);

-- Atualizar políticas RLS para permitir que usuários leiam sua própria assinatura
DROP POLICY IF EXISTS "Usuários podem ler própria assinatura" ON assinantes;
CREATE POLICY "Usuários podem ler própria assinatura"
ON assinantes FOR SELECT
USING (
  auth.role() = 'service_role' OR 
  (auth.uid() = user_id AND auth.uid() IS NOT NULL)
);

-- Permitir que usuários atualizem sua própria assinatura (útil para webhooks)
DROP POLICY IF EXISTS "Usuários podem atualizar própria assinatura" ON assinantes;
CREATE POLICY "Usuários podem atualizar própria assinatura"
ON assinantes FOR UPDATE
USING (
  auth.role() = 'service_role' OR 
  (auth.uid() = user_id AND auth.uid() IS NOT NULL)
)
WITH CHECK (
  auth.role() = 'service_role' OR 
  (auth.uid() = user_id AND auth.uid() IS NOT NULL)
);

-- Comentários
COMMENT ON COLUMN assinantes.user_id IS 'ID do usuário autenticado no Supabase';
COMMENT ON COLUMN assinantes.plano_nome IS 'Nome do plano contratado (Básico, Pro, Premium)';
COMMENT ON COLUMN assinantes.valor IS 'Valor mensal da assinatura';
COMMENT ON COLUMN assinantes.periodo IS 'Periodicidade da assinatura';

