import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api',
  withCredentials: true,
  timeout: 120_000, // 2 min — embed calls can be slow on Render cold start
});

let refreshing = false;
let queue: Array<() => void> = [];
let slowRequestTimer: ReturnType<typeof setTimeout> | null = null;

api.interceptors.request.use(config => {
  slowRequestTimer = setTimeout(() => {
    window.dispatchEvent(new CustomEvent('api-slow'));
  }, 5000);

  // Inject Authorization: Bearer token if it exists in the Zustand store
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  res => { 
    if (slowRequestTimer) clearTimeout(slowRequestTimer); 
    return res; 
  },
  async error => {
    if (slowRequestTimer) clearTimeout(slowRequestTimer);
    if (error.response?.status !== 401 || error.config._retry) {
      return Promise.reject(error);
    }
    if (refreshing) {
      return new Promise(resolve => {
        queue.push(() => resolve(api(error.config)));
      });
    }
    refreshing = true;
    error.config._retry = true;
    try {
      const state = useAuthStore.getState();
      const res = await axios.post(
        import.meta.env.VITE_API_URL + '/api/auth/refresh',
        { refreshToken: state.refreshToken },
        { withCredentials: true }
      );
      
      const { accessToken: newAccess, refreshToken: newRefresh } = res.data;
      
      // Update store with new tokens
      state.setUser(state.user!, newAccess, newRefresh);
      
      // Retry the failed request with the new access token
      error.config.headers.Authorization = `Bearer ${newAccess}`;
      
      queue.forEach(fn => fn());
      queue = [];
      return api(error.config);
    } catch {
      queue = [];
      useAuthStore.getState().clearUser();
      window.location.href = '/login';
    } finally {
      refreshing = false;
    }
  }
);

export default api;
