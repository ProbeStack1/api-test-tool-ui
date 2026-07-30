import { Navigate } from 'react-router-dom';
import { useAuth } from '@/stores/auth.store';

export const RequireIndividual = ({ children }: { children: React.ReactNode }) => {
  const { accountType, isAuthenticated } = useAuth();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (accountType !== 'INDIVIDUAL') {
    return <Navigate to="/onboarding/bu" replace />;
  }

  return children;
};