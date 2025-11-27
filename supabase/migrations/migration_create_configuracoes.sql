-- Migração: Criar tabela de Configurações do Sistema
-- Execute este script no Supabase SQL Editor

-- Tabela: Configurações do Sistema
CREATE TABLE IF NOT EXISTS configuracoes_sistema (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chave VARCHAR(100) UNIQUE NOT NULL,
  valor TEXT,
  tipo VARCHAR(20) NOT NULL DEFAULT 'string' CHECK (tipo IN ('string', 'number', 'boolean', 'json')),
  categoria VARCHAR(50) NOT NULL DEFAULT 'geral' CHECK (categoria IN ('geral', 'notificacoes', 'integracao', 'visualizacao', 'backup')),
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_configuracoes_chave ON configuracoes_sistema(chave);
CREATE INDEX IF NOT EXISTS idx_configuracoes_categoria ON configuracoes_sistema(categoria);

-- Trigger para updated_at
CREATE TRIGGER update_configuracoes_sistema_updated_at BEFORE UPDATE ON configuracoes_sistema
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir configurações padrão
INSERT INTO configuracoes_sistema (chave, valor, tipo, categoria, descricao) VALUES
  ('nome_empresa', '', 'string', 'geral', 'Nome da empresa/organização'),
  ('moeda', 'BRL', 'string', 'geral', 'Moeda padrão do sistema'),
  ('fuso_horario', 'America/Sao_Paulo', 'string', 'geral', 'Fuso horário padrão'),
  ('notificacoes_email_habilitado', 'false', 'boolean', 'notificacoes', 'Habilitar notificações por email'),
  ('notificacoes_email_destinatario', '', 'string', 'notificacoes', 'Email para receber notificações'),
  ('notificacoes_servicos_atrasados', 'true', 'boolean', 'notificacoes', 'Notificar sobre serviços atrasados'),
  ('notificacoes_pagamentos_pendentes', 'true', 'boolean', 'notificacoes', 'Notificar sobre pagamentos pendentes'),
  ('notificacoes_projetos_atrasados', 'true', 'boolean', 'notificacoes', 'Notificar sobre projetos atrasados'),
  ('webhook_url', '', 'string', 'integracao', 'URL do webhook para integrações'),
  ('webhook_habilitado', 'false', 'boolean', 'integracao', 'Habilitar webhooks'),
  ('backup_automatico', 'false', 'boolean', 'backup', 'Habilitar backup automático'),
  ('backup_frequencia', 'diario', 'string', 'backup', 'Frequência do backup automático'),
  ('visualizacao_itens_por_pagina', '10', 'number', 'visualizacao', 'Número de itens por página nas listagens'),
  ('visualizacao_tema', 'claro', 'string', 'visualizacao', 'Tema da interface')
ON CONFLICT (chave) DO NOTHING;

