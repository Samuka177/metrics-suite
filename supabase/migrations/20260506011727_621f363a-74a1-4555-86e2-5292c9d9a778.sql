
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

  IF v_invitation.id IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, company_id, email, full_name)
    VALUES (NEW.id, v_invitation.company_id, NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    INSERT INTO public.user_roles (user_id, company_id, role)
    VALUES (NEW.id, v_invitation.company_id, v_invitation.role);
    UPDATE public.invitations SET accepted_at = now() WHERE id = v_invitation.id;
  END IF;
  -- Sem convite: não cria nada (super admin cria perfil/role manualmente).
  RETURN NEW;
END;
$$;
