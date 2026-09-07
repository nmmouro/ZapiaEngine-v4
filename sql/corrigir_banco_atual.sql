-- ============================================================
-- CORREÇÃO DO BANCO ATUAL — PAINEL FROTA
-- 1) sincroniza tipos/colunas de public.lancamentos
-- 2) garante SELECT/constraint de avaliacao_visual
-- 3) garante localizacao_final
-- 4) altera para ON DELETE CASCADE todas as FKs que apontam
--    para public.lancamentos, evitando bloqueio ao excluir uma ocorrência.
-- ============================================================

BEGIN;

ALTER TABLE public.lancamentos
    ADD COLUMN IF NOT EXISTS localizacao_final text;

ALTER TABLE public.lancamentos
    ALTER COLUMN combustivel TYPE text
    USING NULLIF(BTRIM(combustivel::text), '');

ALTER TABLE public.lancamentos
    ALTER COLUMN lava_car TYPE text
    USING NULLIF(BTRIM(lava_car::text), '');

ALTER TABLE public.lancamentos
    DROP CONSTRAINT IF EXISTS lancamentos_avaliacao_visual_check;

ALTER TABLE public.lancamentos
    ADD CONSTRAINT lancamentos_avaliacao_visual_check
    CHECK (
        avaliacao_visual IS NULL
        OR avaliacao_visual IN ('COM AVARIAS', 'SEM AVARIAS')
    );

-- Recria cada FK filha que referencia lancamentos com ON DELETE CASCADE.
DO $$
DECLARE
    r record;
    cols text;
    refcols text;
BEGIN
    FOR r IN
        SELECT
            con.oid,
            n.nspname AS child_schema,
            c.relname AS child_table,
            con.conname AS constraint_name,
            rn.nspname AS ref_schema,
            rc.relname AS ref_table,
            con.conkey,
            con.confkey
        FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_class rc ON rc.oid = con.confrelid
        JOIN pg_namespace rn ON rn.oid = rc.relnamespace
        WHERE con.contype = 'f'
          AND con.confrelid = 'public.lancamentos'::regclass
    LOOP
        SELECT string_agg(format('%I', a.attname), ', ' ORDER BY u.ord)
          INTO cols
        FROM unnest(r.conkey) WITH ORDINALITY AS u(attnum, ord)
        JOIN pg_attribute a
          ON a.attrelid = r.oid::regclass
         AND a.attnum = u.attnum;

        SELECT string_agg(format('%I', a.attname), ', ' ORDER BY u.ord)
          INTO refcols
        FROM unnest(r.confkey) WITH ORDINALITY AS u(attnum, ord)
        JOIN pg_attribute a
          ON a.attrelid = 'public.lancamentos'::regclass
         AND a.attnum = u.attnum;

        EXECUTE format(
            'ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I',
            r.child_schema, r.child_table, r.constraint_name
        );

        EXECUTE format(
            'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%s) REFERENCES %I.%I (%s) ON DELETE CASCADE',
            r.child_schema, r.child_table, r.constraint_name,
            cols, r.ref_schema, r.ref_table, refcols
        );
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;
