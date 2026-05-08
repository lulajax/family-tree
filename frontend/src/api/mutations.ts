import { useMutation, useQueryClient } from '@tanstack/react-query';
import { login as loginRequest, register as registerRequest } from './auth';
import { apiClient } from './client';
import type { Family, FamilyInvite, FamilyMembership, InviteRole, Person } from '../types';
import { useAuthStore } from '../store/authStore';

// ── Family mutations ──

export function useCreateFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; generation_name?: string; hall_name?: string }) =>
      apiClient<Family>('/families', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['families'] });
    },
  });
}

export function useUpdateFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ familyId, data }: { familyId: string; data: Record<string, unknown> }) =>
      apiClient<Family>(`/families/${familyId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['families'] });
      qc.invalidateQueries({ queryKey: ['family', vars.familyId] });
    },
  });
}

// ── Person mutations ──

export function useCreatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { family_id: string; name: string; gender?: string; birth_date?: string; death_date?: string; bio?: string }) =>
      apiClient<Person>('/persons', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['familyMembers', vars.family_id] });
    },
  });
}

export function useUpdatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, data }: { personId: string; data: Record<string, unknown> }) =>
      apiClient<Person>(`/persons/${personId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dualTree'] });
      qc.invalidateQueries({ queryKey: ['person'] });
    },
  });
}

export function useDeletePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (personId: string) =>
      apiClient<void>(`/persons/${personId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dualTree'] });
      qc.invalidateQueries({ queryKey: ['familyMembers'] });
    },
  });
}

export function useAddRelative() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, data }: {
      personId: string;
      data: {
        relation_type: string;
        person: { name: string; gender?: string; birth_date?: string; death_date?: string; bio?: string };
      };
    }) =>
      apiClient<unknown>(`/persons/${personId}/add-relative`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dualTree'] });
      qc.invalidateQueries({ queryKey: ['familyMembers'] });
    },
  });
}

// ── Photo upload ──

export function useUploadPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ personId, file }: { personId: string; file: File }) => {
      const formData = new FormData();
      formData.append('photo', file);
      return apiClient<{ photo_url: string }>(`/persons/${personId}/photo`, {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dualTree'] });
      qc.invalidateQueries({ queryKey: ['person'] });
    },
  });
}

// ── Collaboration mutations ──

export function useCreateFamilyInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ familyId, role, expires_at }: { familyId: string; role?: InviteRole; expires_at?: string | null }) =>
      apiClient<FamilyInvite>(`/families/${familyId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ role: role ?? 'member', expires_at: expires_at ?? null }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['familyActivity', vars.familyId] });
    },
  });
}

export function useAcceptFamilyInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ inviteCode, user_id }: { inviteCode: string; user_id: string }) =>
      apiClient<FamilyMembership>(`/invites/${inviteCode}/accept`, {
        method: 'POST',
        body: JSON.stringify({ user_id }),
      }),
    onSuccess: (membership) => {
      qc.invalidateQueries({ queryKey: ['collaborationMembers', membership.family_id] });
      qc.invalidateQueries({ queryKey: ['familyActivity', membership.family_id] });
    },
  });
}

// ── Auth mutations ──

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: loginRequest,
    onSuccess: (result) => {
      setAuth(result.tokens.access_token, result.user);
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: registerRequest,
    onSuccess: (result) => {
      setAuth(result.tokens.access_token, result.user);
    },
  });
}
