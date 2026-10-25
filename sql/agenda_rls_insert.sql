-- PAINEL FROTA — política de inserção na Agenda
-- Execute em Supabase > SQL Editor.
-- Permite INSERT somente a usuários autenticados. Não altera as políticas
-- existentes de SELECT, UPDATE ou DELETE.

ALTER TABLE public.agenda ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agenda_insert_authenticated ON public.agenda;
CREATE POLICY agenda_insert_authenticated
ON public.agenda
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
