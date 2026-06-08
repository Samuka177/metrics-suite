// Idempotente: garante que existe o usuário super admin (admin@rotiflow.app / 123456)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPER_EMAIL = 'admin@rotiflow.app';
const SUPER_PASSWORD = '123456';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const steps: any[] = [];
  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 1) Empresa plataforma
    let { data: platformCo } = await admin.from('companies').select('*').eq('email_domain', 'rotiflow.app').maybeSingle();
    if (!platformCo) {
      const { data: created, error } = await admin.from('companies').insert({ name: 'Plataforma RotiFlow', email_domain: 'rotiflow.app' }).select().single();
      if (error) throw new Error('companies insert: ' + error.message);
      platformCo = created;
    }
    steps.push({ company: platformCo?.id });

    // 2) Buscar usuário (paginando)
    let user: any = null;
    for (let page = 1; page <= 10 && !user; page++) {
      const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error('listUsers: ' + error.message);
      user = list.users.find((u: any) => u.email?.toLowerCase() === SUPER_EMAIL);
      if (list.users.length < 200) break;
    }

    if (!user) {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: SUPER_EMAIL, password: SUPER_PASSWORD, email_confirm: true,
        user_metadata: { full_name: 'Super Admin' },
      });
      if (cErr) throw new Error('createUser: ' + cErr.message);
      user = created.user;
      steps.push({ created: user.id });
    } else {
      const { data: upd, error: uErr } = await admin.auth.admin.updateUserById(user.id, {
        password: SUPER_PASSWORD,
        email_confirm: true,
        ban_duration: 'none',
      });
      if (uErr) throw new Error('updateUserById: ' + uErr.message);
      steps.push({ updated: user.id, hasUser: !!upd?.user });
    }

    // 3) Profile
    const { data: prof } = await admin.from('profiles').select('id').eq('user_id', user.id).maybeSingle();
    if (!prof) {
      const { error } = await admin.from('profiles').insert({
        user_id: user.id, company_id: platformCo!.id,
        email: SUPER_EMAIL, full_name: 'Super Admin',
      });
      if (error) throw new Error('profiles insert: ' + error.message);
      steps.push({ profile: 'created' });
    }

    // 4) Role
    const { data: existingRole } = await admin.from('user_roles')
      .select('id').eq('user_id', user.id).eq('role', 'super_admin').maybeSingle();
    if (!existingRole) {
      const { error } = await admin.from('user_roles').insert({
        user_id: user.id, company_id: platformCo!.id, role: 'super_admin',
      });
      if (error) throw new Error('user_roles insert: ' + error.message);
      steps.push({ role: 'created' });
    }

    // 5) Sanity: tentar login
    const anon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!,
    );
    const { data: sign, error: sErr } = await anon.auth.signInWithPassword({
      email: SUPER_EMAIL, password: SUPER_PASSWORD,
    });
    steps.push({ signInOk: !!sign?.session, signInError: sErr?.message });

    return new Response(JSON.stringify({ ok: true, steps }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message, steps }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
