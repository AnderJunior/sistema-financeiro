-- Migration: Criar tabela para colunas personalizadas do kanban de projetos
-- Esta tabela permite criar colunas customizadas com cores para o kanban de projetos

CREATE TABLE IF NOT EXISTS kanban_colunas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  cor VARCHAR(7) NOT NULL DEFAULT '#3B82F6', -- Cor em formato hexadecimal
  ordem INTEGER NOT NULL DEFAULT 0, -- Ordem de exibição das colunas
  status_servico VARCHAR(255), -- ID da própria coluna (UUID como string) - cada coluna tem seu próprio status único
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(nome)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_kanban_colunas_ordem ON kanban_colunas(ordem);
CREATE INDEX IF NOT EXISTS idx_kanban_colunas_ativo ON kanban_colunas(ativo);

-- Inserir colunas padrão (pendente, em_andamento, finalizado)
-- O status_servico será atualizado para o ID da coluna após a inserção
INSERT INTO kanban_colunas (nome, cor, ordem, status_servico, ativo) VALUES
  ('Pendente', '#FCD34D', 0, NULL, true),
  ('Em Andamento', '#3B82F6', 1, NULL, true),
  ('Finalizado', '#10B981', 2, NULL, true)
ON CONFLICT (nome) DO NOTHING;

-- Atualizar status_servico para o ID da coluna para todas as colunas padrão
UPDATE kanban_colunas
SET status_servico = id::text
WHERE nome IN ('Pendente', 'Em Andamento', 'Finalizado') AND (status_servico IS NULL OR status_servico != id::text);

