/**
 * Central API client for NDRK LMS frontend.
 * Uses auth token from store for authenticated requests.
 */

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

type RequestInitWithAuth = RequestInit & { token?: string | null };

async function request<T>(
  path: string,
  options: RequestInitWithAuth = {},
): Promise<T> {
  const { token, ...init } = options;
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...init, headers });
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