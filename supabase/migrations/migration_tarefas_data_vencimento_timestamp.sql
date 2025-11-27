-- Migration: Alterar data_vencimento de DATE para TIMESTAMP WITH TIME ZONE para permitir horário

-- Converter valores DATE existentes para TIMESTAMP (mantendo meia-noite como horário padrão)
ALTER TABLE tarefas
  ALTER COLUMN data_vencimento TYPE TIMESTAMP WITH TIME ZONE
  USING CASE 
    WHEN data_vencimento IS NOT NULL THEN (data_vencimento::text || ' 00:00:00')::TIMESTAMP WITH TIME ZONE
    ELSE NULL
  END;

