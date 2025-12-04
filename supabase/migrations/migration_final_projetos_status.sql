-- Migration FINAL: Garantir que TODOS os projetos tenham status_servico correspondente ao ID de uma coluna
-- Esta migration remove qualquer lógica de compatibilidade e usa apenas IDs de colunas

-- 1. Verificar colunas existentes
SELECT id, nome FROM kanban_colunas ORDER BY ordem;

-- 2. Migrar TODOS os projetos com status antigos ou NULL para a primeira coluna (geralmente "Pendente")
-- Primeiro, vamos pegar o ID da primeira coluna ordenada por ordem
UPDATE financeiro_lancamentos 
SET status_servico = (
  SELECT id::text FROM kanban_colunas ORDER BY ordem ASC LIMIT 1
)
WHERE servico_id IS NOT NULL 
  AND (
    status_servico IS NULL 
    OR status_servico = '' 
    OR status_servico NOT IN (SELECT id::text FROM kanban_colunas)
  );

-- 3. Verificar resultado - todos os projetos devem ter status_servico correspondente a uma coluna
SELECT 
  kc.nome as coluna_nome,
  COUNT(*) as quantidade_projetos
FROM financeiro_lancamentos fl
INNER JOIN kanban_colunas kc ON fl.status_servico = kc.id::text
WHERE fl.servico_id IS NOT NULL
GROUP BY kc.nome, kc.ordem
ORDER BY kc.ordem;

-- 4. Verificar se há projetos sem coluna correspondente (não deveria haver)
SELECT 
  COUNT(*) as projetos_sem_coluna,
  status_servico
FROM financeiro_lancamentos
WHERE servico_id IS NOT NULL
  AND status_servico NOT IN (SELECT id::text FROM kanban_colunas)
GROUP BY status_servico;






















