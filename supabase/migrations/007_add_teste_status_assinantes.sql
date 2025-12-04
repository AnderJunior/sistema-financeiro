-- Migration: Adicionar status "teste" à tabela assinantes
-- Permite que assinaturas com status "teste" funcionem igual a "ativo"
-- Data: 2024

-- Remover a constraint antiga
ALTER TABLE assinantes 
DROP CONSTRAINT IF EXISTS assinantes_status_check;

-- Adicionar nova constraint incluindo "teste"
ALTER TABLE assinantes 
ADD CONSTRAINT assinantes_status_check 
CHECK (status IN ('ativo', 'teste', 'suspenso', 'cancelado', 'pendente_ativacao'));

-- Atualizar comentário da coluna
COMMENT ON COLUMN assinantes.status IS 'Status da assinatura: ativo, teste, suspenso, cancelado, pendente_ativacao';

