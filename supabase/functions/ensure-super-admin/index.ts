// Idempotente: garante que existe o usuário super admin (admin@rotiflow.app / Adm@1100)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPER_EMAIL = 'admin@rotiflow.app';
const SUPER_PASSWORD = 'Adm@1100';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1) Garantir empresa "Plataforma" para o super admin
    let { data: platformCo } = await admin.from('companies').select('*').eq('email_domain', 'rotiflow.app').maybeSingle();
    if (!platformCo) {
      const { data: created } = await admin.from('companies').insert({ name: 'Plataforma RotiFlow', email_domain: 'rotiflow.app' }).select().single();
      platformCo = created;
    }

    // 2) Procurar usuário existente
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    let user = list.users.find(u => u.email?.toLowerCase() === SUPER_EMAIL);

    if (!user) {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: SUPER_EMAIL, password: SUPER_PASSWORD, email_confirm: true,
        user_metadata: { full_name: 'Super Admin' },
      });
      if (cErr) throw cErr;
      user = created.user;

      // Como o trigger handle_new_user exige convite, criamos profile + role manualmente
      await admin.from('profiles').insert({
        user_id: user!.id, company_id: platformCo!.id,
        email: SUPER_EMAIL, full_name: 'Super Admin',
      });
    } else {
      // Garantir senha consistente
      await admin.auth.admin.updateUserById(user.id, { password: SUPER_PASSWORD, email_confirm: true });
      const { data: prof } = await admin.from('profiles').select('id').eq('user_id', user.id).maybeSingle();
      if (!prof) {
        await admin.from('profiles').insert({
          user_id: user.id, company_id: platformCo!.id,
          email: SUPER_EMAIL, full_name: 'Super Admin',
        });
      }
    }

    // 3) Garantir role super_admin
    const { data: existingRole } = await admin.from('user_roles')
      .select('id').eq('user_id', user!.id).eq('role', 'super_admin').maybeSingle();
    if (!existingRole) {
      await admin.from('user_roles').insert({
        user_id: user!.id, company_id: platformCo!.id, role: 'super_admin',
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
