/**
 * 双系族谱系统 - 数据获取Hooks (TanStack Query)
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import type { 
  Person, 
  PersonWithRelations, 
  Family, 
  FamilyTree, 
  PersonHistory,
  RelationPath,
  QueryOptions,
  ApiResponse,
  PaginatedResponse 
} from '../types';

// ==================== API 基础配置 ====================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// ==================== Query Keys ====================

export const queryKeys = {
  families: ['families'] as const,
  family: (id: string) => ['families', id] as const,
  familyTree: (id: string, rootId?: string) => ['families', id, 'tree', rootId] as const,
  person: (id: string) => ['people', id] as const,
  personRelations: (id: string) => ['people', id, 'relations'] as const,
  personHistory: (id: string) => ['people', id, 'history'] as const,
  relationTitle: (fromId: string, toId: string) => ['relations', fromId, toId, 'title'] as const,
  relationPath: (fromId: string, toId: string) => ['relations', fromId, toId, 'path'] as const,
  searchPeople: (query: string) => ['people', 'search', query] as const,
};

// ==================== 家族相关 Hooks ====================

/**
 * 获取家族列表
 */
export function useFamilies(options?: QueryOptions) {
  return useQuery<Family[]>({
    queryKey: queryKeys.families,
    queryFn: () => fetchApi<ApiResponse<Family[]>>('/families').then(r => r.data || []),
    staleTime: 5 * 60 * 1000, // 5分钟
    ...options,
  });
}

/**
 * 获取单个家族信息
 */
