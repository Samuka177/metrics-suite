
-- Enum para papéis
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- Empresas
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email_domain TEXT NOT NULL UNIQUE,
  cnpj TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles (separate table to prevent privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id, role)
);

-- Invitations
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'member',
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fiscal notes (importadas por IA)
CREATE TABLE public.fiscal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_format TEXT NOT NULL, -- xml, pdf, csv, image
  numero TEXT,
  serie TEXT,
  chave TEXT,
  emitente_nome TEXT,
  emitente_cnpj TEXT,
  destinatario_nome TEXT,
  destinatario_cnpj TEXT,
  destinatario_endereco TEXT,
  destinatario_municipio TEXT,
  destinatario_uf TEXT,
  destinatario_cep TEXT,
  valor_total NUMERIC,
  peso_kg NUMERIC,
  volume_m3 NUMERIC,
  itens JSONB DEFAULT '[]'::jsonb,
  raw_extracted JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Motoristas
CREATE TABLE public.motoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  veiculo TEXT,
  capacidade_peso NUMERIC,
  capacidade_volume NUMERIC,
  cor TEXT,
  ativo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Paradas
CREATE TABLE public.paradas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  fiscal_note_id UUID REFERENCES public.fiscal_notes(id) ON DELETE SET NULL,
  motorista_id UUID REFERENCES public.motoristas(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  endereco TEXT,
  municipio TEXT,
  uf TEXT,
  lat NUMERIC,
  lng NUMERIC,
  horario TEXT,
  peso NUMERIC,
  volume NUMERIC,
  status TEXT NOT NULL DEFAULT 'pendente',
  ordem INTEGER,
  eta_minutos INTEGER,
  checkin_time TEXT,
  checkout_time TEXT,
  produtos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Security definer function: get user's company
CREATE OR REPLACE FUNCTION public.get_user_company(_user_id UUID)
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- Security definer function: has role in company
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _company_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND company_id = _company_id AND role = _role
  );
$$;

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paradas ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Users can view their company" ON public.companies
  FOR SELECT TO authenticated
  USING (id = public.get_user_company(auth.uid()));

-- Profiles policies
CREATE POLICY "Users can view profiles in their company" ON public.profiles
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- User roles policies
CREATE POLICY "Users can view roles in their company" ON public.user_roles
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

-- Invitations
CREATE POLICY "Admins can view invitations of their company" ON public.invitations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), company_id, 'admin'));

CREATE POLICY "Admins can create invitations" ON public.invitations
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), company_id, 'admin'));

CREATE POLICY "Admins can delete invitations" ON public.invitations
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), company_id, 'admin'));

-- Fiscal notes
CREATE POLICY "Users view company notes" ON public.fiscal_notes
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users insert company notes" ON public.fiscal_notes
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users update company notes" ON public.fiscal_notes
  FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins delete notes" ON public.fiscal_notes
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), company_id, 'admin'));

-- Motoristas
CREATE POLICY "Users view company motoristas" ON public.motoristas
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins manage motoristas insert" ON public.motoristas
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), company_id, 'admin'));

CREATE POLICY "Admins manage motoristas update" ON public.motoristas
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), company_id, 'admin'));

CREATE POLICY "Admins manage motoristas delete" ON public.motoristas
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), company_id, 'admin'));

-- Paradas
CREATE POLICY "Users view company paradas" ON public.paradas
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users insert company paradas" ON public.paradas
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Users update company paradas" ON public.paradas
  FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE POLICY "Admins delete paradas" ON public.paradas
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), company_id, 'admin'));

-- Trigger: ao criar usuário, processar convite
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invitation public.invitations%ROWTYPE;
BEGIN
  -- Procurar convite válido para esse e-mail
  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE email = NEW.email
    AND accepted_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_invitation.id IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, company_id, email, full_name)
    VALUES (NEW.id, v_invitation.company_id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

    INSERT INTO public.user_roles (user_id, company_id, role)
    VALUES (NEW.id, v_invitation.company_id, v_invitation.role);

    UPDATE public.invitations SET accepted_at = now() WHERE id = v_invitation.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indices
CREATE INDEX idx_profiles_company ON public.profiles(company_id);
CREATE INDEX idx_paradas_company ON public.paradas(company_id);
CREATE INDEX idx_fiscal_notes_company ON public.fiscal_notes(company_id);
CREATE INDEX idx_motoristas_company ON public.motoristas(company_id);
CREATE INDEX idx_invitations_email ON public.invitations(email);
