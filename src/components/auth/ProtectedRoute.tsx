import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type RequiredRole = 'admin' | 'super_admin';

export default function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: RequiredRole;
}) {
  const { user, profile, isAdmin, isSuperAdmin, loading } = useAuth();

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
  if (requiredRole === 'super_admin' && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }
  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
