import axios from 'axios';

// Axios instance for internal backend service calls.
// Injects X-User-Id header from localStorage on every request.
// If no user ID is present the request is still sent — the backend
// will reject it with 401/403, but we never throw from the interceptor
// so the caller's .catch() handles it normally.
const apiClient = axios.create();

apiClient.interceptors.request.use(
  (config) => {
    const userId = localStorage.getItem('probestack_user_id');
    if (userId) {
      config.headers['X-User-Id'] = userId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
