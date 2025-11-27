-- Migration: Criar tabela de Fluxos de Automação
-- Execute este script no Supabase SQL Editor

-- Tabela: Fluxos de Automação
CREATE TABLE IF NOT EXISTS fluxos_automacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo_automacao VARCHAR(50) NOT NULL CHECK (tipo_automacao IN (
    'notificacao',
    'cobranca',
    'relatorio',
    'integracao',
    'backup',
    'limpeza',
    'sincronizacao',
    'outro'
  )),
  status VARCHAR(20) NOT NULL DEFAULT 'rascunho' CHECK (status IN ('ativo', 'inativo', 'rascunho')),
  configuracao JSONB DEFAULT '{}'::jsonb,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_fluxos_automacao_tipo ON fluxos_automacao(tipo_automacao);
CREATE INDEX IF NOT EXISTS idx_fluxos_automacao_status ON fluxos_automacao(status);
CREATE INDEX IF NOT EXISTS idx_fluxos_automacao_ativo ON fluxos_automacao(ativo);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_fluxos_automacao_updated_at BEFORE UPDATE ON fluxos_automacao
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();








