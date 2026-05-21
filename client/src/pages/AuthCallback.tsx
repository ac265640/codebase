import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const token = params.get('token');

    async function handleCallback() {
      try {
        // Fetch user info — cookie may or may not work, but we have the token
        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        const res = await api.get('/auth/me', { headers });

        // Store user + token in auth store
        useAuthStore.getState().setUser(res.data, token || undefined);

        navigate('/dashboard', { replace: true });
      } catch (err) {
        console.error('OAuth Callback hydration failed:', err);
        navigate('/login?error=oauth_failed', { replace: true });
      }
    }

    handleCallback();
  }, [navigate, params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-zinc-400 text-sm">Signing you in...</p>
      </div>
    </div>
  );
}