export function useFamily(familyId: string, options?: QueryOptions) {
  return useQuery<Family | null>({
    queryKey: queryKeys.family(familyId),
    queryFn: () => fetchApi<ApiResponse<Family>>(`/families/${familyId}`).then(r => r.data || null),
    enabled: !!familyId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * 获取家族树数据
 */
export function useFamilyTree(familyId: string, rootPersonId?: string, options?: QueryOptions) {
  return useQuery<FamilyTree | null>({
    queryKey: queryKeys.familyTree(familyId, rootPersonId),
    queryFn: () => {
      const params = rootPersonId ? `?rootPersonId=${rootPersonId}` : '';
      return fetchApi<ApiResponse<FamilyTree>>(`/families/${familyId}/tree${params}`)
        .then(r => r.data || null);
    },
    enabled: !!familyId,
    staleTime: 2 * 60 * 1000, // 2分钟
    ...options,
  });
}

// ==================== 人员相关 Hooks ====================

/**
 * 获取单个人员信息
 */
export function usePerson(personId: string, options?: QueryOptions) {
  return useQuery<Person | null>({
    queryKey: queryKeys.person(personId),
    queryFn: () => fetchApi<ApiResponse<Person>>(`/people/${personId}`).then(r => r.data || null),
    enabled: !!personId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * 获取人员及其关系
 */
export function usePersonWithRelations(personId: string, options?: QueryOptions) {
  return useQuery<PersonWithRelations | null>({
    queryKey: queryKeys.personRelations(personId),
    queryFn: () => fetchApi<ApiResponse<PersonWithRelations>>(`/people/${personId}/relations`)
      .then(r => r.data || null),
    enabled: !!personId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

/**
 * 搜索人员
 */
export function useSearchPeople(query: string, options?: QueryOptions) {
  return useQuery<Person[]>({
    queryKey: queryKeys.searchPeople(query),
    queryFn: () => fetchApi<ApiResponse<Person[]>>(`/people/search?q=${encodeURIComponent(query)}`)
      .then(r => r.data || []),
    enabled: query.length >= 2,
    staleTime: 60 * 1000,
    ...options,
  });
}

/**
 * 获取家族中所有人员（用于虚拟列表）
 */
export function useFamilyPeople(
  familyId: string, 
  page: number = 1, 
  pageSize: number = 50,
  options?: QueryOptions
) {
  return useQuery<PaginatedResponse<Person>>({
    queryKey: ['families', familyId, 'people', page, pageSize],
    queryFn: () => fetchApi<ApiResponse<PaginatedResponse<Person>>>(
      `/families/${familyId}/people?page=${page}&pageSize=${pageSize}`
    ).then(r => r.data || { items: [], total: 0, page, pageSize, hasMore: false }),
    enabled: !!familyId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

// ==================== 关系相关 Hooks ====================

/**
 * 计算称谓
 */
export function useCalculateTitle(
  fromId: string, 
  toId: string, 
  asOf?: Date,
  options?: QueryOptions
) {
  return useQuery<string | null>({
    queryKey: queryKeys.relationTitle(fromId, toId),
    queryFn: () => {
      const params = asOf ? `?asOf=${asOf.toISOString()}` : '';
      return fetchApi<ApiResponse<{ title: string }>>(
        `/relations/title?from=${fromId}&to=${toId}${params}`
      ).then(r => r.data?.title || null);
    },
    enabled: !!fromId && !!toId && fromId !== toId,
    staleTime: 10 * 60 * 1000, // 10分钟，称谓不常变化
    ...options,
  });
}

/**
 * 获取关系路径
 */
export function useRelationPath(fromId: string, toId: string, options?: QueryOptions) {
  return useQuery<RelationPath | null>({
    queryKey: queryKeys.relationPath(fromId, toId),
    queryFn: () => fetchApi<ApiResponse<RelationPath>>(
      `/relations/path?from=${fromId}&to=${toId}`
    ).then(r => r.data || null),
    enabled: !!fromId && !!toId && fromId !== toId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * 批量获取称谓（用于列表）
 */
export function useBatchTitles(
  referenceId: string,
  personIds: string[],
  options?: QueryOptions
) {
  return useQuery<Map<string, string>>({
    queryKey: ['relations', 'batch-titles', referenceId, personIds],
    queryFn: async () => {
      if (!referenceId || personIds.length === 0) return new Map();
      
      const response = await fetchApi<ApiResponse<Record<string, string>>>(
        '/relations/batch-titles',
        {
          method: 'POST',
          body: JSON.stringify({ referenceId, personIds }),
        }
      );
      
      return new Map(Object.entries(response.data || {}));
    },
    enabled: !!referenceId && personIds.length > 0,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

// ==================== 历史版本 Hooks ====================

/**
 * 获取人员历史版本
 */
export function usePersonHistory(personId: string, options?: QueryOptions) {
  return useQuery<PersonHistory[]>({
    queryKey: queryKeys.personHistory(personId),
    queryFn: () => fetchApi<ApiResponse<PersonHistory[]>>(`/people/${personId}/history`)
      .then(r => r.data || []),
    enabled: !!personId,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

// ==================== 数据修改 Hooks ====================

/**
 * 更新人员信息
 */
export function useUpdatePerson() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ personId, data }: { personId: string; data: Partial<Person> }) =>
      fetchApi<ApiResponse<Person>>(`/people/${personId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      // 使相关缓存失效
      queryClient.invalidateQueries({ queryKey: queryKeys.person(variables.personId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.personRelations(variables.personId) });
    },
  });
}

/**
 * 设置参考点（本地状态，无需API）
 */
export function useSetReferencePoint() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ personId }: { personId: string }) => {
      // 可以在这里记录用户行为到分析系统
      return { success: true, personId };
    },
    onSuccess: () => {
      // 使称谓缓存失效，因为参考点变了
      queryClient.invalidateQueries({ queryKey: ['relations'] });
    },
  });
}

// ==================== 预取函数 ====================

/**
 * 预取人员信息
 */
export function prefetchPerson(queryClient: ReturnType<typeof useQueryClient>, personId: string) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.person(personId),
    queryFn: () => fetchApi<ApiResponse<Person>>(`/people/${personId}`).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 预取关系路径
 */
export function prefetchRelationPath(
  queryClient: ReturnType<typeof useQueryClient>,
  fromId: string,
  toId: string
) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.relationPath(fromId, toId),
    queryFn: () => fetchApi<ApiResponse<RelationPath>>(
      `/relations/path?from=${fromId}&to=${toId}`
    ).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
}
