import axios from 'axios';

// Helper to add the X-User-Id interceptor to any axios instance
const addUserIdInterceptor = (instance) => {
  instance.interceptors.request.use(
    (config) => {
      const userId = "d9eb4239-0604-47f2-b990-efd3a6513b99";
      if (userId) {
        config.headers['X-User-Id'] = userId;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
};

// Create separate instances for each service
export const workspaceApi = axios.create({
  baseURL: "https://prod.forgeq.probestack.io/api/v1/workspaces",
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(workspaceApi);

export const collectionApi = axios.create({
  baseURL: "https://prod.forgeq.probestack.io/api/v1/collections",
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(collectionApi);

export const requestApi = axios.create({
  baseURL: "https://prod.forgeq.probestack.io/api/v1/requests",
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(requestApi);

export const environmentApi = axios.create({
  baseURL: "https://prod.forgeq.probestack.io/api/v1/environments",
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(environmentApi);

export const mockserverApi = axios.create({
  baseURL: "https://prod.forgeq.probestack.io/api/v1/mocks",
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(mockserverApi);

export const supportApi = axios.create({
  baseURL: "https://prod.forgeq.probestack.io/api/v1/support",
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(supportApi);

export const userSettingApi = axios.create({
  baseURL: "https://prod.forgeq.probestack.io/api/v1/settings",
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(userSettingApi);

export const testFileApi = axios.create({
  baseURL: "https://prod.forgeq.probestack.io/api/v1/test-files",
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(testFileApi);

export const testSpecificationApi = axios.create({
  baseURL: "https://prod.forgeq.probestack.io/api/v1/test-specs",
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(testSpecificationApi);

export const dashboardApi = axios.create({
  baseURL: "https://prod.forgeq.probestack.io/api/v1/dashboard"
});
addUserIdInterceptor(dashboardApi);

// Relative-URL clients — routed via Vite dev proxy (or nginx in prod)
export const functionalTestApi = axios.create({
  baseURL: '/api/v1/functional-tests',
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(functionalTestApi);

export const loadTestApi = axios.create({
  baseURL: '/api/v1/load-tests',
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(loadTestApi);