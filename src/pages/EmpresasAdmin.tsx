import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Building2, Plus, UserPlus, RefreshCw, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface Company { id: string; name: string; email_domain: string; created_at: string }

export default function EmpresasAdmin() {
  const { isSuperAdmin } = useAuth();
  if (!isSuperAdmin) return <Navigate to="/" replace />;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [openNew, setOpenNew] = useState(false);
  const [openUser, setOpenUser] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // form empresa
  const [cName, setCName] = useState('');
  const [cDomain, setCDomain] = useState('');
  const [aEmail, setAEmail] = useState('');
  const [aName, setAName] = useState('');
  const [aPass, setAPass] = useState('');

  // form usuário
  const [uEmail, setUEmail] = useState('');
  const [uName, setUName] = useState('');
  const [uPass, setUPass] = useState('');
  const [uRole, setURole] = useState<'admin' | 'member'>('member');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
    setCompanies((data || []) as Company[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const createCompany = async () => {
    if (!cName || !cDomain || !aEmail || !aPass) { toast.error('Preencha todos os campos'); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('admin-actions', {
      body: { action: 'create_company_with_admin',
        company_name: cName, email_domain: cDomain.toLowerCase().replace(/^@/, ''),
        admin_email: aEmail, admin_password: aPass, admin_name: aName,
      },
    });
    setBusy(false);
    if (error || data?.error) { toast.error((error?.message) || data?.error || 'Erro'); return; }
    toast.success('Empresa criada com administrador.');
    setOpenNew(false);
    setCName(''); setCDomain(''); setAEmail(''); setAName(''); setAPass('');
    load();
  };

  const createUser = async () => {
    if (!openUser || !uEmail || !uPass) { toast.error('Preencha e-mail e senha'); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('admin-actions', {
      body: { action: 'create_user_for_company',
        company_id: openUser.id, email: uEmail, password: uPass,
        full_name: uName, role: uRole,
      },
    });
    setBusy(false);
    if (error || data?.error) { toast.error((error?.message) || data?.error || 'Erro'); return; }
    toast.success('Usuário criado.');
    setUEmail(''); setUName(''); setUPass(''); setURole('member');
    setOpenUser(null);
  };

  return (
    <div className="space-y-4 fade-in pb-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>
      </Button>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Building2 className="h-5 w-5" /> Empresas</h1>
          <p className="text-xs text-muted-foreground">Gestão de empresas e usuários (super admin)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" onClick={() => setOpenNew(true)}><Plus className="h-4 w-4 mr-1" /> Nova empresa</Button>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent></Card>
      ) : companies.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma empresa cadastrada.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {companies.map(c => (
            <Card key={c.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">@{c.email_domain}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setOpenUser(c)}>
                  <UserPlus className="h-4 w-4 mr-1" /> Novo usuário
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova empresa + administrador</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs">Nome da empresa</label><Input value={cName} onChange={e => setCName(e.target.value)} /></div>
            <div><label className="text-xs">Domínio do e-mail (ex: empresaa.com.br)</label><Input value={cDomain} onChange={e => setCDomain(e.target.value)} /></div>
            <div className="border-t pt-3 space-y-3">
              <p className="text-xs font-medium">Administrador inicial</p>
              <div><label className="text-xs">E-mail</label><Input type="email" value={aEmail} onChange={e => setAEmail(e.target.value)} /></div>
              <div><label className="text-xs">Nome</label><Input value={aName} onChange={e => setAName(e.target.value)} /></div>
              <div><label className="text-xs">Senha</label><Input type="password" value={aPass} onChange={e => setAPass(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
            <Button onClick={createCompany} disabled={busy}>{busy ? 'Criando...' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openUser} onOpenChange={() => setOpenUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo usuário em {openUser?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs">E-mail</label><Input type="email" value={uEmail} onChange={e => setUEmail(e.target.value)} placeholder={`usuario@${openUser?.email_domain}`} /></div>
            <div><label className="text-xs">Nome</label><Input value={uName} onChange={e => setUName(e.target.value)} /></div>
            <div><label className="text-xs">Senha</label><Input type="password" value={uPass} onChange={e => setUPass(e.target.value)} /></div>
            <div>
              <label className="text-xs">Papel</label>
              <select value={uRole} onChange={e => setURole(e.target.value as any)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="member">Membro</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenUser(null)}>Cancelar</Button>
            <Button onClick={createUser} disabled={busy}>{busy ? 'Criando...' : 'Criar usuário'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
