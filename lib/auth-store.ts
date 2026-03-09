'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl?: string | null;
  mfaEnabled?: boolean;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  message: string | null;
  hydrated: boolean;
  setAuth: (data: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
    message?: string;
  }) => void;
  clearAuth: () => void;
  clearWelcomeMessage: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      message: null,
      hydrated: false,
      setAuth: (data) =>
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          message: data.message ?? null,
        }),
      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          message: null,
        }),
      clearWelcomeMessage: () => set({ message: null }),
    }),
    {
      name: 'ndrk-auth',
      // This runs after state is restored from localStorage
      onRehydrateStorage: () => (state) => {
        if (state) {
          // we can call set on the store via the `state` arg in persist v5
          (state as any).hydrated = true;
        }
      },
    },
  ),
);