-- ============================================================
-- LAVA-CAR - MIGRAÇÃO/COMPATIBILIZAÇÃO
-- Use quando a tabela lava_car já existe no Supabase.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lava_car (
    id text PRIMARY KEY,
    id_lancamento text NOT NULL,
    data date NOT NULL DEFAULT current_date,
    hora time without time zone NOT NULL DEFAULT localtime,
    opcao text NOT NULL,
    valor numeric(10,2) NOT NULL,
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lava_car ADD COLUMN IF NOT EXISTS id_lancamento text;
ALTER TABLE public.lava_car ADD COLUMN IF NOT EXISTS data date;
ALTER TABLE public.lava_car ADD COLUMN IF NOT EXISTS hora time without time zone;
ALTER TABLE public.lava_car ADD COLUMN IF NOT EXISTS empregado_matricula text;
ALTER TABLE public.lava_car ADD COLUMN IF NOT EXISTS veiculo text;
ALTER TABLE public.lava_car ADD COLUMN IF NOT EXISTS opcao text;
ALTER TABLE public.lava_car ADD COLUMN IF NOT EXISTS valor numeric(10,2);
ALTER TABLE public.lava_car ADD COLUMN IF NOT EXISTS usuario text;
ALTER TABLE public.lava_car ADD COLUMN IF NOT EXISTS localizacao text;
ALTER TABLE public.lava_car ADD COLUMN IF NOT EXISTS criado_em timestamptz DEFAULT now();
ALTER TABLE public.lava_car ADD COLUMN IF NOT EXISTS atualizado_em timestamptz DEFAULT now();

-- Preenche valores padrão nos registros antigos antes de aplicar restrições.
UPDATE public.lava_car
SET data = COALESCE(data, current_date),
    hora = COALESCE(hora, localtime),
    criado_em = COALESCE(criado_em, now()),
    atualizado_em = COALESCE(atualizado_em, now())
WHERE data IS NULL
   OR hora IS NULL
   OR criado_em IS NULL
   OR atualizado_em IS NULL;

-- Mantém a regra de um Lava-Car por lançamento.
CREATE UNIQUE INDEX IF NOT EXISTS ux_lava_car_id_lancamento
    ON public.lava_car (id_lancamento)
    WHERE id_lancamento IS NOT NULL;

-- Atualiza o schema cache do PostgREST.
NOTIFY pgrst, 'reload schema';
