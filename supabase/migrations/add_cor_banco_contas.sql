-- Migração: Adicionar campos cor e banco_id na tabela contas_financeiras
-- Execute este script no Supabase SQL Editor

ALTER TABLE contas_financeiras
ADD COLUMN IF NOT EXISTS cor VARCHAR(7),
ADD COLUMN IF NOT EXISTS banco_id VARCHAR(10);


