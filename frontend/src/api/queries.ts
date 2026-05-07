import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { Family, Person, DualTreeResponse, RelationshipExplanation } from '../types';

// ── Search result types ──

export interface SearchResult {
  id: string;
  type: string;
  name: string;
  highlight: { name?: string; bio?: string };
  score: number;
}

export interface SearchSuggestion {
  value: string;
  type: string;
}

export interface ImportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  summary: { total: number; processed: number; succeeded: number; failed: number };
  errors: Array<{ row: number; field: string; message: string }>;
  created_at: string;
  updated_at: string;
}

// ── Family queries ──

export function useFamilies() {
  return useQuery({
    queryKey: ['families'],
    queryFn: () => apiClient<Family[]>('/families'),
  });
}

export function useFamily(familyId: string | null) {
  return useQuery({
    queryKey: ['family', familyId],
    queryFn: () => apiClient<Family>(`/families/${familyId}`),
    enabled: !!familyId,
  });
}

// ── Dual Tree query ──

export function useDualTree(familyId: string | null, referencePersonId: string | null) {
  return useQuery({
    queryKey: ['dualTree', familyId, referencePersonId],
    queryFn: () =>
      apiClient<DualTreeResponse>(
        `/families/${familyId}/dual-tree?reference=${referencePersonId}`
      ),
    enabled: !!familyId && !!referencePersonId,
  });
}

// ── Person queries ──

export function usePerson(personId: string | null) {
  return useQuery({
    queryKey: ['person', personId],
    queryFn: () => apiClient<Person>(`/persons/${personId}`),
    enabled: !!personId,
  });
}

export function useRelationshipExplanation(
  targetPersonId: string | null,
  referencePersonId: string | null,
) {
  return useQuery({
    queryKey: ['relationshipExplanation', targetPersonId, referencePersonId],
    queryFn: () => {
      const params = new URLSearchParams({
        from: referencePersonId ?? '',
        to: targetPersonId ?? '',
      });
      return apiClient<RelationshipExplanation>(`/calculate/explain?${params.toString()}`);
    },
    enabled: !!targetPersonId && !!referencePersonId && targetPersonId !== referencePersonId,
  });
}

export function useFamilyMembers(familyId: string | null, page = 1, limit = 50) {
  return useQuery({
    queryKey: ['familyMembers', familyId, page, limit],
    queryFn: () =>
      apiClient<Person[]>(`/persons?family_id=${familyId}&page=${page}&limit=${limit}`),
    enabled: !!familyId,
  });
}

// ── Search queries ──

export function useSearch(query: string, familyId?: string) {
  const params = new URLSearchParams({ q: query });
  if (familyId) params.set('family_id', familyId);

  return useQuery({
    queryKey: ['search', query, familyId],
    queryFn: () => apiClient<SearchResult[]>(`/search?${params.toString()}`),
    enabled: query.length >= 1,
  });
}

export function useSearchSuggestions(query: string, familyId?: string) {
  const params = new URLSearchParams({ q: query });
  if (familyId) params.set('family_id', familyId);

  return useQuery({
    queryKey: ['searchSuggestions', query, familyId],
    queryFn: () => apiClient<SearchSuggestion[]>(`/search/suggestions?${params.toString()}`),
    enabled: query.length >= 1,
  });
}

// ── Import queries ──

export function useImportJob(jobId: string | null) {
  return useQuery({
    queryKey: ['importJob', jobId],
    queryFn: () => apiClient<ImportJob>(`/import/${jobId}`),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'pending' || status === 'processing') return 1000;
      return false;
    },
  });
}
