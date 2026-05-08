import { apiClient } from './client';
import type { AuthResult, User } from '../types';

export const AUTH_TOKEN_KEY = 'auth_token';

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  display_name?: string;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

function persistAuthResult(result: AuthResult): AuthResult {
  setStoredToken(result.tokens.access_token);
  return result;
}

export async function login(payload: LoginPayload): Promise<AuthResult> {
  const result = await apiClient<AuthResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return persistAuthResult(result);
}

export async function register(payload: RegisterPayload): Promise<AuthResult> {
  const result = await apiClient<AuthResult>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return persistAuthResult(result);
}

export async function me(): Promise<User | null> {
  return apiClient<User | null>('/auth/me');
}

export function logout(): void {
  clearStoredToken();
}
