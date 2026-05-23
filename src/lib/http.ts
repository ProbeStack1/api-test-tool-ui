/**
 * HTTP client factory.
 * What : Creates a pre-configured axios instance per microservice.
 * Why  : Shared interceptors (auth header, error normalization, request id,
 *        401 → refresh-token rotation).
 * Usage: `const http = createHttp('workspace'); http.get('/api/v1/workspaces')`
 */

import axios, {
  type AxiosInstance,
  AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import { serviceUrl, env, type ServiceName } from './env';
import {
  getAccessToken,
  getRefreshToken,
  clearAuth,
  useAuth,
} from '@/stores/auth.store';

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
  correlationId?: string;
}

/**
 * Auth header strategy:
 *   1. If we have a real bearer token from auth.store, use it.
 *   2. Else, when VITE_DEV_BYPASS_AUTH=true, fall back to the
 *      ForgeqAuthFilter dev-bypass marker so the demo flow stays alive.
 *   3. Otherwise: no header — backend will 401.
 */
const authHeader = (): Record<string, string> => {
  const token = getAccessToken();
  if (token) return { Authorization: `Bearer ${token}` };
  if (env.devBypassAuth) return { 'X-Dev-Bypass': 'true' };
  return {};
};

// ─────────────────────────────────────────────────────────────────────────────
// Single in-flight refresh — prevents a thundering-herd of /refresh calls when
// 10 parallel requests all 401 at once.
// ─────────────────────────────────────────────────────────────────────────────
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  refreshInFlight = (async () => {
    try {
      const { userMgmtService } = await import('@/services/userMgmt.service');
      const pair = await userMgmtService.refresh(refreshToken);
      useAuth.getState().setSession(pair);
      return pair.accessToken;
    } catch {
      clearAuth();
      // Hard-redirect so the React tree resets cleanly.
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export const createHttp = (service: ServiceName): AxiosInstance => {
  const instance = axios.create({
    baseURL: serviceUrl(service),
    timeout: 30_000,
    headers: { 'Content-Type': 'application/json' },
  });

  // Re-resolve baseURL on every request — keeps env.ts as the single
  // source of truth even if a future hot-reload swaps it.
  instance.interceptors.request.use((config) => {
    config.baseURL = serviceUrl(service);
    config.headers.set('X-Correlation-Id', crypto.randomUUID());
    Object.entries(authHeader()).forEach(([k, v]) => config.headers.set(k, v));
    return config;
  });

  instance.interceptors.response.use(
    (res) => {
      // ForgeFuzz ResponseEnvelope — supports both shapes:
      //   Java   : { status: 'success'|'error'|'partial', code, message, data, meta, errors }
      //   Legacy : { success: boolean, data, message, timestamp }
      const d = res.data;
      if (d && typeof d === 'object' && 'data' in d &&
          ('status' in d || 'success' in d)) {
        res.data = (d as { data: unknown }).data;
      }
      return res;
    },
    async (error: AxiosError<any>) => {
      const body   = error.response?.data;
      const status = error.response?.status ?? 0;
      const code   = body?.code ?? body?.errorCode;

      // Single-shot retry on access-token expiry. We tag the config so we
      // never recurse, and we skip when there's nothing to refresh.
      const orig = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
      const isExpired = status === 401 && (code === 'AUTH_TOKEN_EXPIRED' || code === 'AUTH_TOKEN_INVALID');
      if (isExpired && orig && !orig._retried && getRefreshToken()) {
        orig._retried = true;
        const newToken = await refreshAccessToken();
        if (newToken) {
          orig.headers = orig.headers ?? {};
          (orig.headers as any).Authorization = `Bearer ${newToken}`;
          return instance.request(orig);
        }
      }

      const firstErrorMsg = Array.isArray(body?.errors) && body.errors.length
        ? (body.errors[0]?.message || body.errors[0]?.detail || body.errors[0]?.field)
        : undefined;
      const apiError: ApiError = {
        status,
        message:
          firstErrorMsg ??
          body?.message ??
          body?.error ??
          (typeof body === 'string' ? body : undefined) ??
          error.message ??
          'Unknown network error',
        code,
        correlationId: error.config?.headers?.get?.('X-Correlation-Id') as
          | string
          | undefined,
      };
      return Promise.reject(apiError);
    },
  );

  return instance;
};
