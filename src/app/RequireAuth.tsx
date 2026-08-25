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
  const { accessToken, refreshToken, accountType, isBootstrapping } = useAuth();
  const location = useLocation();

  if (env.devBypassAuth) return <>{children}</>;

  // `ps_auth_token` is HttpOnly now — we can no longer peek at its
  // presence via `document.cookie` to avoid a login-page flash while an
  // enterprise session is still being validated. The only reliable check
  // is the actual `/me` bootstrap call (see auth.store.ts), so wait for
  // it to resolve instead of guessing from a cookie we can't see anymore.
  if (isBootstrapping) {
    return null;
  }

  // Allow if we have a token, a refresh token, or are explicitly enterprise
  // (set by a successful bootstrap /me call).
  if (accessToken || refreshToken || accountType === 'ENTERPRISE') {
    return <>{children}</>;
  }

  const next = encodeURIComponent(location.pathname + location.search);
  return <Navigate to={`/login?next=${next}`} replace />;
};

export default RequireAuth;
