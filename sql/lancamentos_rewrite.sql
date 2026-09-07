-- ============================================================
-- REESCRITA DA TABELA public.lancamentos
--
-- Objetivos:
-- 1. Colocar data/hora logo após o ID.
-- 2. Eliminar definitivamente registro_avarias.
-- 3. Manter os dados existentes sempre que possível.
-- 4. Manter checklist como TEXT de status.
-- 5. Manter valores financeiros numéricos.
-- 6. Recriar os vínculos das tabelas relacionadas.
--
-- Execute no SQL Editor do Supabase.
-- ============================================================

BEGIN;

-- As tabelas relacionadas possuem FKs para public.lancamentos.
-- Removemos TODAS as FKs que apontam para lancamentos, usando o catálogo
-- do PostgreSQL, pois os nomes podem variar entre instalações.
DO $$
DECLARE
    r record;
BEGIN
    IF to_regclass('public.lancamentos') IS NOT NULL THEN
        FOR r IN
            SELECT n.nspname AS schema_name, c.relname AS table_name, con.conname AS constraint_name
            FROM pg_constraint con
            JOIN pg_class c ON c.oid = con.conrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE con.contype = 'f'
              AND con.confrelid = 'public.lancamentos'::regclass
        LOOP
            EXECUTE format(
                'ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I',
                r.schema_name, r.table_name, r.constraint_name
            );
        END LOOP;
    END IF;
END $$;

DROP TABLE IF EXISTS public.lancamentos_novo;

