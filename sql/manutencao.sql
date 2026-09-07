-- ============================================================
-- FUNÇÃO DE AUDITORIA
-- ============================================================

CREATE OR REPLACE FUNCTION public.atualizar_atualizado_em_manutencao()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$;

-- ============================================================
-- TABELA MANUTENÇÃO
-- Vinculada à ocorrência em public.lancamentos.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.manutencao (
    id text PRIMARY KEY,
    id_lancamento text NOT NULL
        REFERENCES public.lancamentos(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    data date NOT NULL DEFAULT current_date,
    hora time NOT NULL DEFAULT localtime,
    empregado_matricula text,
    veiculo text,
    odometro numeric(12,1) NOT NULL,
    usuario text,
    imagem text,
    observacoes text,
    descricao_manutencao text NOT NULL,
    valor_total_nota numeric(12,2) NOT NULL,
    localizacao text,
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manutencao_lancamento
    ON public.manutencao(id_lancamento);

CREATE INDEX IF NOT EXISTS idx_manutencao_data
    ON public.manutencao(data DESC);

CREATE INDEX IF NOT EXISTS idx_manutencao_veiculo
    ON public.manutencao(veiculo);

DROP TRIGGER IF EXISTS trg_manutencao_updated_at
    ON public.manutencao;

CREATE TRIGGER trg_manutencao_updated_at
BEFORE UPDATE ON public.manutencao
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_atualizado_em_manutencao();
