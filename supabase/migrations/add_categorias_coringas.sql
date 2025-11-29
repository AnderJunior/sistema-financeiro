-- Migration: Adicionar categorias coringas (padrão) para receitas e despesas
-- Data: 2024

-- PARTE 1: Adicionar campo is_coringa na tabela financeiro_categorias
ALTER TABLE financeiro_categorias 
ADD COLUMN IF NOT EXISTS is_coringa BOOLEAN DEFAULT false;

-- Criar índice para melhor performance nas queries
CREATE INDEX IF NOT EXISTS idx_financeiro_categorias_is_coringa ON financeiro_categorias(is_coringa);

-- PARTE 2: Inserir categorias coringas
-- Categorias coringas não têm user_id (são visíveis para todos)
-- Receitas coringas
INSERT INTO financeiro_categorias (tipo, nome, descricao, ativo, is_coringa, user_id)
SELECT 'entrada', 'Receita de serviço prestado', 'Receita proveniente de serviços prestados', true, true, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM financeiro_categorias 
  WHERE tipo = 'entrada' 
  AND nome = 'Receita de serviço prestado' 
  AND is_coringa = true
);

-- Despesas coringas
INSERT INTO financeiro_categorias (tipo, nome, descricao, ativo, is_coringa, user_id)
SELECT 'saida', 'Aluguel', 'Despesa com aluguel de imóvel ou espaço', true, true, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM financeiro_categorias 
  WHERE tipo = 'saida' AND nome = 'Aluguel' AND is_coringa = true
);

INSERT INTO financeiro_categorias (tipo, nome, descricao, ativo, is_coringa, user_id)
SELECT 'saida', 'Energia Elétrica', 'Despesa com conta de energia elétrica', true, true, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM financeiro_categorias 
  WHERE tipo = 'saida' AND nome = 'Energia Elétrica' AND is_coringa = true
);

INSERT INTO financeiro_categorias (tipo, nome, descricao, ativo, is_coringa, user_id)
SELECT 'saida', 'Água', 'Despesa com conta de água', true, true, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM financeiro_categorias 
  WHERE tipo = 'saida' AND nome = 'Água' AND is_coringa = true
);

INSERT INTO financeiro_categorias (tipo, nome, descricao, ativo, is_coringa, user_id)
SELECT 'saida', 'Impostas e taxas', 'Despesa com impostos e taxas diversas', true, true, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM financeiro_categorias 
  WHERE tipo = 'saida' AND nome = 'Impostas e taxas' AND is_coringa = true
);

INSERT INTO financeiro_categorias (tipo, nome, descricao, ativo, is_coringa, user_id)
SELECT 'saida', 'Serviços de Terceiros', 'Despesa com serviços prestados por terceiros', true, true, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM financeiro_categorias 
  WHERE tipo = 'saida' AND nome = 'Serviços de Terceiros' AND is_coringa = true
);

INSERT INTO financeiro_categorias (tipo, nome, descricao, ativo, is_coringa, user_id)
SELECT 'saida', 'Internet/Telefone', 'Despesa com serviços de internet e telefone', true, true, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM financeiro_categorias 
  WHERE tipo = 'saida' AND nome = 'Internet/Telefone' AND is_coringa = true
);

INSERT INTO financeiro_categorias (tipo, nome, descricao, ativo, is_coringa, user_id)
SELECT 'saida', 'Salários', 'Despesa com pagamento de salários', true, true, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM financeiro_categorias 
  WHERE tipo = 'saida' AND nome = 'Salários' AND is_coringa = true
);

INSERT INTO financeiro_categorias (tipo, nome, descricao, ativo, is_coringa, user_id)
SELECT 'saida', 'Marketing', 'Despesa com ações de marketing e publicidade', true, true, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM financeiro_categorias 
  WHERE tipo = 'saida' AND nome = 'Marketing' AND is_coringa = true
);

INSERT INTO financeiro_categorias (tipo, nome, descricao, ativo, is_coringa, user_id)
SELECT 'saida', 'Licenças de Software', 'Despesa com licenças de software e ferramentas', true, true, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM financeiro_categorias 
  WHERE tipo = 'saida' AND nome = 'Licenças de Software' AND is_coringa = true
);

