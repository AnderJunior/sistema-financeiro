-- Migration: Criar tabela de assinantes para sistema de licenciamento
-- Esta tabela armazena informações de clientes que pagaram a assinatura
-- Data: 2024

CREATE TABLE IF NOT EXISTS assinantes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  dominio VARCHAR(255) NOT NULL UNIQUE,
  api_key VARCHAR(255) UNIQUE, -- Hash criptografado para autenticação
  status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'suspenso', 'cancelado', 'pendente_ativacao')),
  
  -- Integração com Asaas
  asaas_customer_id VARCHAR(255),
  asaas_subscription_id VARCHAR(255),
  
  -- Datas importantes
  data_ativacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_vencimento TIMESTAMP WITH TIME ZONE,
  ultima_verificacao TIMESTAMP WITH TIME ZONE,
  proxima_verificacao TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 day'),
  
  -- Metadados
  versao_sistema VARCHAR(50), -- Versão do sistema instalada
  ip_ultimo_acesso INET,
  user_agent_ultimo_acesso TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_assinantes_email ON assinantes(email);
CREATE INDEX IF NOT EXISTS idx_assinantes_dominio ON assinantes(dominio);
CREATE INDEX IF NOT EXISTS idx_assinantes_status ON assinantes(status);
CREATE INDEX IF NOT EXISTS idx_assinantes_api_key ON assinantes(api_key);
CREATE INDEX IF NOT EXISTS idx_assinantes_proxima_verificacao ON assinantes(proxima_verificacao);
CREATE INDEX IF NOT EXISTS idx_assinantes_asaas_subscription_id ON assinantes(asaas_subscription_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_assinantes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_assinantes_updated_at ON assinantes;
CREATE TRIGGER trigger_update_assinantes_updated_at
  BEFORE UPDATE ON assinantes
  FOR EACH ROW
  EXECUTE FUNCTION update_assinantes_updated_at();

-- Função para gerar API Key única
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS $$
DECLARE
  api_key TEXT;
BEGIN
  -- Gerar hash único usando UUID + timestamp
  api_key := encode(gen_random_bytes(32), 'base64');
  -- Remover caracteres especiais e limitar tamanho
  api_key := regexp_replace(api_key, '[^a-zA-Z0-9]', '', 'g');
  api_key := substring(api_key FROM 1 FOR 64);
  RETURN api_key;
END;
$$ LANGUAGE plpgsql;

-- Habilitar RLS na tabela
ALTER TABLE assinantes ENABLE ROW LEVEL SECURITY;

-- Política: Permitir leitura apenas via Service Role (usado na API de verificação)
-- Usuários normais não podem acessar esta tabela diretamente
CREATE POLICY "Service Role pode ler assinantes"
ON assinantes FOR SELECT
USING (auth.role() = 'service_role');

-- Política: Permitir inserção/atualização apenas via Service Role
-- Isso permite que n8n ou outras integrações atualizem via Service Role Key
CREATE POLICY "Service Role pode inserir assinantes"
ON assinantes FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service Role pode atualizar assinantes"
ON assinantes FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Comentários para documentação
COMMENT ON TABLE assinantes IS 'Tabela de assinantes do sistema - controle de licenciamento';
COMMENT ON COLUMN assinantes.email IS 'Email do assinante (único)';
COMMENT ON COLUMN assinantes.dominio IS 'Domínio onde o sistema está instalado (único)';
COMMENT ON COLUMN assinantes.api_key IS 'Chave API única para autenticação (hash criptografado)';
COMMENT ON COLUMN assinantes.status IS 'Status da assinatura: ativo, suspenso, cancelado, pendente_ativacao';
COMMENT ON COLUMN assinantes.proxima_verificacao IS 'Data da próxima verificação automática de status';

