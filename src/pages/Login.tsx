import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Lock, Mail } from 'lucide-react';
import logoTuratti from '@/assets/LogoTuratti.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      if (email === 'admin@turatti.com.br' && password === 'Adm@1100') {
        sessionStorage.setItem('logidash_auth', 'true');
        toast.success('Login realizado com sucesso!');
        navigate('/');
      } else {
        toast.error('E-mail ou senha incorretos.');
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card-surface p-8 rounded-xl w-full max-w-md space-y-6 fade-in">
        <div className="flex flex-col items-center gap-4">
          <img src={logoTuratti} alt="Turatti Cervejaria" className="h-16 w-auto" />
          <h1 className="text-xl font-bold text-foreground">LogiDash — Acesso</h1>
          <p className="text-sm text-muted-foreground text-center">
            Faça login para acessar o painel de vendas e logística.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="admin@turatti.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
