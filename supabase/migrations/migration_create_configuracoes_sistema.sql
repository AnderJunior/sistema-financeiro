-- Migration: Criar tabela de configurações do sistema
-- Esta tabela armazena configurações gerais do sistema

CREATE TABLE IF NOT EXISTS configuracoes_sistema (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chave VARCHAR(255) NOT NULL UNIQUE,
  valor TEXT,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_configuracoes_sistema_chave ON configuracoes_sistema(chave);

