import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';
import Landing from '../pages/Landing';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Settings from '../pages/Settings';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';

function Protected({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

// Hydrates the Zustand auth store from the server cookie on every fresh page load.
// This is critical for Google OAuth which redirects the browser, clearing in-memory state.
function AuthHydration({ children }: { children: React.ReactNode }) {
  const { setUser, clearUser } = useAuthStore();
  const anonymousPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/'];

  useEffect(() => {
    if (anonymousPaths.includes(window.location.pathname)) {
      return;
    }
    api.get('/auth/me')
      .then(res => setUser(res.data))
      .catch(() => clearUser());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/settings" element={<Protected><Settings /></Protected>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthHydration>
    </BrowserRouter>
  );
}
