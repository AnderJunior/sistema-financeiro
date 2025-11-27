-- Migration: Criar tabela de colunas do kanban de tarefas e permitir colunas dinâmicas

CREATE TABLE IF NOT EXISTS tarefas_kanban_colunas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  cor VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(nome)
);

CREATE INDEX IF NOT EXISTS idx_tarefas_kanban_colunas_ordem ON tarefas_kanban_colunas(ordem);
CREATE INDEX IF NOT EXISTS idx_tarefas_kanban_colunas_ativo ON tarefas_kanban_colunas(ativo);

INSERT INTO tarefas_kanban_colunas (nome, cor, ordem, ativo) VALUES
  ('Pendente', '#FBBF24', 0, true),
  ('Em andamento', '#2563EB', 1, true),
  ('Concluídas', '#16A34A', 2, true),
  ('Canceladas', '#DC2626', 3, true)
ON CONFLICT (nome) DO NOTHING;

-- Atualizar os status existentes das tarefas para os IDs das colunas
UPDATE tarefas
SET status = col.id::text
FROM tarefas_kanban_colunas col
WHERE tarefas.status = 'pendente' AND col.nome = 'Pendente';

UPDATE tarefas
SET status = col.id::text
FROM tarefas_kanban_colunas col
WHERE tarefas.status = 'em_andamento' AND col.nome = 'Em andamento';

UPDATE tarefas
SET status = col.id::text
FROM tarefas_kanban_colunas col
WHERE tarefas.status = 'concluida' AND col.nome = 'Concluídas';

UPDATE tarefas
SET status = col.id::text
FROM tarefas_kanban_colunas col
WHERE tarefas.status = 'cancelada' AND col.nome = 'Canceladas';

-- Remover a restrição de status fixa para dar liberdade para novas colunas
DO $$
DECLARE constraint_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
    AND tc.constraint_schema = ccu.constraint_schema
  WHERE tc.table_name = 'tarefas'
    AND tc.constraint_type = 'CHECK'
    AND ccu.column_name = 'status'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE tarefas DROP CONSTRAINT %I', constraint_name);
  END IF;
END$$;

ALTER TABLE tarefas
  ALTER COLUMN status TYPE VARCHAR(255);

DO $$
DECLARE default_coluna_id TEXT;
BEGIN
  SELECT id::text INTO default_coluna_id
  FROM tarefas_kanban_colunas
  WHERE nome = 'Pendente'
  LIMIT 1;

  IF default_coluna_id IS NOT NULL THEN
    EXECUTE format('ALTER TABLE tarefas ALTER COLUMN status SET DEFAULT %L', default_coluna_id);
  END IF;
END$$;




