
-- paradas: novos campos
ALTER TABLE public.paradas
  ADD COLUMN IF NOT EXISTS assinatura_url text,
  ADD COLUMN IF NOT EXISTS motivo_falha text,
  ADD COLUMN IF NOT EXISTS data_rota date DEFAULT CURRENT_DATE;

-- motoristas: vincular a um usuário (login do motorista)
ALTER TABLE public.motoristas
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS idx_motoristas_user_id ON public.motoristas(user_id);
CREATE INDEX IF NOT EXISTS idx_paradas_data_rota ON public.paradas(data_rota);
CREATE INDEX IF NOT EXISTS idx_paradas_motorista ON public.paradas(motorista_id);

-- Função auxiliar: ids de motoristas atrelados ao usuário logado
CREATE OR REPLACE FUNCTION public.user_motorista_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.motoristas WHERE user_id = _user_id;
$$;

-- RLS: motorista pode ver suas próprias paradas
DROP POLICY IF EXISTS "Motorista vê suas paradas" ON public.paradas;
CREATE POLICY "Motorista vê suas paradas"
  ON public.paradas FOR SELECT
  TO authenticated
  USING (motorista_id IN (SELECT public.user_motorista_ids(auth.uid())));

DROP POLICY IF EXISTS "Motorista atualiza suas paradas" ON public.paradas;
CREATE POLICY "Motorista atualiza suas paradas"
  ON public.paradas FOR UPDATE
  TO authenticated
  USING (motorista_id IN (SELECT public.user_motorista_ids(auth.uid())));

-- RLS motorista pode ver seu próprio cadastro
DROP POLICY IF EXISTS "Motorista vê próprio cadastro" ON public.motoristas;
CREATE POLICY "Motorista vê próprio cadastro"
  ON public.motoristas FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Storage: bucket assinaturas (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('assinaturas', 'assinaturas', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: caminho = {company_id}/...
DROP POLICY IF EXISTS "assinaturas read company" ON storage.objects;
CREATE POLICY "assinaturas read company"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'assinaturas'
    AND (storage.foldername(name))[1] = public.get_user_company(auth.uid())::text
  );

DROP POLICY IF EXISTS "assinaturas insert company" ON storage.objects;
CREATE POLICY "assinaturas insert company"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assinaturas'
    AND (storage.foldername(name))[1] = public.get_user_company(auth.uid())::text
  );
