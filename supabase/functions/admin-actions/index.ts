// Super admin: criar empresa + usuário admin dela
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'no auth' }), { status: 401, headers: corsHeaders });

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauth' }), { status: 401, headers: corsHeaders });

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verificar super_admin
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
    if (!roles?.some(r => r.role === 'super_admin')) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'create_company_with_admin') {
      const { company_name, email_domain, admin_email, admin_password, admin_name } = body;
      if (!company_name || !email_domain || !admin_email || !admin_password) {
        return new Response(JSON.stringify({ error: 'missing fields' }), { status: 400, headers: corsHeaders });
      }
      // Criar empresa
      const { data: comp, error: cErr } = await admin.from('companies')
        .insert({ name: company_name, email_domain: email_domain.toLowerCase() })
        .select().single();
      if (cErr) throw cErr;

      // Criar usuário (precisa de convite OU service role direto)
      const { data: created, error: uErr } = await admin.auth.admin.createUser({
        email: admin_email, password: admin_password, email_confirm: true,
        user_metadata: { full_name: admin_name || admin_email },
      });
      if (uErr) { await admin.from('companies').delete().eq('id', comp.id); throw uErr; }

      // Criar profile + role admin manualmente (bypass trigger que exige convite)
      await admin.from('profiles').insert({
        user_id: created.user.id, company_id: comp.id,
        email: admin_email, full_name: admin_name || admin_email,
      });
      await admin.from('user_roles').insert({
        user_id: created.user.id, company_id: comp.id, role: 'admin',
      });

      await admin.from('audit_logs').insert({
        company_id: comp.id, user_id: user.id, user_email: user.email,
        action: 'create_company', entity_type: 'company', entity_id: comp.id,
        details: { company_name, email_domain, admin_email },
      });
      return new Response(JSON.stringify({ ok: true, company: comp }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'create_user_for_company') {
      const { company_id, email, password, full_name, role } = body;
      const { data: created, error: uErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name: full_name || email },
      });
      if (uErr) throw uErr;
      await admin.from('profiles').insert({
        user_id: created.user.id, company_id, email, full_name: full_name || email,
      });
      await admin.from('user_roles').insert({
        user_id: created.user.id, company_id, role: role || 'member',
      });
      await admin.from('audit_logs').insert({
        company_id, user_id: user.id, user_email: user.email,
        action: 'create_user', entity_type: 'user', entity_id: created.user.id,
        details: { email, role: role || 'member' },
      });
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'list_company_users') {
      const { company_id } = body;
      if (!company_id) return new Response(JSON.stringify({ error: 'missing company_id' }), { status: 400, headers: corsHeaders });
      const { data: profiles } = await admin.from('profiles')
        .select('user_id, email, full_name, created_at')
        .eq('company_id', company_id);
      const { data: roles } = await admin.from('user_roles')
        .select('user_id, role')
        .eq('company_id', company_id);
      const users = (profiles || []).map(p => ({
        ...p,
        roles: (roles || []).filter(r => r.user_id === p.user_id).map(r => r.role),
      }));
      return new Response(JSON.stringify({ users }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'delete_company') {
      const { company_id } = body;
      if (!company_id) return new Response(JSON.stringify({ error: 'missing company_id' }), { status: 400, headers: corsHeaders });

      // Buscar todos os usuários da empresa
      const { data: profs } = await admin.from('profiles').select('user_id').eq('company_id', company_id);
      const userIds = (profs || []).map(p => p.user_id);

      // Apagar dados da empresa
      await admin.from('paradas').delete().eq('company_id', company_id);
      await admin.from('motoristas').delete().eq('company_id', company_id);
      await admin.from('fiscal_notes').delete().eq('company_id', company_id);
      await admin.from('rota_templates').delete().eq('company_id', company_id);
      await admin.from('invitations').delete().eq('company_id', company_id);
      await admin.from('audit_logs').delete().eq('company_id', company_id);
      await admin.from('user_roles').delete().eq('company_id', company_id);
      await admin.from('profiles').delete().eq('company_id', company_id);

      // Apagar usuários do auth (apenas se não tiverem outra empresa)
      for (const uid of userIds) {
        const { data: other } = await admin.from('profiles').select('id').eq('user_id', uid).limit(1);
        if (!other || other.length === 0) {
          await admin.auth.admin.deleteUser(uid);
        }
      }

      await admin.from('companies').delete().eq('id', company_id);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'delete_user') {
      const { user_id } = body;
      if (!user_id) return new Response(JSON.stringify({ error: 'missing user_id' }), { status: 400, headers: corsHeaders });
      await admin.from('user_roles').delete().eq('user_id', user_id);
      await admin.from('profiles').delete().eq('user_id', user_id);
      await admin.auth.admin.deleteUser(user_id);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'unknown action' }), { status: 400, headers: corsHeaders });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
