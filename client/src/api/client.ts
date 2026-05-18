import axios from 'axios';

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
      await axios.post(
        import.meta.env.VITE_API_URL + '/api/auth/refresh',
        {},
        { withCredentials: true }
      );
      queue.forEach(fn => fn());
      queue = [];
      return api(error.config);
    } catch {
      queue = [];
      window.location.href = '/login';
    } finally {
      refreshing = false;
    }
  }
);

export default api;
