-- ============================================================
-- LANÇAMENTOS - INDICADORES E VALORES PARA RELATÓRIOS
-- ============================================================
-- Objetivo:
--   checklist            -> TEXT: REGISTRADO / NÃO REGISTRADO
--   notas_abastecimento  -> NUMERIC(12,2): somente o valor da nota
--   lava_car             -> NUMERIC(12,2): somente o valor do serviço
--
-- A tela mostra os status separadamente dos valores numéricos.
-- Esta migração é idempotente e trata tanto o modelo antigo
-- (boolean/text) quanto o modelo já convertido.

DO $$
BEGIN
    -- CHECKLIST: BOOLEAN -> TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='lancamentos'
          AND column_name='checklist' AND data_type='boolean'
    ) THEN
        EXECUTE $sql$
            ALTER TABLE public.lancamentos
            ALTER COLUMN checklist DROP DEFAULT
        $sql$;

        EXECUTE $sql$
            ALTER TABLE public.lancamentos
            ALTER COLUMN checklist TYPE text
            USING CASE
                WHEN checklist IS TRUE THEN 'REGISTRADO'
                WHEN checklist IS FALSE THEN 'NÃO REGISTRADO'
                ELSE NULL
            END
        $sql$;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='lancamentos'
          AND column_name='checklist' AND data_type='text'
    ) THEN
        EXECUTE $sql$
            UPDATE public.lancamentos
            SET checklist = CASE
                WHEN checklist IS NULL OR trim(checklist) = '' THEN 'NÃO REGISTRADO'
                WHEN upper(trim(checklist)) IN ('TRUE','SIM','REALIZADO','REGISTRADO') THEN 'REGISTRADO'
                WHEN upper(trim(checklist)) IN ('FALSE','NAO','NÃO','PENDENTE','NÃO REGISTRADO','NAO REGISTRADO') THEN 'NÃO REGISTRADO'
                ELSE checklist
            END
        $sql$;

        EXECUTE $sql$
            ALTER TABLE public.lancamentos
            ALTER COLUMN checklist SET DEFAULT 'NÃO REGISTRADO'
        $sql$;
    END IF;

    -- ABASTECIMENTO: TEXT -> NUMERIC
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='lancamentos'
          AND column_name='notas_abastecimento'
          AND data_type IN ('text','character varying')
    ) THEN
        EXECUTE $sql$
            ALTER TABLE public.lancamentos
            ADD COLUMN IF NOT EXISTS _tmp_valor_abastecimento numeric(12,2)
        $sql$;

        EXECUTE $sql$
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
                        ), ',', '.'
                    )::numeric(12,2)
                ELSE NULL
            END
        $sql$;

        EXECUTE $sql$
            ALTER TABLE public.lancamentos
            ALTER COLUMN notas_abastecimento TYPE numeric(12,2)
            USING _tmp_valor_abastecimento
        $sql$;

        EXECUTE 'ALTER TABLE public.lancamentos DROP COLUMN IF EXISTS _tmp_valor_abastecimento';
    END IF;

    -- LAVA-CAR: BOOLEAN -> NUMERIC
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='lancamentos'
          AND column_name='lava_car' AND data_type='boolean'
    ) THEN
        EXECUTE $sql$
            ALTER TABLE public.lancamentos
            ALTER COLUMN lava_car DROP DEFAULT
        $sql$;

        EXECUTE $sql$
            ALTER TABLE public.lancamentos
            ALTER COLUMN lava_car TYPE numeric(12,2)
            USING CASE
                WHEN lava_car IS TRUE THEN valor_higienizacao
                ELSE NULL
            END
        $sql$;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
