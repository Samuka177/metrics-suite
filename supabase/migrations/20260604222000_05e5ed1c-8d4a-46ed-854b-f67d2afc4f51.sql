CREATE TABLE public.motorista_posicoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  motorista_id UUID NOT NULL,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  accuracy NUMERIC,
  speed NUMERIC,
  heading NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_motorista_posicoes_company_time ON public.motorista_posicoes(company_id, created_at DESC);
CREATE INDEX idx_motorista_posicoes_motorista_time ON public.motorista_posicoes(motorista_id, created_at DESC);

GRANT SELECT, INSERT ON public.motorista_posicoes TO authenticated;
GRANT ALL ON public.motorista_posicoes TO service_role;

ALTER TABLE public.motorista_posicoes ENABLE ROW LEVEL SECURITY;

-- Motorista insere/vê suas próprias posições
CREATE POLICY "Motorista insere própria posição"
ON public.motorista_posicoes FOR INSERT TO authenticated
WITH CHECK (motorista_id IN (SELECT public.user_motorista_ids(auth.uid())));

CREATE POLICY "Motorista vê próprias posições"
ON public.motorista_posicoes FOR SELECT TO authenticated
USING (motorista_id IN (SELECT public.user_motorista_ids(auth.uid())));

-- Empresa vê posições dos seus motoristas
CREATE POLICY "Empresa vê posições da empresa"
ON public.motorista_posicoes FOR SELECT TO authenticated
USING (company_id = public.get_user_company(auth.uid()));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.motorista_posicoes;