'use client';

/**
 * Cliente HTTP do dashboard com gestão de tokens (access + refresh) — Req 1/2/3.
 * Tokens persistidos em localStorage; refresh automático em 401.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

const ACCESS_KEY = 'vs_access';
const REFRESH_KEY = 'vs_refresh';
const SUBDOMAIN_KEY = 'vs_subdomain';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}

function setTokens(tokens: Tokens) {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function getSubdomain(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SUBDOMAIN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(SUBDOMAIN_KEY);
}

export interface RegisterInput {
  companyName: string;
  subdomain: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
}

/** Cadastra a empresa + Owner e já faz login. */
export async function register(input: RegisterInput): Promise<void> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Falha no cadastro' }));
    throw new Error((body as { message?: string }).message ?? 'Falha no cadastro');
  }
  await login(input.subdomain, input.ownerEmail, input.ownerPassword);
}

export async function login(subdomain: string, email: string, password: string): Promise<void> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subdomain, email, password }),
  });
  if (!res.ok) {
    throw new Error('Credenciais inválidas');
  }
  const tokens = (await res.json()) as Tokens;
  setTokens(tokens);
  localStorage.setItem(SUBDOMAIN_KEY, subdomain);
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {
    // ignora
  }
  clearSession();
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return false;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return false;
  setTokens((await res.json()) as Tokens);
  return true;
}

/** fetch autenticado com refresh automático em 401 (uma tentativa). */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiFetch<T>(path, options, false);
    }
    clearSession();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Sessão expirada');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((body as { message?: string }).message ?? 'Erro na requisição');
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export { API_URL };
