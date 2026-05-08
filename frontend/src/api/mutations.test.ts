import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  invalidateQueries: vi.fn(),
  apiClient: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: mocks.useMutation,
  useQueryClient: mocks.useQueryClient,
}));

vi.mock('./client', () => ({
  apiClient: mocks.apiClient,
}));

vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(() => vi.fn()),
}));

import { useAcceptFamilyInvite, useCreateFamilyInvite } from './mutations';

describe('family collaboration mutations', () => {
  beforeEach(() => {
    mocks.useMutation.mockReset();
    mocks.useQueryClient.mockReset();
    mocks.invalidateQueries.mockReset();
    mocks.apiClient.mockReset();
    mocks.useQueryClient.mockReturnValue({ invalidateQueries: mocks.invalidateQueries });
    mocks.useMutation.mockImplementation((config) => config);
  });

  it('creates an invite and invalidates collaboration data', async () => {
    const config = useCreateFamilyInvite();

    await config.mutationFn({ familyId: 'family-1', role: 'editor', expires_at: null });

    expect(mocks.apiClient).toHaveBeenCalledWith('/families/family-1/invites', {
      method: 'POST',
      body: JSON.stringify({ role: 'editor', expires_at: null }),
    });

    config.onSuccess?.({} as never, { familyId: 'family-1', role: 'editor' }, undefined);

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['familyActivity', 'family-1'] });
  });

  it('accepts an invite code for a user and invalidates members', async () => {
    const config = useAcceptFamilyInvite();

    await config.mutationFn({ inviteCode: 'abc123', user_id: 'user-1' });

    expect(mocks.apiClient).toHaveBeenCalledWith('/invites/abc123/accept', {
      method: 'POST',
      body: JSON.stringify({ user_id: 'user-1' }),
    });

    config.onSuccess?.({ family_id: 'family-1' } as never, { inviteCode: 'abc123', user_id: 'user-1' }, undefined);

    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['collaborationMembers', 'family-1'] });
  });
});
