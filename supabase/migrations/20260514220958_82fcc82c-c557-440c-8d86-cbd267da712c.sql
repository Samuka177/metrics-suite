CREATE TABLE public.rota_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  paradas JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rota_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view company templates"
  ON public.rota_templates FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users create company templates"
  ON public.rota_templates FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins update templates"
  ON public.rota_templates FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), company_id, 'admin'::app_role));

CREATE POLICY "Admins delete templates"
  ON public.rota_templates FOR DELETE TO authenticated
  USING (has_role(auth.uid(), company_id, 'admin'::app_role));

CREATE INDEX idx_rota_templates_company ON public.rota_templates(company_id);