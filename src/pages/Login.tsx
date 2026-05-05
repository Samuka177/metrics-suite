import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Lock, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
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
            <label className="text-sm font-medium text-foreground">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="email" placeholder="seu@empresa.com.br" value={email}
                onChange={e => setEmail(e.target.value)} className="pl-10" required />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} className="pl-10" required />
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>
            <Link to="/signup" className="text-primary hover:underline">
              Cadastrar nova empresa
            </Link>
          </p>
          <p className="text-xs">
            Foi convidado? Use o link recebido por e-mail.
          </p>
        </div>
      </div>
    </div>
  );
}
