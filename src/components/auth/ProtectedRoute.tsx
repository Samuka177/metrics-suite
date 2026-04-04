import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuth = sessionStorage.getItem('logidash_auth') === 'true';
  if (!isAuth) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
