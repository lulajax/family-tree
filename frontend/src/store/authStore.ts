import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getStoredToken, logout as clearAuthToken, me } from '../api/auth';
import type { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  isHydrating: boolean;
  setAuth: (token: string, user: User) => void;
  hydrateCurrentUser: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isHydrating: false,
      setAuth: (token, user) => {
        localStorage.setItem('auth_token', token);
        set({ token, user });
      },
      hydrateCurrentUser: async () => {
        const token = getStoredToken();
        if (!token) {
          set({ token: null, user: null, isHydrating: false });
          return;
        }

        set({ token, isHydrating: true });
        try {
          const user = await me();
          if (!user) {
            clearAuthToken();
            set({ token: null, user: null, isHydrating: false });
            return;
          }
          set({ token, user, isHydrating: false });
        } catch {
          clearAuthToken();
          set({ token: null, user: null, isHydrating: false });
        }
      },
      logout: () => {
        clearAuthToken();
        set({ token: null, user: null, isHydrating: false });
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
    }
  )
);
