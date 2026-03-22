/**
 * 双系族谱系统 - 数据获取 Hooks
 * Dual Family Tree System - Data Fetching Hooks
 * 
 * 使用 TanStack Query (React Query) 进行数据获取和缓存
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type {
  Person,
  Family,
  Relationship,
  FamilyTreeData,
  TitleResult,
  SearchResult,
  PersonListItem,
  TimelineData,
  PaginatedApiResponse,
  ApiResponse,
  ListFilterOptions,
  ListSortField,
  SortDirection,
} from '../types';

// ============================================
// API 客户端（模拟，实际项目中应替换为真实 API）
// ============================================

const API_BASE_URL = '/api/v1';

/**
 * 模拟 API 客户端
 * 在实际项目中，这些应该调用真实的后端 API
 */
const apiClient = {
  // 家族相关
  getFamily: async (familyId: string): Promise<Family> => {
    const response = await fetch(`${API_BASE_URL}/families/${familyId}`);
    if (!response.ok) throw new Error('Failed to fetch family');
    return response.json();
  },

  getFamilies: async (): Promise<Family[]> => {
    const response = await fetch(`${API_BASE_URL}/families`);
    if (!response.ok) throw new Error('Failed to fetch families');
    return response.json();
  },

  // 人员相关
  getPerson: async (personId: string): Promise<Person> => {
    const response = await fetch(`${API_BASE_URL}/persons/${personId}`);
    if (!response.ok) throw new Error('Failed to fetch person');
    return response.json();
  },

  getPersons: async (familyId: string): Promise<Person[]> => {
    const response = await fetch(`${API_BASE_URL}/families/${familyId}/persons`);
    if (!response.ok) throw new Error('Failed to fetch persons');
    return response.json();
  },

  // 家族树相关
  getFamilyTree: async (familyId: string, rootId?: string): Promise<FamilyTreeData> => {
    const params = rootId ? `?rootId=${rootId}` : '';
    const response = await fetch(`${API_BASE_URL}/families/${familyId}/tree${params}`);
    if (!response.ok) throw new Error('Failed to fetch family tree');
    return response.json();
  },

  // 关系相关
  getPersonRelationships: async (personId: string): Promise<Relationship[]> => {
    const response = await fetch(`${API_BASE_URL}/persons/${personId}/relationships`);
    if (!response.ok) throw new Error('Failed to fetch relationships');
    return response.json();
  },

  // 称谓计算
  calculateTitle: async (
    fromId: string,
    toId: string,
    asOf?: Date
  ): Promise<TitleResult> => {
    const params = asOf ? `?asOf=${asOf.toISOString()}` : '';
    const response = await fetch(
      `${API_BASE_URL}/titles/calculate?from=${fromId}&to=${toId}${params}`
    );
    if (!response.ok) throw new Error('Failed to calculate title');
    return response.json();
  },

  // 搜索
  searchPersons: async (
    query: string,
    familyId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedApiResponse<SearchResult[]>> => {
    const params = new URLSearchParams({
      q: query,
      familyId,
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    const response = await fetch(`${API_BASE_URL}/search?${params}`);
    if (!response.ok) throw new Error('Failed to search persons');
    return response.json();
  },

  // 列表视图
  getPersonList: async (
    familyId: string,
    referenceId: string,
    options?: {
      filter?: ListFilterOptions;
      sort?: { field: ListSortField; direction: SortDirection };
      page?: number;
      pageSize?: number;
    }
  ): Promise<PaginatedApiResponse<PersonListItem[]>> => {
    const params = new URLSearchParams({
      familyId,
      referenceId,
      page: (options?.page || 1).toString(),
      pageSize: (options?.pageSize || 20).toString(),
    });
    
    if (options?.sort) {
      params.append('sortField', options.sort.field);
      params.append('sortDirection', options.sort.direction);
    }
    
    const response = await fetch(`${API_BASE_URL}/persons/list?${params}`);
    if (!response.ok) throw new Error('Failed to fetch person list');
    return response.json();
  },

  // 时间线
  getTimeline: async (familyId: string, options?: { startDate?: string; endDate?: string }): Promise<TimelineData> => {
    const params = new URLSearchParams();
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_BASE_URL}/families/${familyId}/timeline${queryString}`);
    if (!response.ok) throw new Error('Failed to fetch timeline');
    return response.json();
  },

  // 创建/更新/删除操作
  createPerson: async (data: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>): Promise<Person> => {
    const response = await fetch(`${API_BASE_URL}/persons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create person');
    return response.json();
  },

  updatePerson: async (personId: string, data: Partial<Person>): Promise<Person> => {
    const response = await fetch(`${API_BASE_URL}/persons/${personId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update person');
    return response.json();
  },

  deletePerson: async (personId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/persons/${personId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete person');
  },

  createRelationship: async (
    data: Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Relationship> => {
    const response = await fetch(`${API_BASE_URL}/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create relationship');
    return response.json();
  },

  deleteRelationship: async (relationshipId: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/relationships/${relationshipId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete relationship');
  },
};

// ============================================
// Query Keys
// ============================================

export const queryKeys = {
  families: ['families'] as const,
  family: (id: string) => ['families', id] as const,
  persons: (familyId: string) => ['families', familyId, 'persons'] as const,
  person: (id: string) => ['persons', id] as const,
  familyTree: (familyId: string, rootId?: string) => 
    ['families', familyId, 'tree', rootId || 'default'] as const,
  relationships: (personId: string) => ['persons', personId, 'relationships'] as const,
  title: (fromId: string, toId: string, asOf?: string) => 
    ['titles', fromId, toId, asOf || 'current'] as const,
  search: (query: string, familyId: string) => 
    ['search', query, familyId] as const,
  personList: (familyId: string, referenceId: string) => 
    ['families', familyId, 'list', referenceId] as const,
  timeline: (familyId: string) => ['families', familyId, 'timeline'] as const,
};

// ============================================
// 数据获取 Hooks
// ============================================

/**
 * 获取单个家族信息
 */
export function useFamily(familyId: string) {
  return useQuery({
    queryKey: queryKeys.family(familyId),
    queryFn: () => apiClient.getFamily(familyId),
    enabled: !!familyId,
    staleTime: 5 * 60 * 1000, // 5分钟
  });
}

/**
 * 获取所有家族列表
 */
export function useFamilies() {
  return useQuery({
    queryKey: queryKeys.families,
    queryFn: () => apiClient.getFamilies(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取单个人员信息
 */
export function usePerson(personId: string) {
  return useQuery({
    queryKey: queryKeys.person(personId),
    queryFn: () => apiClient.getPerson(personId),
    enabled: !!personId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取家族中所有人员
 */
export function useFamilyPersons(familyId: string) {
  return useQuery({
    queryKey: queryKeys.persons(familyId),
    queryFn: () => apiClient.getPersons(familyId),
    enabled: !!familyId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取家族树数据
 */
export function useFamilyTree(familyId: string, rootId?: string) {
  return useQuery({
    queryKey: queryKeys.familyTree(familyId, rootId),
    queryFn: () => apiClient.getFamilyTree(familyId, rootId),
    enabled: !!familyId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 获取人员的关系列表
 */
export function usePersonRelationships(personId: string) {
  return useQuery({
    queryKey: queryKeys.relationships(personId),
    queryFn: () => apiClient.getPersonRelationships(personId),
    enabled: !!personId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 计算称谓
 */
export function useCalculateTitle(
  fromId: string,
  toId: string,
  asOf?: Date
) {
  return useQuery({
    queryKey: queryKeys.title(fromId, toId, asOf?.toISOString()),
    queryFn: () => apiClient.calculateTitle(fromId, toId, asOf),
    enabled: !!fromId && !!toId && fromId !== toId,
    staleTime: 10 * 60 * 1000, // 10分钟（称谓计算结果相对稳定）
  });
}

/**
 * 搜索人员
 */
export function useSearch(
  query: string,
  familyId: string,
  page: number = 1,
  pageSize: number = 20
) {
  return useQuery({
    queryKey: [...queryKeys.search(query, familyId), page, pageSize],
    queryFn: () => apiClient.searchPersons(query, familyId, page, pageSize),
    enabled: !!query && query.length >= 2 && !!familyId,
    placeholderData: keepPreviousData,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * 获取人员列表（带称谓）
 */
export function usePersonList(
  familyId: string,
  referenceId: string,
  options?: {
    filter?: ListFilterOptions;
    sort?: { field: ListSortField; direction: SortDirection };
    page?: number;
    pageSize?: number;
  }
) {
  return useQuery({
    queryKey: [
      ...queryKeys.personList(familyId, referenceId),
      options?.filter,
      options?.sort,
      options?.page,
      options?.pageSize,
    ],
    queryFn: () => apiClient.getPersonList(familyId, referenceId, options),
    enabled: !!familyId && !!referenceId,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * 获取时间线数据
 */
export function useTimeline(
  familyId: string,
  options?: { startDate?: string; endDate?: string }
) {
  return useQuery({
    queryKey: [...queryKeys.timeline(familyId), options],
    queryFn: () => apiClient.getTimeline(familyId, options),
    enabled: !!familyId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// 数据修改 Hooks (Mutations)
// ============================================

/**
 * 创建人员
 */
export function useCreatePerson() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.createPerson,
    onSuccess: (data, variables) => {
      // 使相关缓存失效
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      // 设置新创建的人员缓存
      queryClient.setQueryData(queryKeys.person(data.id), data);
    },
  });
}

/**
 * 更新人员
 */
export function useUpdatePerson() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ personId, data }: { personId: string; data: Partial<Person> }) =>
      apiClient.updatePerson(personId, data),
    onSuccess: (data, variables) => {
      // 更新缓存
      queryClient.setQueryData(queryKeys.person(variables.personId), data);
      // 使相关列表缓存失效
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      queryClient.invalidateQueries({ queryKey: ['search'] });
    },
  });
}

/**
 * 删除人员
 */
export function useDeletePerson() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.deletePerson,
    onSuccess: (_, personId) => {
      // 移除缓存
      queryClient.removeQueries({ queryKey: queryKeys.person(personId) });
      // 使相关缓存失效
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['persons'] });
      queryClient.invalidateQueries({ queryKey: ['search'] });
    },
  });
}

/**
 * 创建关系
 */
export function useCreateRelationship() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.createRelationship,
    onSuccess: () => {
      // 使关系缓存失效
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      queryClient.invalidateQueries({ queryKey: ['tree'] });
    },
  });
}

/**
 * 删除关系
 */
export function useDeleteRelationship() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.deleteRelationship,
    onSuccess: () => {
      // 使关系缓存失效
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      queryClient.invalidateQueries({ queryKey: ['tree'] });
    },
  });
}

// ============================================
// 辅助 Hooks
// ============================================

/**
 * 预加载人员数据
 */
export function usePrefetchPerson() {
  const queryClient = useQueryClient();
  
  return (personId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.person(personId),
      queryFn: () => apiClient.getPerson(personId),
      staleTime: 5 * 60 * 1000,
    });
  };
}

/**
 * 批量获取人员信息
 */
export function usePersonsBatch(personIds: string[]) {
  return useQuery({
    queryKey: ['persons', 'batch', personIds],
    queryFn: async () => {
      const persons = await Promise.all(
        personIds.map((id) => apiClient.getPerson(id))
      );
      return persons;
    },
    enabled: personIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
