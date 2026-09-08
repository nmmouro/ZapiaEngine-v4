-- Migration: campos calculados de public.lancamentos
-- Execute no Supabase SQL Editor.

ALTER TABLE public.empregados
    ADD COLUMN IF NOT EXISTS classificacao text;

ALTER TABLE public.lancamentos
    ALTER COLUMN combustivel TYPE text
    USING NULLIF(TRIM(combustivel::text), '');

ALTER TABLE public.lancamentos
    ALTER COLUMN lava_car TYPE text
    USING NULLIF(TRIM(lava_car::text), '');

CREATE OR REPLACE FUNCTION public.calcular_campos_lancamento()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    minutos integer;
BEGIN
    IF NEW.km_inicial IS NOT NULL AND NEW.km_final IS NOT NULL THEN
        IF NEW.km_final < NEW.km_inicial THEN
            RAISE EXCEPTION 'Km Final (%) não pode ser menor que Km Inicial (%).', NEW.km_final, NEW.km_inicial;
        END IF;
        NEW.distancia_percorrida := ROUND((NEW.km_final - NEW.km_inicial)::numeric, 2);
    ELSE
        NEW.distancia_percorrida := NULL;
    END IF;

    SELECT e.classificacao INTO NEW.classificacao
      FROM public.empregados e
     WHERE e.id = NEW.id_empregado;

    IF NEW.horario_inicial IS NOT NULL AND NEW.horario_final IS NOT NULL THEN
        minutos := EXTRACT(EPOCH FROM (NEW.horario_final - NEW.horario_inicial))::integer / 60;
        IF minutos < 0 THEN minutos := minutos + 1440; END IF;
        NEW.duracao_atendimento := make_time((minutos / 60)::integer, (minutos % 60)::integer, 0);
    ELSE
        NEW.duracao_atendimento := NULL;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calcular_campos_lancamento ON public.lancamentos;
CREATE TRIGGER trg_calcular_campos_lancamento
BEFORE INSERT OR UPDATE OF id_empregado, km_inicial, km_final, horario_inicial, horario_final
ON public.lancamentos
FOR EACH ROW
EXECUTE FUNCTION public.calcular_campos_lancamento();

-- Recalcula registros já existentes.
UPDATE public.lancamentos l
SET
    distancia_percorrida = CASE
        WHEN l.km_inicial IS NOT NULL AND l.km_final IS NOT NULL
        THEN ROUND((l.km_final - l.km_inicial)::numeric, 2)
        ELSE NULL
    END,
    classificacao = e.classificacao,
    duracao_atendimento = CASE
        WHEN l.horario_inicial IS NOT NULL AND l.horario_final IS NOT NULL
        THEN make_time(
            (CASE WHEN EXTRACT(EPOCH FROM (l.horario_final - l.horario_inicial)) < 0
                  THEN EXTRACT(EPOCH FROM (l.horario_final - l.horario_inicial)) + 86400
                  ELSE EXTRACT(EPOCH FROM (l.horario_final - l.horario_inicial))
             END / 3600)::integer,
            (CASE WHEN EXTRACT(EPOCH FROM (l.horario_final - l.horario_inicial)) < 0
                  THEN (EXTRACT(EPOCH FROM (l.horario_final - l.horario_inicial)) + 86400)
                  ELSE EXTRACT(EPOCH FROM (l.horario_final - l.horario_inicial))
             END % 3600 / 60)::integer,
            0
        )
        ELSE NULL
    END
FROM public.empregados e
WHERE e.id = l.id_empregado;

NOTIFY pgrst, 'reload schema';
