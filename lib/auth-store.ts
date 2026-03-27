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
  isAccessTokenExpired: () => boolean;
};

/**
 * Decode JWT payload without a library.
 * Returns the parsed payload or null if invalid.
 */
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
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
      isAccessTokenExpired: () => {
        const token = get().accessToken;
        if (!token) return true;
        const payload = decodeJwtPayload(token);
        if (!payload?.exp) return true;
        // Expired if less than 30 seconds remaining (buffer)
        return payload.exp * 1000 < Date.now() + 30_000;
      },
    }),
    {
      name: 'ndrk-auth',
      onRehydrateStorage: () => (state) => {
        if (state) {
          (state as any).hydrated = true;
        }
      },
    },
  ),
);
