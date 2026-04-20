// ============================================================================
// apiClient.js — REPLACE entire file contents with this
// ============================================================================
// What changed vs. the original:
//   • `USER_ID` is no longer a frozen string. It now reads from localStorage
//     (set by the "Start Testing" bootstrap flow in HomePage). Keeps the old
//     hardcoded value as a fallback so HTTP tab keeps working during dev even
//     if bootstrap didn't run yet.
//   • `USER_ID` is exported as BOTH a live getter **and** a string snapshot
//     so existing `import { USER_ID } from ...` usages keep working — axios
//     interceptor now reads the fresh value on every request.
// ============================================================================
import axios from 'axios';

// Base URL for production APIs
const BASE_API_URL = 'https://prod.forgeq.probestack.io';

// Safety net — if something reads USER_ID before the user has bootstrapped
// (e.g. a component mounts during the split-second before HomePage finishes
// the external lookup), we fall back to this seeded admin id. Replace with
// your own demo account if you prefer.
const FALLBACK_USER_ID = 'd9eb4239-0604-47f2-b990-efd3a6513b99';

/** Always-fresh read from localStorage. Used inside every interceptor. */
export const getUserId = () =>
  localStorage.getItem('userId') || FALLBACK_USER_ID;

// Back-compat: many modules do `import { USER_ID } from '../lib/apiClient'`.
// Keep it working by exporting the current value at import time. Anything
// that mutates localStorage after boot still hits the live getter inside
// the interceptor below, so header values stay correct even when the
// constant in a cached module is stale.
export const USER_ID = getUserId();

// Helper to add the X-User-Id interceptor to any axios instance
const addUserIdInterceptor = (instance) => {
  instance.interceptors.request.use(
    (config) => {
      const uid = getUserId();
      if (uid) config.headers['X-User-Id'] = uid;
      return config;
    },
    (error) => Promise.reject(error)
  );
};

// Create separate instances for each service
export const workspaceApi = axios.create({
  baseURL: `${BASE_API_URL}/api/v1/workspaces`,
  headers: { 'Content-Type': 'application/json' },
});
addUserIdInterceptor(workspaceApi);

export const collectionApi = axios.create({
  baseURL: `${BASE_API_URL}/api/v1/collections`,
  headers: { 'Content-Type': 'application/json' },
});
addUserIdInterceptor(collectionApi);

export const requestApi = axios.create({
  baseURL: `${BASE_API_URL}/api/v1/requests`,
  headers: { 'Content-Type': 'application/json' },
});
addUserIdInterceptor(requestApi);

export const environmentApi = axios.create({
  baseURL: `${BASE_API_URL}/api/v1/environments`,
  headers: { 'Content-Type': 'application/json' },
});
addUserIdInterceptor(environmentApi);

export const mockserverApi = axios.create({
  baseURL: `${BASE_API_URL}/api/v1/mocks`,
  headers: { 'Content-Type': 'application/json' },
});
addUserIdInterceptor(mockserverApi);

export const supportApi = axios.create({
  baseURL: `${BASE_API_URL}`,
  headers: { 'Content-Type': 'application/json' },
});
addUserIdInterceptor(supportApi);

export const userSettingApi = axios.create({
  baseURL: `${BASE_API_URL}`,
  headers: { 'Content-Type': 'application/json' },
});
addUserIdInterceptor(userSettingApi);

export const testFileApi = axios.create({
  baseURL: `${BASE_API_URL}/api/v1/test-files`,
  headers: { 'Content-Type': 'application/json' },
});
addUserIdInterceptor(testFileApi);

export const testSpecificationApi = axios.create({
  baseURL: `${BASE_API_URL}/api/v1/testspecs`,
  headers: { 'Content-Type': 'application/json' },
});
addUserIdInterceptor(testSpecificationApi);

export const dashboardApi = axios.create({
  baseURL: `${BASE_API_URL}`,
  headers: { 'Content-Type': 'application/json' },
});
addUserIdInterceptor(dashboardApi);

export const functionalTestApi = axios.create({
  baseURL: `${BASE_API_URL}/functional-tests`,
  headers: { 'Content-Type': 'application/json' },
});
addUserIdInterceptor(functionalTestApi);

export const loadTestApi = axios.create({
  baseURL: `${BASE_API_URL}/load-tests`,
  headers: { 'Content-Type': 'application/json' },
});
addUserIdInterceptor(loadTestApi);
