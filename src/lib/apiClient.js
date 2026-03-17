import axios from 'axios';

// Helper to add the X-User-Id interceptor to any axios instance
const addUserIdInterceptor = (instance) => {
  instance.interceptors.request.use(
    (config) => {
      const userId = localStorage.getItem('probestack_user_id');
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
  baseURL: "http://localhost:8080",
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(workspaceApi);

export const collectionApi = axios.create({
  baseURL: "http://localhost:8081",
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(collectionApi);

export const requestApi = axios.create({
  baseURL: "http://localhost:8082",
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(requestApi);

export const environmentApi = axios.create({
  baseURL: "http://localhost:8083",
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(environmentApi);

export const mockserverApi = axios.create({
  baseURL: "http://localhost:8084",
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(mockserverApi);

export const supportApi = axios.create({
  baseURL: "http://localhost:8085",
  headers: { 'Content-Type': 'application/json' }
});
addUserIdInterceptor(supportApi);

export const userSettingApi = axios.create({
  baseURL: "http://localhost:8086"
});
addUserIdInterceptor(userSettingApi);

export const testFileApi = axios.create({
  baseURL: "http://localhost:8087"
});
addUserIdInterceptor(testFileApi);

export const testSpecificationApi = axios.create({
  baseURL: "http://localhost:8088"
});
addUserIdInterceptor(testSpecificationApi);

export const dashboardApi = axios.create({
  baseURL: "http://localhost:8089"
});
addUserIdInterceptor(dashboardApi);