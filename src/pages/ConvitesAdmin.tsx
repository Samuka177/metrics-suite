import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Copy, Mail, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Invitation {
  id: string; email: string; role: string; token: string;
  accepted_at: string | null; expires_at: string; created_at: string;
}

export default function ConvitesAdmin() {
  const { profile, isAdmin, company } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [list, setList] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!profile) return;
    const { data } = await supabase.from('invitations')
      .select('*').eq('company_id', profile.company_id)
      .order('created_at', { ascending: false });
    setList((data || []) as Invitation[]);
  };

  useEffect(() => { load(); }, [profile?.company_id]);

  if (!isAdmin) return <Navigate to="/" replace />;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);

    // Garantir que e-mail é do mesmo domínio da empresa
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (emailDomain !== company?.email_domain) {
      toast.error(`O e-mail deve ser do domínio @${company?.email_domain}`);
      setLoading(false); return;
    }

    const { error } = await supabase.from('invitations').insert({
      company_id: profile.company_id,
      email: email.toLowerCase(),
      role,
      invited_by: profile.user_id,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Convite criado! Compartilhe o link com o usuário.');
    setEmail(''); load();
  };

  const remover = async (id: string) => {
    await supabase.from('invitations').delete().eq('id', id);
    load();
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/signup?invite=${token}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  };

  return (
    <div className="min-h-screen bg-background p-4 max-w-2xl mx-auto">
      <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Link>

      <h1 className="text-2xl font-bold mb-1">Convites</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Empresa: <strong>{company?.name}</strong> · Domínio: <strong>@{company?.email_domain}</strong>
      </p>

      <Card className="mb-4">
        <CardContent className="p-4">
          <form onSubmit={enviar} className="space-y-3">
            <div>
              <label className="text-sm font-medium">E-mail</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder={`usuario@${company?.email_domain}`} required />
            </div>
            <div>
              <label className="text-sm font-medium">Papel</label>
              <select value={role} onChange={e => setRole(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border bg-background">
                <option value="member">Membro</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              <Mail className="h-4 w-4 mr-1" /> {loading ? 'Criando...' : 'Criar convite'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {list.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum convite ainda.</p>}
        {list.map(inv => {
          const expirado = new Date(inv.expires_at) < new Date();
          return (
            <Card key={inv.id}>
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.role} · {inv.accepted_at ? '✓ Aceito' : expirado ? '⚠ Expirado' : 'Pendente'}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {!inv.accepted_at && !expirado && (
                    <Button size="sm" variant="outline" onClick={() => copyLink(inv.token)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remover(inv.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
