import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthUser {
  id: string;
  username: string;
  display_name: string | null;
  role: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        localStorage.setItem('auth_token', token);
        set({ token, user });
      },
      logout: () => {
        localStorage.removeItem('auth_token');
        set({ token: null, user: null });
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
    }
  )
);
