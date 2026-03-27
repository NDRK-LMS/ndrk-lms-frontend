/**
 * Central API client for NDRK LMS frontend.
 * - Injects auth token from store
 * - Auto-refreshes on 401 using refresh token
 * - Redirects to login when both tokens are dead
 */

import { useAuthStore } from './auth-store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function getApiBase() {
  return API_BASE;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Prevent multiple simultaneous refresh calls
let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  const { refreshToken, setAuth, clearAuth } = useAuthStore.getState();
  if (!refreshToken) {
    clearAuth();
    return null;
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearAuth();
      return null;
    }

    const data = await res.json();
    setAuth({
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      message: undefined,
    });
    return data.accessToken as string;
  } catch {
    clearAuth();
    return null;
  }
}

function redirectToLogin() {
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/login')) {
    window.location.href = '/auth/login';
  }
}

type RequestInitWithAuth = RequestInit & { token?: string | null; _retried?: boolean };

async function request<T>(
  path: string,
  options: RequestInitWithAuth = {},
): Promise<T> {
  const { token, _retried, ...init } = options;
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...init, headers });

  // Handle 401 — try refresh token once
  if (res.status === 401 && token && !_retried) {
    // Deduplicate concurrent refresh calls
    if (!refreshPromise) {
      refreshPromise = tryRefreshToken().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;

    if (newToken) {
      // Retry the original request with the new token
      return request<T>(path, { ...options, token: newToken, _retried: true });
    }

    // Refresh failed — redirect to login
    redirectToLogin();
    throw new ApiError('Session expired. Please login again.', 401);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(err.message ?? res.statusText, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  async get<T>(path: string, token?: string | null): Promise<T> {
    return request<T>(path, { method: 'GET', token });
  },

  async post<T>(path: string, data?: unknown, token?: string | null): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      token,
    });
  },

  async put<T>(path: string, data?: unknown, token?: string | null): Promise<T> {
    return request<T>(path, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      token,
    });
  },

  async patch<T>(path: string, data?: unknown, token?: string | null): Promise<T> {
    return request<T>(path, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      token,
    });
  },

  async delete<T>(path: string, token?: string | null): Promise<T> {
    return request<T>(path, { method: 'DELETE', token });
  },
};
