
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invitation public.invitations%ROWTYPE;
  v_domain TEXT;
  v_company_id UUID;
  v_existing_company_id UUID;
  v_company_name TEXT;
BEGIN
  -- Procurar convite válido
  SELECT * INTO v_invitation
  FROM public.invitations
  WHERE lower(email) = lower(NEW.email)
    AND accepted_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_invitation.id IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, company_id, email, full_name)
    VALUES (NEW.id, v_invitation.company_id, NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    INSERT INTO public.user_roles (user_id, company_id, role)
    VALUES (NEW.id, v_invitation.company_id, v_invitation.role);
    UPDATE public.invitations SET accepted_at = now() WHERE id = v_invitation.id;
    RETURN NEW;
  END IF;

  -- Sem convite: extrair domínio
  v_domain := lower(split_part(NEW.email, '@', 2));
  IF v_domain IS NULL OR v_domain = '' THEN
    RAISE EXCEPTION 'E-mail inválido';
  END IF;

  SELECT id INTO v_existing_company_id FROM public.companies WHERE email_domain = v_domain;

  IF v_existing_company_id IS NOT NULL THEN
    -- Empresa já existe sem convite: bloquear
    RAISE EXCEPTION 'Cadastro requer convite do administrador da empresa %', v_domain;
  END IF;

  -- Criar nova empresa (primeiro usuário do domínio = admin)
  v_company_name := initcap(split_part(v_domain, '.', 1));
  INSERT INTO public.companies (name, email_domain) VALUES (v_company_name, v_domain)
  RETURNING id INTO v_company_id;

  INSERT INTO public.profiles (user_id, company_id, email, full_name)
  VALUES (NEW.id, v_company_id, NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, company_id, role)
  VALUES (NEW.id, v_company_id, 'admin');

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
