import { supabase } from '@/integrations/supabase/client';

export async function logAction(
  companyId: string | null,
  action: string,
  entity?: { type?: string; id?: string },
  details?: Record<string, any>,
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('audit_logs').insert({
    company_id: companyId,
    user_id: user.id,
    user_email: user.email,
    action,
    entity_type: entity?.type,
    entity_id: entity?.id,
    details: details || {},
  });
}
