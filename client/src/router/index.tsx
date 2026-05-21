import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Settings from '../pages/Settings';

import AuthCallback from '../pages/AuthCallback';
import GuestRepoPage from '../pages/GuestRepoPage';

function Protected({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

// Hydrates the Zustand auth store from the server cookies or URL fallback on every fresh page load.
// This is critical for Google OAuth which redirects the browser, clearing in-memory state.
function AuthHydration({ children }: { children: React.ReactNode }) {
  const { setUser, clearUser } = useAuthStore();
  const [isHydrating, setIsHydrating] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return !!(params.get('access_token') && params.get('refresh_token'));
  });

  useEffect(() => {
    // 1. Check if tokens are present in URL search params (from cross-origin Google OAuth redirect)
    const params = new URLSearchParams(window.location.search);
    const urlAccess = params.get('access_token');
    const urlRefresh = params.get('refresh_token');

    if (urlAccess && urlRefresh) {
      // Fetch /auth/me to verify user details using these parameters
      api.get('/auth/me', {
        headers: { Authorization: `Bearer ${urlAccess}` }
      })
      .then(res => {
        // Save the authenticated user and tokens to our persistent Zustand store
        useAuthStore.getState().setUser(res.data, urlAccess, urlRefresh);
        // Instant URL clean up
        window.history.replaceState({}, document.title, window.location.pathname);
      })
      .catch(() => {
        clearUser();
      })
      .finally(() => {
        setIsHydrating(false);
      });
      return;
    }

        const anonymousPaths = ['/login', '/register', '/auth/callback', '/'];
    if (window.location.pathname.startsWith('/guest/') || anonymousPaths.includes(window.location.pathname)) {
      return;
    }
    
    api.get('/auth/me')
      .then(res => setUser(res.data))
      .catch(() => clearUser());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isHydrating) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-100 p-4">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-zinc-400 font-medium tracking-wide animate-pulse">Completing Google authentication...</p>
      </div>
    );
  }

  return <>{children}</>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthHydration>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/guest/:repoSlug" element={<GuestRepoPage />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/settings" element={<Protected><Settings /></Protected>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthHydration>
    </BrowserRouter>
  );
}
