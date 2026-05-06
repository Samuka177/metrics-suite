
-- Helper function: super admin check
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  );
$$;

-- Audit logs
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  user_id uuid,
  user_email text,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_company ON public.audit_logs(company_id, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view company audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR public.has_role(auth.uid(), company_id, 'admin'::app_role)
);

CREATE POLICY "Authenticated insert audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    company_id IS NULL
    OR company_id = public.get_user_company(auth.uid())
    OR public.is_super_admin(auth.uid())
  )
);

-- Fiscal notes: parsing status & file info
ALTER TABLE public.fiscal_notes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'parsed',
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS arquivo_nome text,
  ADD COLUMN IF NOT EXISTS arquivo_tipo text;

-- Super admin policies
CREATE POLICY "Super admin all companies select"
ON public.companies FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin insert companies"
ON public.companies FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin update companies"
ON public.companies FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin delete companies"
ON public.companies FOR DELETE TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin manage invitations select"
ON public.invitations FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin manage invitations insert"
ON public.invitations FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin manage invitations delete"
ON public.invitations FOR DELETE TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin manage roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Block auto-signup by domain: must have invitation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invitation public.invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE lower(email) = lower(NEW.email)
    AND accepted_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_invitation.id IS NULL THEN
    RAISE EXCEPTION 'Cadastro requer convite válido. Solicite um convite ao administrador.';
  END IF;

  INSERT INTO public.profiles (user_id, company_id, email, full_name)
  VALUES (NEW.id, v_invitation.company_id, NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, company_id, role)
  VALUES (NEW.id, v_invitation.company_id, v_invitation.role);
  UPDATE public.invitations SET accepted_at = now() WHERE id = v_invitation.id;
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
