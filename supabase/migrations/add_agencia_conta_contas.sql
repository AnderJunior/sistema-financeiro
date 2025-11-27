-- Migração: Adicionar campos agencia e conta na tabela contas_financeiras
-- Execute este script no Supabase SQL Editor

ALTER TABLE contas_financeiras
ADD COLUMN IF NOT EXISTS agencia VARCHAR(10),
ADD COLUMN IF NOT EXISTS conta VARCHAR(20);


