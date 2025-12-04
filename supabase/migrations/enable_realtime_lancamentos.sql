-- Habilitar Realtime na tabela financeiro_lancamentos
-- Isso permite que as subscriptions funcionem corretamente

-- Habilitar replicação para a tabela
ALTER TABLE financeiro_lancamentos REPLICA IDENTITY FULL;

-- Habilitar publicação para realtime (Supabase publica automaticamente todas as tabelas, mas garantindo)
-- Nota: No Supabase, você também precisa habilitar Realtime no painel web
-- Vá em Database > Replication e marque a tabela financeiro_lancamentos

-- Criar índice para melhorar performance das subscriptions
CREATE INDEX IF NOT EXISTS idx_lancamentos_servico_cliente 
ON financeiro_lancamentos(servico_id, cliente_id) 
WHERE servico_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lancamentos_status_servico 
ON financeiro_lancamentos(status_servico) 
WHERE servico_id IS NOT NULL;





















