import axios from 'axios';

// Base URL for production APIs
const BASE_API_URL = 'https://prod.forgeq.probestack.io';
export const USER_ID = "d9eb4239-0604-47f2-b990-efd3a6513b99"; // Hardcoded user ID for now

// Helper to add the X-User-Id interceptor to any axios instance
const addUserIdInterceptor = (instance) => {
  instance.interceptors.request.use(
    (config) => {
      const userId = USER_ID;
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
  baseURL: `${BASE_API_URL}/api/v1/workspaces`,
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(workspaceApi);

export const collectionApi = axios.create({
  baseURL: `${BASE_API_URL}/api/v1/collections`,
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(collectionApi);

export const requestApi = axios.create({
  baseURL: `${BASE_API_URL}/api/v1/requests`,
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(requestApi);

export const environmentApi = axios.create({
  baseURL: `${BASE_API_URL}/api/v1/environments`,
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(environmentApi);

// Mock server API (was using double quotes)
export const mockserverApi = axios.create({
  baseURL: `${BASE_API_URL}/api/v1/mocks`,
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(mockserverApi);

export const supportApi = axios.create({
  baseURL: `${BASE_API_URL}`,
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(supportApi);

export const userSettingApi = axios.create({
  baseURL: `${BASE_API_URL}`,
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(userSettingApi);

export const testFileApi = axios.create({
  baseURL: `${BASE_API_URL}/api/v1/test-files`,
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(testFileApi);

export const testSpecificationApi = axios.create({
  baseURL: `${BASE_API_URL}/api/v1/test-specs`,
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(testSpecificationApi);

export const dashboardApi = axios.create({
  baseURL: `${BASE_API_URL}`,
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(dashboardApi);

export const functionalTestApi = axios.create({
  baseURL: `${BASE_API_URL}/functional-tests`,
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(functionalTestApi);

export const loadTestApi = axios.create({
  baseURL: `${BASE_API_URL}/load-tests`,
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(loadTestApi);