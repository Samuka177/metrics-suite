
-- 1) parada_eventos: audit/history for failures & reschedules
CREATE TABLE public.parada_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  parada_id uuid NOT NULL REFERENCES public.paradas(id) ON DELETE CASCADE,
  motorista_id uuid REFERENCES public.motoristas(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('falha','reagendamento','entrega')),
  motivo text,
  observacao text,
  nova_data date,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_parada_eventos_company ON public.parada_eventos(company_id);
CREATE INDEX idx_parada_eventos_parada ON public.parada_eventos(parada_id);
CREATE INDEX idx_parada_eventos_created ON public.parada_eventos(created_at DESC);

GRANT SELECT, INSERT ON public.parada_eventos TO authenticated;
GRANT ALL ON public.parada_eventos TO service_role;

ALTER TABLE public.parada_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company users view eventos" ON public.parada_eventos
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid())
         OR motorista_id IN (SELECT public.user_motorista_ids(auth.uid())));

CREATE POLICY "company users insert eventos" ON public.parada_eventos
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid())
              OR motorista_id IN (SELECT public.user_motorista_ids(auth.uid())));

-- 2) notificacoes_motorista
CREATE TABLE public.notificacoes_motorista (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  motorista_id uuid NOT NULL REFERENCES public.motoristas(id) ON DELETE CASCADE,
  parada_id uuid REFERENCES public.paradas(id) ON DELETE SET NULL,
  tipo text NOT NULL,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  lida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_motorista ON public.notificacoes_motorista(motorista_id, lida);
CREATE INDEX idx_notif_company ON public.notificacoes_motorista(company_id);

GRANT SELECT, INSERT, UPDATE ON public.notificacoes_motorista TO authenticated;
GRANT ALL ON public.notificacoes_motorista TO service_role;

ALTER TABLE public.notificacoes_motorista ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company view notif" ON public.notificacoes_motorista
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid())
         OR motorista_id IN (SELECT public.user_motorista_ids(auth.uid())));

CREATE POLICY "company insert notif" ON public.notificacoes_motorista
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "motorista update own notif" ON public.notificacoes_motorista
  FOR UPDATE TO authenticated
  USING (motorista_id IN (SELECT public.user_motorista_ids(auth.uid())));

-- 3) motoristas validation trigger
CREATE OR REPLACE FUNCTION public.validate_motorista()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.nome IS NULL OR length(btrim(NEW.nome)) < 3 THEN
    RAISE EXCEPTION 'Nome do motorista deve ter ao menos 3 caracteres';
  END IF;
  IF NEW.email IS NOT NULL AND NEW.email <> '' AND NEW.email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'E-mail do motorista inválido';
  END IF;
  IF NEW.placa IS NOT NULL THEN
    NEW.placa := upper(btrim(NEW.placa));
  END IF;
  IF NEW.email IS NOT NULL THEN
    NEW.email := lower(btrim(NEW.email));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_motorista_trg ON public.motoristas;
CREATE TRIGGER validate_motorista_trg
BEFORE INSERT OR UPDATE ON public.motoristas
FOR EACH ROW EXECUTE FUNCTION public.validate_motorista();
