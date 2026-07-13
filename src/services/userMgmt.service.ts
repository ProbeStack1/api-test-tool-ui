/**
 * userMgmt.service — thin wrapper over the {@code forgeq-test-user-mgmt-svc}
 * REST surface. Each call returns the unwrapped {@code data} from the
 * server's {@link ResponseEnvelope}.
 *
 * Endpoint contract: see backend `docs/ENDPOINTS.md`.
 *
 * NOTE: We deliberately use a SEPARATE axios instance (not `createHttp`) so
 * the login / register flow never sends a stale bearer token and the
 * /refresh call doesn't recurse through the 401-refresh interceptor.
 */
import axios from 'axios';
import { serviceUrl } from '@/lib/env';
import type { UserView } from '@/stores/auth.store';

const userMgmtHttp = axios.create({
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// Re-resolve base URL on every request (env may hot-reload).
userMgmtHttp.interceptors.request.use((c) => {
  c.baseURL = serviceUrl('userMgmt');
  return c;
});

// Unwrap the ResponseEnvelope and surface a clean error.
userMgmtHttp.interceptors.response.use(
  (res) => {
    const d = res.data;
    if (d && typeof d === 'object' && 'data' in d && 'status' in d) {
      res.data = (d as { data: unknown }).data;
    }
    return res;
  },
  (err) => {
    const body = err.response?.data;
    return Promise.reject({
      status: err.response?.status ?? 0,
      code: body?.code,
      message: body?.message ?? err.message ?? 'Network error',
      errors: Array.isArray(body?.errors) ? body.errors : [],
    });
  },
);

export interface TokenPair {
  accessToken: string;
  tokenType: string;
  expiresInSec: number;
  refreshToken: string;
  user: UserView;
}

export const userMgmtService = {
  //  CHANGED: register now expects userId (Firebase UID) and no password.
  register: (req: { userId: string; email: string; firstName?: string; lastName?: string }) =>
    userMgmtHttp.post<UserView>('/api/v1/users/register', req).then((r) => r.data),

  //  REMOVED: login and refresh are deprecated (handled by Firebase SDK).
  // login: ...   // removed
  // refresh: ... // removed

  //  logout still calls backend (no‑op) but we can keep it.
  logout: (refreshToken: string, accessToken: string) =>
    userMgmtHttp.post<void>('/api/v1/users/logout', { refreshToken }, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.data),

  //  me – used after login to fetch full user profile from MongoDB.
  me: (accessToken: string) =>
    userMgmtHttp.get<UserView>('/api/v1/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.data),

  verifyEmail: (token: string) =>
    userMgmtHttp.post<UserView>('/api/v1/users/verify-email', { token }).then((r) => r.data),

  resendVerification: (email: string) =>
    userMgmtHttp.post<void>('/api/v1/users/resend-verification', { email }).then((r) => r.data),

  forgotPassword: (email: string) =>
    userMgmtHttp.post<void>('/api/v1/users/forgot-password', { email }).then((r) => r.data),

  resetPassword: (token: string, newPassword: string) =>
    userMgmtHttp.post<void>('/api/v1/users/reset-password', { token, newPassword }).then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string, accessToken: string) =>
    userMgmtHttp.post<void>('/api/v1/users/change-password', { currentPassword, newPassword }, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.data),
};
