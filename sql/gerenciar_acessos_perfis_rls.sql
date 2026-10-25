-- PAINEL FROTA — sincronizar perfil de acesso com permissões e RLS
-- Execute no Supabase SQL Editor após publicar as Edge Functions.
-- Não altera empregados.classificacao nem a coluna IDENTITY de perfis_acesso.id.

-- Permite que cada usuário autenticado leia somente seu próprio registro de perfil.
ALTER TABLE public.perfis_acesso ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS perfis_acesso_select_proprio ON public.perfis_acesso;
CREATE POLICY perfis_acesso_select_proprio
ON public.perfis_acesso
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- O perfil em perfis_acesso é a fonte das permissões do Painel Frota.
-- Se já existir um perfil, inativo significa sem permissões (NULL); não há fallback.
-- O fallback preserva compatibilidade para contas antigas ainda sem linha em perfis_acesso.
CREATE OR REPLACE FUNCTION public.pf_perfil_atual()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.perfis_acesso pa WHERE pa.auth_user_id = auth.uid()
    ) THEN (
      SELECT lower(pa.perfil)
      FROM public.perfis_acesso pa
      WHERE pa.auth_user_id = auth.uid() AND pa.ativo = true
      LIMIT 1
    )
    ELSE (
      SELECT lower(e.classificacao)
      FROM auth.users u
      JOIN public.empregados e
        ON lower(trim(e.email)) = lower(trim(u.email))
      WHERE u.id = auth.uid()
        AND upper(trim(e.status)) = 'ATIVO'
      LIMIT 1
    )
  END;
$$;
GRANT EXECUTE ON FUNCTION public.pf_perfil_atual() TO authenticated;
