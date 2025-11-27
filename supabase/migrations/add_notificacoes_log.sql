-- Tabela: Log de Notidficações
CREATE TABLE IF NOT EXISTS notificacoes_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('pagamento', 'projeto', 'cobranca')),
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT NOT NULL,
  data_referencia TIMESTAMP WITH TIME ZONE NOT NULL,
  link VARCHAR(500),
  relacionado_id UUID,
  relacionado_tipo VARCHAR(20) CHECK (relacionado_tipo IN ('cliente', 'projeto', 'lancamento')),
  lida BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_notificacoes_tipo ON notificacoes_log(tipo);
CREATE INDEX IF NOT EXISTS idx_notificacoes_data_referencia ON notificacoes_log(data_referencia);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes_log(lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_relacionado ON notificacoes_log(relacionado_tipo, relacionado_id);

-- Trigger para updated_at
CREATE TRIGGER update_notificacoes_log_updated_at BEFORE UPDATE ON notificacoes_log
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE notificacoes_log IS 'Log de notificações do sistema - atualizado via n8n';
COMMENT ON COLUMN notificacoes_log.tipo IS 'Tipo da notificação: pagamento, projeto ou cobranca';
COMMENT ON COLUMN notificacoes_log.data_referencia IS 'Data do evento que gerou a notificação (data do pagamento, vencimento, etc)';
COMMENT ON COLUMN notificacoes_log.relacionado_id IS 'ID do registro relacionado (cliente_id, projeto_id, lancamento_id)';
COMMENT ON COLUMN notificacoes_log.relacionado_tipo IS 'Tipo do registro relacionado';
COMMENT ON COLUMN notificacoes_log.lida IS 'Indica se a notificação foi lida pelo usuário';












