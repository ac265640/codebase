import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api',
  withCredentials: true,
  timeout: 120_000, // 2 min — embed calls can be slow on Render cold start
});

let refreshing = false;
let queue: Array<() => void> = [];

api.interceptors.response.use(
  res => res,
  async error => {
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
