-- ============================================================
-- LANÇAMENTOS - INDICADORES PARA FILTROS E RELATÓRIOS
-- ============================================================
-- Estrutura final:
--   checklist            TEXT: REGISTRADO / NÃO REGISTRADO
--   notas_abastecimento  NUMERIC(12,2): somente o valor da nota
--   lava_car             NUMERIC(12,2): somente o valor do Lava-Car
--
-- A interface exibe os status separadamente dos valores numéricos.
-- Esta migração aceita tanto a estrutura original (boolean/text) quanto
-- uma instalação que já tenha recebido parte da alteração.

DO $$
DECLARE
    tipo text;
BEGIN
    SELECT format_type(a.atttypid, a.atttypmod)
      INTO tipo
      FROM pg_attribute a
     WHERE a.attrelid = 'public.lancamentos'::regclass
       AND a.attname = 'checklist'
       AND NOT a.attisdropped;

    IF tipo = 'boolean' THEN
        ALTER TABLE public.lancamentos ALTER COLUMN checklist DROP DEFAULT;
        ALTER TABLE public.lancamentos
            ALTER COLUMN checklist TYPE text
            USING CASE
                WHEN checklist IS TRUE THEN 'REGISTRADO'
                ELSE 'NÃO REGISTRADO'
            END;
    ELSIF tipo IS DISTINCT FROM 'text' THEN
        RAISE EXCEPTION 'Tipo inesperado para lancamentos.checklist: %', tipo;
    END IF;

    ALTER TABLE public.lancamentos
        ALTER COLUMN checklist SET DEFAULT 'NÃO REGISTRADO';
    ALTER TABLE public.lancamentos
        ALTER COLUMN checklist SET NOT NULL;
END $$;

DO $$
DECLARE
    tipo text;
BEGIN
    SELECT format_type(a.atttypid, a.atttypmod)
      INTO tipo
      FROM pg_attribute a
     WHERE a.attrelid = 'public.lancamentos'::regclass
       AND a.attname = 'notas_abastecimento'
       AND NOT a.attisdropped;

    IF tipo = 'text' THEN
        ALTER TABLE public.lancamentos
            ADD COLUMN _tmp_valor_abastecimento numeric(12,2);

        UPDATE public.lancamentos
        SET _tmp_valor_abastecimento = CASE
            WHEN notas_abastecimento IS NULL OR trim(notas_abastecimento) = '' THEN NULL
            WHEN trim(notas_abastecimento) ~ '^[0-9]+([.,][0-9]+)?$'
                THEN replace(trim(notas_abastecimento), ',', '.')::numeric(12,2)
            WHEN substring(notas_abastecimento from 'R\$[[:space:]]*([0-9.]+,[0-9]{2})') IS NOT NULL
                THEN replace(
                    replace(
                        substring(notas_abastecimento from 'R\$[[:space:]]*([0-9.]+,[0-9]{2})'),
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
            DROP COLUMN _tmp_valor_abastecimento;
    ELSIF tipo <> 'numeric(12,2)' THEN
        ALTER TABLE public.lancamentos
            ALTER COLUMN notas_abastecimento TYPE numeric(12,2)
            USING notas_abastecimento::numeric(12,2);
    END IF;
END $$;

DO $$
DECLARE
    tipo text;
BEGIN
    SELECT format_type(a.atttypid, a.atttypmod)
      INTO tipo
      FROM pg_attribute a
     WHERE a.attrelid = 'public.lancamentos'::regclass
       AND a.attname = 'lava_car'
       AND NOT a.attisdropped;

    IF tipo = 'boolean' THEN
        ALTER TABLE public.lancamentos ALTER COLUMN lava_car DROP DEFAULT;
        ALTER TABLE public.lancamentos
            ALTER COLUMN lava_car TYPE numeric(12,2)
            USING CASE
                WHEN lava_car IS TRUE THEN valor_higienizacao
                ELSE NULL
            END;
    ELSIF tipo <> 'numeric(12,2)' THEN
        ALTER TABLE public.lancamentos
            ALTER COLUMN lava_car TYPE numeric(12,2)
            USING lava_car::numeric(12,2);
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