INSERT INTO financeiro_categorias (tipo, nome, descricao, ativo, is_coringa, user_id)
SELECT 'saida', 'Outras Despesas', 'Outras despesas não categorizadas', true, true, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM financeiro_categorias 
  WHERE tipo = 'saida' AND nome = 'Outras Despesas' AND is_coringa = true
);

-- PARTE 3: Ajustar RLS para permitir leitura de categorias coringas para todos os usuários
-- Remover política antiga de SELECT
DROP POLICY IF EXISTS "Users can only view their own financeiro_categorias" ON financeiro_categorias;

-- Criar nova política que permite:
-- 1. Ver categorias coringas (is_coringa = true) para todos
-- 2. Ver categorias próprias (user_id = auth.uid())
CREATE POLICY "Users can view coringas and their own financeiro_categorias"
ON financeiro_categorias FOR SELECT
USING (
  is_coringa = true 
  OR 
  (user_id = auth.uid())
);

-- PARTE 4: Ajustar RLS para impedir edição/exclusão de categorias coringas
-- Remover política antiga de UPDATE
DROP POLICY IF EXISTS "Users can only update their own financeiro_categorias" ON financeiro_categorias;

-- Criar nova política que permite atualizar apenas categorias próprias (não coringas)
CREATE POLICY "Users can only update their own non-coringa financeiro_categorias"
ON financeiro_categorias FOR UPDATE
USING (
  user_id = auth.uid() 
  AND 
  is_coringa = false
)
WITH CHECK (
  user_id = auth.uid() 
  AND 
  is_coringa = false
);

-- Remover política antiga de DELETE
DROP POLICY IF EXISTS "Users can only delete their own financeiro_categorias" ON financeiro_categorias;

-- Criar nova política que permite deletar apenas categorias próprias (não coringas)
CREATE POLICY "Users can only delete their own non-coringa financeiro_categorias"
ON financeiro_categorias FOR DELETE
USING (
  user_id = auth.uid() 
  AND 
  is_coringa = false
);

-- PARTE 5: Criar função específica para categorias que lida com coringas
-- Substituir o trigger genérico por um específico para categorias
CREATE OR REPLACE FUNCTION set_user_id_financeiro_categorias()
RETURNS TRIGGER AS $$
BEGIN
  -- Se for categoria coringa, garantir que user_id seja NULL
  IF NEW.is_coringa = true THEN
    NEW.user_id = NULL;
    RETURN NEW;
  END IF;
  
  -- Se não for coringa e user_id não foi fornecido, usar o usuário autenticado
  IF NEW.user_id IS NULL THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'user_id is required and no authenticated user found';
    END IF;
    NEW.user_id = auth.uid();
  END IF;
  
  -- Garantir que o user_id sempre corresponde ao usuário autenticado (exceto coringas)
  IF auth.uid() IS NOT NULL AND NEW.user_id != auth.uid() AND NEW.is_coringa = false THEN
    RAISE EXCEPTION 'user_id must match authenticated user. Expected: %, Got: %', auth.uid(), NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antigo e criar novo com função específica
DROP TRIGGER IF EXISTS set_user_id_financeiro_categorias ON financeiro_categorias;
CREATE TRIGGER set_user_id_financeiro_categorias
  BEFORE INSERT ON financeiro_categorias
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id_financeiro_categorias();

-- Criar trigger antes de UPDATE para prevenir mudança de is_coringa
CREATE OR REPLACE FUNCTION prevent_coringa_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Não permitir mudar is_coringa de true para false ou vice-versa
  IF OLD.is_coringa != NEW.is_coringa THEN
    RAISE EXCEPTION 'Não é permitido alterar o status de categoria coringa';
  END IF;
  
  -- Não permitir mudar user_id de NULL para não-NULL em categorias coringas
  IF OLD.is_coringa = true AND OLD.user_id IS NULL AND NEW.user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Não é permitido atribuir user_id a categorias coringas';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_coringa_change_trigger ON financeiro_categorias;
CREATE TRIGGER prevent_coringa_change_trigger
  BEFORE UPDATE ON financeiro_categorias
  FOR EACH ROW
  EXECUTE FUNCTION prevent_coringa_change();

