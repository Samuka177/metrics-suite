import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function Signup() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Se houver convite, validar e-mail bate
    if (inviteToken) {
      const { data: inv } = await supabase
        .from('invitations')
        .select('email,expires_at,accepted_at')
        .eq('token', inviteToken)
        .maybeSingle();
      if (!inv) {
        toast.error('Convite inválido ou expirado.');
        setLoading(false); return;
      }
      if (inv.accepted_at) {
        toast.error('Este convite já foi utilizado.');
        setLoading(false); return;
      }
      if (new Date(inv.expires_at) < new Date()) {
        toast.error('Convite expirado.');
        setLoading(false); return;
      }
      if (inv.email.toLowerCase() !== email.toLowerCase()) {
        toast.error(`Use o e-mail do convite: ${inv.email}`);
        setLoading(false); return;
      }
    }

    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName },
      },
    });

    setLoading(false);
    if (error) {
      toast.error(error.message.includes('requer convite')
        ? 'Esta empresa já existe. Peça um convite ao administrador.'
        : error.message);
      return;
    }
    toast.success('Conta criada! Faça login.');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-primary/5 to-background">
      <div className="card-surface p-8 rounded-xl w-full max-w-md space-y-6 fade-in">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">RotiFlow</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {inviteToken ? 'Aceitar convite' : 'Cadastrar nova empresa'}
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome completo</label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">E-mail corporativo</label>
            <Input type="email" placeholder="voce@suaempresa.com.br" value={email}
              onChange={e => setEmail(e.target.value)} required />
            {!inviteToken && (
              <p className="text-xs text-muted-foreground">
                Sua empresa será identificada pelo domínio do e-mail.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Senha</label>
            <Input type="password" minLength={8} value={password}
              onChange={e => setPassword(e.target.value)} required />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Criando conta...' : 'Criar conta'}
          </Button>
        </form>

        <p className="text-center text-sm">
          <Link to="/login" className="text-primary hover:underline">Já tenho conta</Link>
        </p>
      </div>
    </div>
  );
}
