-- ============================================================
-- LANÇAMENTOS - TIPOS NUMÉRICOS / STATUS PARA RELATÓRIOS
-- ============================================================
-- Objetivo:
--   checklist           -> TEXT: REGISTRADO / NÃO REGISTRADO
--   notas_abastecimento -> NUMERIC(12,2): somente o valor total da nota
--   lava_car             -> NUMERIC(12,2): somente o valor do serviço
--
-- A apresentação amigável (status, tipo, litros e opção do lava-car)
-- continua sendo feita na tela, sem contaminar os campos numéricos.
--
-- Execute no SQL Editor do Supabase.

-- ------------------------------------------------------------
-- CHECKLIST: BOOLEAN -> TEXT
-- ------------------------------------------------------------
ALTER TABLE public.lancamentos
    ALTER COLUMN checklist DROP DEFAULT;

ALTER TABLE public.lancamentos
    ALTER COLUMN checklist TYPE text
    USING CASE
        WHEN checklist IS TRUE THEN 'REGISTRADO'
        WHEN checklist IS FALSE THEN 'NÃO REGISTRADO'
        ELSE NULL
    END;

ALTER TABLE public.lancamentos
    ALTER COLUMN checklist SET DEFAULT 'NÃO REGISTRADO';

-- ------------------------------------------------------------
-- ABASTECIMENTO: TEXT -> NUMERIC
--
-- Antes da conversão, tenta recuperar resumos antigos como:
-- REGISTRADO — GASOLINA — 30.500 L — R$ 210,14
-- armazenando somente o valor monetário.
-- ------------------------------------------------------------
ALTER TABLE public.lancamentos
    ADD COLUMN IF NOT EXISTS _tmp_valor_abastecimento numeric(12,2);

UPDATE public.lancamentos
SET _tmp_valor_abastecimento = CASE
    WHEN notas_abastecimento IS NULL OR trim(notas_abastecimento::text) = '' THEN NULL
    WHEN trim(notas_abastecimento::text) ~ '^[0-9]+([.,][0-9]+)?$'
        THEN replace(trim(notas_abastecimento::text), ',', '.')::numeric(12,2)
    WHEN substring(notas_abastecimento::text from 'R\\$[[:space:]]*([0-9.]+,[0-9]{2})') IS NOT NULL
        THEN replace(
            replace(
                substring(notas_abastecimento::text from 'R\\$[[:space:]]*([0-9.]+,[0-9]{2})'),
                '.', ''
            ),
            ',', '.'
        )::numeric(12,2)
    ELSE NULL
END;

ALTER TABLE public.lancamentos
    ALTER COLUMN notas_abastecimento TYPE numeric(12,2)
    USING _tmp_valor_abastecimento;

ALTER TABLE public.lancamentos
    DROP COLUMN IF EXISTS _tmp_valor_abastecimento;

-- ------------------------------------------------------------
-- LAVA-CAR: BOOLEAN -> NUMERIC
--
-- Quando o banco antigo tiver TRUE, utiliza o valor_higienizacao
-- existente para não perder o valor já registrado.
-- ------------------------------------------------------------
ALTER TABLE public.lancamentos
    ALTER COLUMN lava_car DROP DEFAULT;

ALTER TABLE public.lancamentos
    ALTER COLUMN lava_car TYPE numeric(12,2)
    USING CASE
        WHEN lava_car IS TRUE THEN valor_higienizacao
        ELSE NULL
    END;

NOTIFY pgrst, 'reload schema';
