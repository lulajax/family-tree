import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiClient: vi.fn(),
}));

vi.mock('./client', () => ({
  apiClient: mocks.apiClient,
}));

import {
  AUTH_TOKEN_KEY,
  getStoredToken,
  login,
  logout,
  me,
  register,
  setStoredToken,
} from './auth';

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  mocks.apiClient.mockReset();
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    removeItem: vi.fn((key: string) => storage.delete(key)),
  });
});

describe('auth api', () => {
  it('stores token after successful login', async () => {
    mocks.apiClient.mockResolvedValueOnce({
      user: { id: 'user-1', username: 'lu', display_name: '陆', role: 'user', created_at: '2026-05-08', updated_at: '2026-05-08' },
      tokens: { access_token: 'token-1', expires_in: 86400 },
    });

    const result = await login({ username: 'lu', password: 'secret' });

    expect(mocks.apiClient).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'lu', password: 'secret' }),
    });
    expect(result.user.username).toBe('lu');
    expect(localStorage.setItem).toHaveBeenCalledWith(AUTH_TOKEN_KEY, 'token-1');
    expect(getStoredToken()).toBe('token-1');
  });

  it('stores token after successful registration', async () => {
    mocks.apiClient.mockResolvedValueOnce({
      user: { id: 'user-2', username: 'jie', display_name: '俊杰', role: 'user', created_at: '2026-05-08', updated_at: '2026-05-08' },
      tokens: { access_token: 'token-2', expires_in: 86400 },
    });

    await register({ username: 'jie', password: 'secret123', display_name: '俊杰' });

    expect(mocks.apiClient).toHaveBeenCalledWith('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username: 'jie', password: 'secret123', display_name: '俊杰' }),
    });
    expect(getStoredToken()).toBe('token-2');
  });

  it('loads current user from /auth/me without mutating token storage', async () => {
    setStoredToken('existing-token');
    mocks.apiClient.mockResolvedValueOnce({ id: 'user-1', username: 'lu', display_name: '陆', role: 'user', created_at: '2026-05-08', updated_at: '2026-05-08' });

    const user = await me();

    expect(mocks.apiClient).toHaveBeenCalledWith('/auth/me');
    expect(user?.id).toBe('user-1');
    expect(getStoredToken()).toBe('existing-token');
  });

  it('clears token on logout', () => {
    setStoredToken('token-3');

    logout();

    expect(localStorage.removeItem).toHaveBeenCalledWith(AUTH_TOKEN_KEY);
    expect(getStoredToken()).toBeNull();
  });
});
