
REVOKE EXECUTE ON FUNCTION public.get_user_company(UUID) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, UUID, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
