import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  isEmailVerified?: boolean;
  googleId?: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser, accessToken?: string, refreshToken?: string) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setUser: (user, accessToken, refreshToken) => set(state => ({
        user,
        accessToken: accessToken !== undefined ? accessToken : state.accessToken,
        refreshToken: refreshToken !== undefined ? refreshToken : state.refreshToken,
        isAuthenticated: true,
      })),
      clearUser: () => set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    { name: 'codebase-auth' }
  )
);