CREATE TABLE public.lancamentos_novo (
    id text PRIMARY KEY,
    data date NOT NULL DEFAULT current_date,
    hora time NOT NULL DEFAULT localtime,
    id_empregado text NOT NULL REFERENCES public.empregados(id),
    id_veiculo text NOT NULL REFERENCES public.veiculos(id),
    empregado_matricula text,
    veiculo text,
    passageiro_setor_motivo text NOT NULL,
    itinerario text NOT NULL,
    horario_inicial time,
    horario_final time,
    km_inicial numeric,
    km_final numeric,
    distancia_percorrida numeric,
    combustivel numeric(12,3),
    media_consumo_combustivel numeric(12,3),
    checklist text NOT NULL DEFAULT 'NÃO REGISTRADO',
    avaliacao_visual text,
    avarias_registradas text,
    lava_car text,
    valor_higienizacao numeric(12,2),
    notas_abastecimento numeric(12,2),
    notas_manutencao numeric(12,2),
    status text NOT NULL DEFAULT 'AGENDADO',
    horas_extras numeric(12,2),
    revisao text,
    usuario text,
    classificacao text,
    localizacao text,
    localizacao_final text,
    duracao_atendimento time,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Copia os registros existentes.
-- registro_avarias é propositalmente ignorado.
-- Campos financeiros que possam ter sido armazenados como texto são convertidos.
INSERT INTO public.lancamentos_novo (
    id, data, hora, id_empregado, id_veiculo,
    empregado_matricula, veiculo, passageiro_setor_motivo, itinerario,
    horario_inicial, horario_final, km_inicial, km_final,
    distancia_percorrida, combustivel, media_consumo_combustivel,
    checklist, avaliacao_visual, avarias_registradas,
    lava_car, valor_higienizacao, notas_abastecimento, notas_manutencao,
    status, horas_extras, revisao, usuario, classificacao,
    localizacao, localizacao_final, duracao_atendimento, created_at, updated_at
)
SELECT
    id,
    data,
    CASE
        WHEN hora IS NULL OR btrim(hora::text) = '' THEN NULL
        WHEN btrim(hora::text) ~ '^\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?$' THEN btrim(hora::text)::time
        ELSE NULL
    END,
    id_empregado,
    id_veiculo,
    empregado_matricula,
    veiculo,
    passageiro_setor_motivo,
    itinerario,
    CASE
        WHEN horario_inicial IS NULL OR btrim(horario_inicial::text) = '' THEN NULL
        WHEN btrim(horario_inicial::text) ~ '^\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?$' THEN btrim(horario_inicial::text)::time
        ELSE NULL
    END,
    CASE
        WHEN horario_final IS NULL OR btrim(horario_final::text) = '' THEN NULL
        WHEN btrim(horario_final::text) ~ '^\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?$' THEN btrim(horario_final::text)::time
        ELSE NULL
    END,
    km_inicial,
    km_final,
    distancia_percorrida,
    CASE
        WHEN combustivel IS NULL THEN NULL
        WHEN btrim(combustivel::text) = '' THEN NULL
        WHEN btrim(combustivel::text) ~ '^[-+]?[0-9]+([.,][0-9]+)?$'
            THEN replace(btrim(combustivel::text), ',', '.')::numeric(12,3)
        WHEN btrim(combustivel::text) ~ '^[-+]?[0-9.]+,[0-9]+$'
            THEN replace(replace(btrim(combustivel::text), '.', ''), ',', '.')::numeric(12,3)
        ELSE NULL
    END,
    CASE
        WHEN media_consumo_combustivel IS NULL THEN NULL
        WHEN btrim(media_consumo_combustivel::text) = '' THEN NULL
        WHEN btrim(media_consumo_combustivel::text) ~ '^[-+]?[0-9]+([.,][0-9]+)?$'
            THEN replace(btrim(media_consumo_combustivel::text), ',', '.')::numeric(12,3)
        WHEN btrim(media_consumo_combustivel::text) ~ '^[-+]?[0-9.]+,[0-9]+$'
            THEN replace(replace(btrim(media_consumo_combustivel::text), '.', ''), ',', '.')::numeric(12,3)
        ELSE NULL
    END,
    CASE
        WHEN checklist IS NULL OR btrim(checklist::text) = '' THEN 'NÃO REGISTRADO'
        WHEN upper(btrim(checklist::text)) IN ('TRUE','T','SIM','S','REGISTRADO','REALIZADO') THEN 'REGISTRADO'
        ELSE 'NÃO REGISTRADO'
    END,
    avaliacao_visual,
    avarias_registradas,
    CASE
        WHEN lava_car IS NULL THEN NULL
        ELSE lava_car::text
    END,
    CASE
        WHEN valor_higienizacao IS NULL THEN NULL
        ELSE valor_higienizacao::numeric(12,2)
    END,
    CASE
        WHEN notas_abastecimento IS NULL THEN NULL
        WHEN notas_abastecimento::text ~ '^[-+]?[0-9]+([.,][0-9]+)?$'
            THEN replace(notas_abastecimento::text, ',', '.')::numeric(12,2)
        WHEN notas_abastecimento::text ~ 'R\$[[:space:]]*[0-9.]+,[0-9]{2}'
            THEN replace(replace(regexp_replace(notas_abastecimento::text, '.*R\$[[:space:]]*([0-9.]+,[0-9]{2}).*', '\1'), '.', ''), ',', '.')::numeric(12,2)
        ELSE NULL
    END,
    CASE
        WHEN notas_manutencao IS NULL THEN NULL
        WHEN notas_manutencao::text ~ '^[-+]?[0-9]+([.,][0-9]+)?$'
            THEN replace(notas_manutencao::text, ',', '.')::numeric(12,2)
        WHEN notas_manutencao::text ~ 'R\$[[:space:]]*[0-9.]+,[0-9]{2}'
            THEN replace(replace(regexp_replace(notas_manutencao::text, '.*R\$[[:space:]]*([0-9.]+,[0-9]{2}).*', '\1'), '.', ''), ',', '.')::numeric(12,2)
        ELSE NULL
    END,
    status,
    horas_extras,
    revisao,
    usuario,
    classificacao,
    localizacao,
    localizacao_final,
    CASE
        WHEN duracao_atendimento IS NULL OR btrim(duracao_atendimento::text) = '' THEN NULL
        WHEN btrim(duracao_atendimento::text) ~ '^\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?$' THEN btrim(duracao_atendimento::text)::time
        ELSE NULL
    END,
    now(),
    now()
FROM public.lancamentos;

DROP TABLE public.lancamentos;
ALTER TABLE public.lancamentos_novo RENAME TO lancamentos;

-- Índices usados pelo sistema.
CREATE INDEX IF NOT EXISTS idx_lancamentos_veiculo ON public.lancamentos(id_veiculo);
CREATE INDEX IF NOT EXISTS idx_lancamentos_empregado ON public.lancamentos(id_empregado);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON public.lancamentos(data DESC);

-- Função/trigger de atualização.
CREATE OR REPLACE FUNCTION public.atualizar_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lancamentos_updated_at ON public.lancamentos;
CREATE TRIGGER trg_lancamentos_updated_at
BEFORE UPDATE ON public.lancamentos
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

-- Restaura os vínculos das tabelas filhas.
ALTER TABLE public.abastecimento
    ADD CONSTRAINT abastecimento_id_lancamento_fkey
    FOREIGN KEY (id_lancamento) REFERENCES public.lancamentos(id)
    ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.avarias
    ADD CONSTRAINT avarias_id_lancamento_fkey
    FOREIGN KEY (id_lancamento) REFERENCES public.lancamentos(id)
    ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.lava_car
    ADD CONSTRAINT lava_car_id_lancamento_fkey
    FOREIGN KEY (id_lancamento) REFERENCES public.lancamentos(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.manutencao
    ADD CONSTRAINT manutencao_id_lancamento_fkey
    FOREIGN KEY (id_lancamento) REFERENCES public.lancamentos(id)
    ON UPDATE CASCADE ON DELETE RESTRICT;

NOTIFY pgrst, 'reload schema';

COMMIT;
