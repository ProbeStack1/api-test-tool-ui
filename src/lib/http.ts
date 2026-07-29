/**
 * HTTP client factory.
 * What : Creates a pre-configured axios instance per microservice.
 * Why  : Shared interceptors (auth header, error normalization, request id,
 *        401 → logout and redirect).
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
import { getIdToken } from './firebase';

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
  correlationId?: string;
}

/**
 * Helper to read a cookie by name.
 * Used for enterprise auth (ps_auth_token).
 */
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
};

/**
 * Auth header strategy:
 *   1. Enterprise cookie (ps_auth_token) – Highest priority for enterprise users.
 *   2. Try to get a fresh Firebase ID token from the current user.
 *   3. If no user, fall back to stored token (from Zustand) – though it might be stale.
 *   4. Dev‑bypass fallback (if enabled).
 */
const authHeader = async (): Promise<Record<string, string>> => {
  // STEP 1: Enterprise Cookie (Highest Priority)
  const enterpriseToken = getCookie('ps_auth_token');
  if (enterpriseToken) {
    return { Authorization: `Bearer ${enterpriseToken}` };
  }

  // STEP 2: Individual Firebase
  try {
    const token = await getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    // No authenticated Firebase user – fallback to stored token (if any)
    const stored = getAccessToken();
    if (stored) return { Authorization: `Bearer ${stored}` };
    if (env.devBypassAuth) return { 'X-Dev-Bypass': 'true' };
    return {};
  }
};

export const createHttp = (service: ServiceName): AxiosInstance => {
  const instance = axios.create({
    baseURL: serviceUrl(service),
    timeout: 30_000,
    headers: { 'Content-Type': 'application/json' },
  });

  // Re-resolve baseURL on every request — keeps env.ts as the single
  // source of truth even if a future hot-reload swaps it.
  instance.interceptors.request.use(async (config) => {
    config.baseURL = serviceUrl(service);
    config.headers.set('X-Correlation-Id', crypto.randomUUID());
    const headers = await authHeader();
    Object.entries(headers).forEach(([k, v]) => config.headers.set(k, v));
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

      // If we get a 401, the token is invalid/expired.
      // Clear auth and redirect to login (they will re-authenticate via Firebase).
      if (status === 401) {
        await clearAuth(); 
        // Only redirect if not already on login page.
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.assign('/login');
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
