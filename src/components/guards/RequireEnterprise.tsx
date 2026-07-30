import { Navigate } from 'react-router-dom';
import { useAuth } from '@/stores/auth.store';

export const RequireEnterprise = ({ children }: { children: React.ReactNode }) => {
  const { accountType, isAuthenticated } = useAuth();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (accountType !== 'ENTERPRISE') {
    return <Navigate to="/projects/manage" replace />;
  }

  return children;
};