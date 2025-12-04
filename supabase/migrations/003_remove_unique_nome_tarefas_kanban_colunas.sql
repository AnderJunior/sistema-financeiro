-- Migration: Remover constraint UNIQUE(nome) da tabela tarefas_kanban_colunas
-- Isso permite que usuários criem colunas com nomes iguais ou diferentes conforme necessário

-- Remover a constraint única antiga no campo nome
ALTER TABLE tarefas_kanban_colunas 
DROP CONSTRAINT IF EXISTS tarefas_kanban_colunas_nome_key;

-- Nota: Não criamos uma nova constraint UNIQUE(nome, user_id) porque
-- o usuário deve ter liberdade total para criar colunas com nomes iguais ou diferentes
-- Se necessário evitar duplicatas, isso deve ser feito no código da aplicação








