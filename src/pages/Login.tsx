import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Lock, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const SUPER_EMAIL = 'admin@rotiflow.app';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/', { replace: true });
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Atalho do super admin: usuário "admin" é mapeado para admin@rotiflow.app
    const loginEmail = email.trim().toLowerCase() === 'admin' ? SUPER_EMAIL : email.trim();
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    setLoading(false);
    if (error) {
      toast.error(error.message === 'Invalid login credentials' ? 'Usuário ou senha incorretos.' : error.message);
      return;
    }
    toast.success('Login realizado!');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-primary/5 to-background">
      <div className="card-surface p-8 rounded-xl w-full max-w-md space-y-6 fade-in">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-bold text-foreground">RotiFlow</h1>
          <p className="text-sm text-muted-foreground text-center">
            Sistema de Roteirização e Gestão de Entregas
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Usuário ou e-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="text" placeholder="admin ou seu@empresa.com.br" value={email}
                onChange={e => setEmail(e.target.value)} className="pl-10" required autoComplete="username" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} className="pl-10" required autoComplete="current-password" />
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          O acesso é criado pelo administrador da plataforma. Solicite suas credenciais.
        </p>
      </div>
    </div>
  );
}
