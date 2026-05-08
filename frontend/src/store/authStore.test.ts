import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getStoredToken: vi.fn(),
  me: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../api/auth', () => ({
  getStoredToken: mocks.getStoredToken,
  me: mocks.me,
  logout: mocks.logout,
}));

const storage = new Map<string, string>();

async function loadStore() {
  vi.resetModules();
  storage.clear();
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    removeItem: vi.fn((key: string) => storage.delete(key)),
  });
  return import('./authStore');
}

describe('authStore', () => {
  beforeEach(() => {
    mocks.getStoredToken.mockReset();
    mocks.me.mockReset();
    mocks.logout.mockReset();
  });

  it('hydrates current user from /auth/me when a token is stored', async () => {
    mocks.getStoredToken.mockReturnValue('token-1');
    mocks.me.mockResolvedValue({
      id: 'user-1',
      username: 'lu',
      display_name: '陆',
      role: 'user',
      created_at: '2026-05-08',
      updated_at: '2026-05-08',
    });
    const { useAuthStore } = await loadStore();

    await useAuthStore.getState().hydrateCurrentUser();

    expect(mocks.me).toHaveBeenCalledWith();
    expect(useAuthStore.getState().token).toBe('token-1');
    expect(useAuthStore.getState().user?.username).toBe('lu');
  });

  it('clears stale auth when /auth/me returns null', async () => {
    mocks.getStoredToken.mockReturnValue('stale-token');
    mocks.me.mockResolvedValue(null);
    const { useAuthStore } = await loadStore();
    useAuthStore.setState({ token: 'stale-token', user: null });

    await useAuthStore.getState().hydrateCurrentUser();

    expect(mocks.logout).toHaveBeenCalledWith();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
