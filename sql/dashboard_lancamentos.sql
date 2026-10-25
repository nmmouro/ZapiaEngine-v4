-- Painel Frota: permitir ao Dashboard consultar ocorrências de todos os usuários
-- sem abrir a leitura irrestrita da tabela public.lancamentos pelo endpoint REST.
-- Execute uma única vez no Supabase > SQL Editor.

CREATE OR REPLACE FUNCTION public.dashboard_lancamentos()
RETURNS SETOF public.lancamentos
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT l.*
    FROM public.lancamentos AS l
    WHERE auth.uid() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.dashboard_lancamentos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_lancamentos() TO authenticated;
