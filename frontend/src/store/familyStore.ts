import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Family, Person, DualTreeResponse, ApiResponse } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/$/, '');

interface FamilyState {
  // 数据
  families: Family[];
  currentFamilyId: string | null;
  referencePersonId: string | null;
  selectedPersonId: string | null;
  dualTree: DualTreeResponse | null;

  // UI
  isLoading: boolean;
  error: string | null;

  // 动作
  setCurrentFamily: (familyId: string) => void;
  setReferencePerson: (personId: string) => void;
  setSelectedPerson: (personId: string | null) => void;
  setError: (error: string | null) => void;

  // 数据获取
  fetchFamilies: () => Promise<void>;
  fetchDualTree: () => Promise<void>;
  createFamily: (name: string, description?: string) => Promise<Family>;
  addRelative: (
    personId: string,
    relationType: string,
    person: { name: string; gender?: string; birth_date?: string; death_date?: string }
  ) => Promise<void>;
  createFirstPerson: (
    person: { name: string; gender?: string; birth_date?: string; death_date?: string }
  ) => Promise<void>;
  deletePerson: (personId: string) => Promise<void>;
  updatePerson: (
    personId: string,
    data: {
      name?: string;
      gender?: 'male' | 'female' | 'unknown';
      birth_date?: string;
      death_date?: string;
      bio?: string;
    }
  ) => Promise<void>;
}

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => ({
      families: [],
      currentFamilyId: null,
      referencePersonId: null,
      selectedPersonId: null,
      dualTree: null,
      isLoading: false,
      error: null,

      setCurrentFamily: (familyId) => {
        set({ currentFamilyId: familyId, referencePersonId: null, dualTree: null });
      },

      setReferencePerson: (personId) => {
        set({ referencePersonId: personId });
        // 自动刷新树
        void get().fetchDualTree();
      },

      setSelectedPerson: (personId) => set({ selectedPersonId: personId }),
      setError: (error) => set({ error }),

      fetchFamilies: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/families`);
          const json: ApiResponse<Family[]> = await res.json();
          if (json.success && json.data) {
            set({ families: json.data, isLoading: false });
          } else {
            set({ error: json.error?.message ?? '加载家族列表失败', isLoading: false });
          }
        } catch (err) {
          set({ error: err instanceof Error ? err.message : '网络错误', isLoading: false });
        }
      },

      fetchDualTree: async () => {
        const { currentFamilyId, referencePersonId } = get();
        if (!currentFamilyId || !referencePersonId) return;

        set({ isLoading: true, error: null });
        try {
          const res = await fetch(
            `${API_BASE}/families/${currentFamilyId}/dual-tree?reference=${referencePersonId}`
          );
          const json: ApiResponse<DualTreeResponse> = await res.json();
          if (json.success && json.data) {
            set({ dualTree: json.data, isLoading: false });
          } else {
            set({ error: json.error?.message ?? '加载图谱失败', isLoading: false });
          }
        } catch (err) {
          set({ error: err instanceof Error ? err.message : '网络错误', isLoading: false });
        }
      },

      createFamily: async (name, description) => {
        const res = await fetch(`${API_BASE}/families`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description }),
        });
        const json: ApiResponse<Family> = await res.json();
        if (!json.success || !json.data) {
          throw new Error(json.error?.message ?? '创建家族失败');
        }
        const family = json.data;
        set((s) => ({ families: [...s.families, family] }));
        return family;
      },

      createFirstPerson: async (person) => {
        const { currentFamilyId } = get();
        if (!currentFamilyId) throw new Error('未选择家族');

        // 1. 创建人员
        const createRes = await fetch(`${API_BASE}/persons`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ family_id: currentFamilyId, ...person }),
        });
        const createJson: ApiResponse<Person> = await createRes.json();
        if (!createJson.success || !createJson.data) {
          throw new Error(createJson.error?.message ?? '创建人员失败');
        }
        const newPerson = createJson.data;

        // 2. 设为家族根节点
        const rootRes = await fetch(`${API_BASE}/families/${currentFamilyId}/root`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ person_id: newPerson.id }),
        });
        const rootJson: ApiResponse<Family> = await rootRes.json();
        if (!rootJson.success) {
          throw new Error(rootJson.error?.message ?? '设置根节点失败');
        }

        // 3. 更新本地家族列表中的 root_person_id
        set((s) => ({
          families: s.families.map((f) =>
            f.id === currentFamilyId ? { ...f, root_person_id: newPerson.id } : f
          ),
          referencePersonId: newPerson.id,
        }));

        // 4. 加载图谱
        await get().fetchDualTree();
      },

      addRelative: async (personId, relationType, person) => {
        const res = await fetch(`${API_BASE}/persons/${personId}/add-relative`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ relation_type: relationType, person }),
        });
        const json: ApiResponse<unknown> = await res.json();
        if (!json.success) {
          throw new Error(json.error?.message ?? '添加亲属失败');
        }
        // 刷新图谱
        await get().fetchDualTree();
      },

      updatePerson: async (personId, data) => {
        const res = await fetch(`${API_BASE}/persons/${personId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json: ApiResponse<Person> = await res.json();
        if (!json.success) {
          throw new Error(json.error?.message ?? '更新人物信息失败');
        }
        // 刷新图谱
        await get().fetchDualTree();
      },

      deletePerson: async (personId) => {
        const { referencePersonId, dualTree } = get();
        const res = await fetch(`${API_BASE}/persons/${personId}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const json: ApiResponse<unknown> = await res.json().catch(() => ({ success: false, error: { message: '删除失败' } }));
          throw new Error(json.error?.message ?? '删除人物失败');
        }

        // 如果被删除的是当前选中人物，清空选中状态
        set((s) => ({ selectedPersonId: s.selectedPersonId === personId ? null : s.selectedPersonId }));

        // 如果被删除的是当前焦点人物，需要切换到其他人物
        if (referencePersonId === personId && dualTree) {
          // 尝试切换到配偶、父母或子女
          const nextRef = dualTree.spouses[0]?.person
            ?? dualTree.paternal[0]?.ancestor
            ?? dualTree.maternal[0]?.ancestor
            ?? dualTree.children[0]?.person
            ?? null;
          if (nextRef) {
            set({ referencePersonId: nextRef.id });
          } else {
            // 没有可用的人物了，清空焦点
            set({ referencePersonId: null, dualTree: null });
          }
        }

        // 刷新图谱
        await get().fetchDualTree();
      },
    }),
    {
      name: 'family-store',
      partialize: (state) => ({
        currentFamilyId: state.currentFamilyId,
        referencePersonId: state.referencePersonId,
      }),
    }
  )
);
