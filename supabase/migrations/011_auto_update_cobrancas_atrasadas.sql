-- Migration: Atualização automática de status de cobranças atrasadas
-- Atualiza automaticamente o status para 'em_atraso' quando a data de vencimento
-- for menor que a data atual e o status não for 'pago' ou 'cancelado'
-- Data: 2024

-- ============================================================================
-- Função para atualizar status de cobranças atrasadas automaticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION update_cobranca_status_on_vencimento()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Verificar se é uma cobrança (tipo = 'entrada')
  -- e se a data de vencimento é menor que a data atual
  IF NEW.tipo = 'entrada' 
     AND NEW.data_vencimento IS NOT NULL 
     AND NEW.data_vencimento < CURRENT_DATE 
     AND NEW.status NOT IN ('pago', 'cancelado') THEN
    NEW.status = 'em_atraso';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Comentário na função
COMMENT ON FUNCTION update_cobranca_status_on_vencimento() IS 
'Função de trigger para atualizar status de cobranças para em_atraso quando a data de vencimento for menor que a data atual. search_path fixado para segurança.';

-- ============================================================================
-- Trigger BEFORE INSERT/UPDATE na tabela financeiro_lancamentos
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_update_cobranca_status_on_vencimento ON financeiro_lancamentos;

CREATE TRIGGER trigger_update_cobranca_status_on_vencimento
  BEFORE INSERT OR UPDATE ON financeiro_lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_cobranca_status_on_vencimento();

-- ============================================================================
-- Função para atualizar cobranças existentes que estão atrasadas
-- Pode ser chamada manualmente ou via cron job
-- ============================================================================
CREATE OR REPLACE FUNCTION atualizar_cobrancas_atrasadas()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  registros_atualizados INTEGER;
BEGIN
  -- Atualizar cobranças que estão atrasadas mas não estão marcadas como atrasadas
  UPDATE financeiro_lancamentos
  SET status = 'em_atraso',
      updated_at = NOW()
  WHERE tipo = 'entrada'
    AND data_vencimento IS NOT NULL
    AND data_vencimento < CURRENT_DATE
    AND status NOT IN ('pago', 'cancelado', 'em_atraso');
  
  GET DIAGNOSTICS registros_atualizados = ROW_COUNT;
  
  RETURN registros_atualizados;
END;
$$;

-- Comentário na função
COMMENT ON FUNCTION atualizar_cobrancas_atrasadas() IS 
'Função para atualizar cobranças existentes que estão atrasadas. Pode ser chamada manualmente ou via cron job. search_path fixado para segurança.';

