import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div className="space-y-3 max-w-md">
          <p className="text-foreground font-medium">Sua conta ainda não está vinculada a uma empresa.</p>
          <p className="text-sm text-muted-foreground">
            Aguarde alguns segundos e recarregue, ou peça um convite ao administrador da sua empresa.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
