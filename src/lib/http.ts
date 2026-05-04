/**
 * HTTP client factory.
 * What : Creates a pre-configured axios instance per microservice.
 * Why  : Shared interceptors (auth header, error normalization, request id).
 * Usage: `const http = createHttp('workspace'); http.get('/api/v1/workspaces')`
 */

import axios, { type AxiosInstance, AxiosError } from 'axios';
import { serviceUrl, env, type ServiceName } from './env';

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
  correlationId?: string;
}

const authHeader = (): Record<string, string> => {
  // TODO (Phase 1 auth): replace with real JWT from auth.store
  if (env.devBypassAuth) return { 'X-Dev-Bypass': 'true' };
  return {};
};

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
      // ForgeQ ResponseEnvelope — supports both shapes:
      //   Java   : { status: 'success'|'error'|'partial', code, message, data, meta, errors }
      //   Legacy : { success: boolean, data, message, timestamp }
      const d = res.data;
      if (d && typeof d === 'object' && 'data' in d &&
          ('status' in d || 'success' in d)) {
        res.data = (d as { data: unknown }).data;
      }
      return res;
    },
    (error: AxiosError<any>) => {
      // Java sends ResponseEnvelope on errors too: { status:'error', message, code, errors }.
      // Surface the most specific human-readable message we can find so toasts
      // are actionable instead of "Something went wrong".
      const body = error.response?.data;
      const firstErrorMsg = Array.isArray(body?.errors) && body.errors.length
        ? (body.errors[0]?.message || body.errors[0]?.detail || body.errors[0]?.field)
        : undefined;
      const apiError: ApiError = {
        status: error.response?.status ?? 0,
        message:
          firstErrorMsg ??
          body?.message ??
          body?.error ??
          (typeof body === 'string' ? body : undefined) ??
          error.message ??
          'Unknown network error',
        code: body?.code ?? body?.errorCode,
        correlationId: error.config?.headers?.get?.('X-Correlation-Id') as
          | string
          | undefined,
      };
      return Promise.reject(apiError);
    },
  );

  return instance;
};
