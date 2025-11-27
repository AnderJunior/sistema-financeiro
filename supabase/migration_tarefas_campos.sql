-- Migration: Adicionar campos data_inicio e prioridade à tabela tarefas
-- Execute este script se você já tem a tabela tarefas criada

-- Adicionar campo data_inicio se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tarefas' AND column_name = 'data_inicio'
    ) THEN
        ALTER TABLE tarefas ADD COLUMN data_inicio DATE;
    END IF;
END $$;

-- Adicionar campo prioridade se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tarefas' AND column_name = 'prioridade'
    ) THEN
        ALTER TABLE tarefas ADD COLUMN prioridade VARCHAR(20) CHECK (prioridade IN ('urgente', 'alta', 'normal', 'baixa'));
    END IF;
END $$;

