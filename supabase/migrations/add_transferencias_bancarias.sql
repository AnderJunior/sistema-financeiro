-- Migração: Adicionar tabela de Transferências Bancárias
-- Execute este script no Supabase SQL Editor se a tabela ainda não existir

-- Tabela: Transferências Bancárias
CREATE TABLE IF NOT EXISTS transferencias_bancarias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  banco_origem_id UUID NOT NULL REFERENCES contas_financeiras(id) ON DELETE RESTRICT,
  banco_recebedor_id UUID NOT NULL REFERENCES contas_financeiras(id) ON DELETE RESTRICT,
  valor_enviado DECIMAL(10, 2) NOT NULL CHECK (valor_enviado > 0),
  data_transferencia DATE NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (banco_origem_id != banco_recebedor_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_transferencias_origem ON transferencias_bancarias(banco_origem_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_recebedor ON transferencias_bancarias(banco_recebedor_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_data ON transferencias_bancarias(data_transferencia);

-- Trigger para updated_at
CREATE TRIGGER update_transferencias_bancarias_updated_at BEFORE UPDATE ON transferencias_bancarias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


