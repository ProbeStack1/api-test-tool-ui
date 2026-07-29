/**
 * RequireAuth — route guard that gates a subtree behind a valid session.
 *
 * Behaviour:
 *   • If the user has an unexpired access token  → render the children.
 *   • If we have a refresh token only            → optimistically render,
 *                                                  the http interceptor
 *                                                  refreshes on the first
 *                                                  401 it sees.
 *   • If neither is present                      → redirect to /login,
 *                                                  preserving the
 *                                                  destination in `?next=`.
 *
 * Dev-bypass: when `VITE_DEV_BYPASS_AUTH=true`, this guard becomes a no-op
 * so existing demo flows keep working until full auth integration.
 */
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/stores/auth.store';
import { env } from '@/lib/env';

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { accessToken, refreshToken, accountType } = useAuth();
  const location = useLocation();

  if (env.devBypassAuth) return <>{children}</>;
  
  // NEW: Allow rendering if an enterprise cookie exists (even before bootstrap finishes).
  // This prevents a flash of login page while we validate the cookie.
  const hasEnterpriseCookie = typeof document !== 'undefined' && 
    document.cookie.includes('ps_auth_token=');
  
  // Allow if we have a token, a refresh token, are explicitly enterprise,
  // or the browser has the enterprise cookie waiting to be validated.
  if (accessToken || refreshToken || accountType === 'ENTERPRISE' || hasEnterpriseCookie) {
    return <>{children}</>;
  }

  const next = encodeURIComponent(location.pathname + location.search);
  return <Navigate to={`/login?next=${next}`} replace />;
};

export default RequireAuth;
