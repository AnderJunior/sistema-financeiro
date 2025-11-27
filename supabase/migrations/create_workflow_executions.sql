-- Migration: Criar tabela de Execuções de Workflows
-- Execute este script no Supabase SQL Editor

-- Tabela: Execuções de Workflows
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID NOT NULL,
  execution_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'paused')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  node_states JSONB DEFAULT '{}'::jsonb,
  edge_states JSONB DEFAULT '{}'::jsonb,
  logs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: Estados de Nós por Execução (para facilitar queries)
CREATE TABLE IF NOT EXISTS workflow_execution_node_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  node_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('idle', 'running', 'success', 'error', 'waiting')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  output JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at ON workflow_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_node_states_execution_id ON workflow_execution_node_states(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_node_states_node_id ON workflow_execution_node_states(node_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workflow_executions_updated_at BEFORE UPDATE ON workflow_executions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();








