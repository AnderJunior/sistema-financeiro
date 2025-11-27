-- Migration: Garantir que existe coluna "A iniciar" no kanban de projetos
-- Esta coluna será usada como padrão para todos os projetos recém-criados

-- 1. Verificar se já existe uma coluna "A iniciar"
DO $$
DECLARE
  coluna_a_iniciar_id UUID;
  primeira_coluna_ordem INTEGER;
BEGIN
  -- Buscar ID da coluna "A iniciar" se existir
  SELECT id INTO coluna_a_iniciar_id
  FROM kanban_colunas
  WHERE nome = 'A iniciar' AND ativo = true
  LIMIT 1;

  -- Se não existir, criar a coluna "A iniciar"
  IF coluna_a_iniciar_id IS NULL THEN
    -- Buscar a menor ordem existente para colocar "A iniciar" antes de todas
    SELECT COALESCE(MIN(ordem), 0) - 1 INTO primeira_coluna_ordem
    FROM kanban_colunas
    WHERE ativo = true;

    -- Criar coluna "A iniciar" como primeira coluna
    INSERT INTO kanban_colunas (nome, cor, ordem, status_servico, ativo)
    VALUES ('A iniciar', '#FCD34D', primeira_coluna_ordem, NULL, true)
    RETURNING id INTO coluna_a_iniciar_id;

    -- Atualizar status_servico para o ID da coluna
    UPDATE kanban_colunas
    SET status_servico = coluna_a_iniciar_id::text
    WHERE id = coluna_a_iniciar_id;
  ELSE
    -- Se já existe, garantir que está na primeira posição
    SELECT COALESCE(MIN(ordem), 0) - 1 INTO primeira_coluna_ordem
    FROM kanban_colunas
    WHERE ativo = true AND id != coluna_a_iniciar_id;

    -- Atualizar ordem para ser a primeira
    UPDATE kanban_colunas
    SET ordem = primeira_coluna_ordem
    WHERE id = coluna_a_iniciar_id;

    -- Garantir que status_servico está configurado
    UPDATE kanban_colunas
    SET status_servico = coluna_a_iniciar_id::text
    WHERE id = coluna_a_iniciar_id AND (status_servico IS NULL OR status_servico != coluna_a_iniciar_id::text);
  END IF;
END $$;

-- 2. Garantir que todos os projetos sem status_servico recebam o ID da coluna "A iniciar"
UPDATE financeiro_lancamentos
SET status_servico = (
  SELECT id::text FROM kanban_colunas 
  WHERE nome = 'A iniciar' AND ativo = true 
  ORDER BY ordem ASC 
  LIMIT 1
)
WHERE servico_id IS NOT NULL 
  AND (status_servico IS NULL OR status_servico = '');

