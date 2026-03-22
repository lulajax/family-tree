import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Person, Family, ViewMode, Gender } from '../types';

interface FamilyState {
  // 数据
  families: Family[];
  persons: Person[];
  currentFamilyId: string | null;
  referencePersonId: string | null;
  selectedPersonId: string | null;
  
  // UI状态
  viewMode: ViewMode;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  
  // 动作
  setFamilies: (families: Family[]) => void;
  setPersons: (persons: Person[]) => void;
  setCurrentFamily: (familyId: string) => void;
  setReferencePerson: (personId: string) => void;
  setSelectedPerson: (personId: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  
  // 数据获取
  fetchFamilyData: (familyId: string) => Promise<void>;
  
  // 工具方法
  getPersonById: (id: string) => Person | undefined;
  getPersonsByFamily: (familyId: string) => Person[];
  getAncestors: (personId: string, generations?: number) => Person[];
  getDescendants: (personId: string, generations?: number) => Person[];
  getSiblings: (personId: string) => Person[];
  getSpouses: (personId: string) => Person[];
  searchPersons: (query: string) => Person[];
  getPersonMap: () => Map<string, Person>;
}

// 模拟数据生成
const generateMockPersons = (familyId: string): Person[] => {
  const persons: Person[] = [
    {
      id: 'p1',
      name: '张伟',
      gender: Gender.MALE,
      birthDate: '1950-01-15',
      generation: 1,
      childrenIds: ['p3'],
    },
    {
      id: 'p2',
      name: '李芳',
      gender: Gender.FEMALE,
      birthDate: '1952-03-20',
      generation: 1,
      spouseIds: ['p1'],
      childrenIds: ['p3'],
    },
    {
      id: 'p3',
      name: '张强',
      gender: Gender.MALE,
      birthDate: '1975-06-10',
      generation: 2,
      fatherId: 'p1',
      motherId: 'p2',
      spouseIds: ['p4'],
      childrenIds: ['p5', 'p6'],
    },
    {
      id: 'p4',
      name: '王美',
      gender: Gender.FEMALE,
      birthDate: '1978-09-05',
      generation: 2,
      spouseIds: ['p3'],
      childrenIds: ['p5', 'p6'],
    },
    {
      id: 'p5',
      name: '张小明',
      gender: Gender.MALE,
      birthDate: '2000-12-25',
      generation: 3,
      fatherId: 'p3',
      motherId: 'p4',
      isReference: true,
    },
    {
      id: 'p6',
      name: '张小红',
      gender: Gender.FEMALE,
      birthDate: '2003-04-18',
      generation: 3,
      fatherId: 'p3',
      motherId: 'p4',
    },
    // 父系祖先
    {
      id: 'p7',
      name: '张爷爷',
      gender: Gender.MALE,
      birthDate: '1920-05-01',
      deathDate: '1995-08-15',
      generation: 0,
      childrenIds: ['p1', 'p8'],
    },
    {
      id: 'p8',
      name: '张叔叔',
      gender: Gender.MALE,
      birthDate: '1955-07-20',
      generation: 1,
      fatherId: 'p7',
    },
    // 母系祖先
    {
      id: 'p9',
      name: '王外公',
      gender: Gender.MALE,
      birthDate: '1930-02-10',
      generation: 0,
      childrenIds: ['p4', 'p10'],
    },
    {
      id: 'p10',
      name: '王姨妈',
      gender: Gender.FEMALE,
      birthDate: '1980-11-30',
      generation: 2,
      fatherId: 'p9',
    },
  ];
  
  return persons;
};

const mockFamilies: Family[] = [
  {
    id: 'f1',
    name: '张氏家族',
    description: '张氏大家族族谱',
    rootPersonId: 'p5',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    memberCount: 10,
  },
];

export const useFamilyStore = create<FamilyState>()(
  persist(
    (set, get) => ({
      // 初始状态
      families: mockFamilies,
      persons: generateMockPersons('f1'),
      currentFamilyId: 'f1',
      referencePersonId: 'p5',
      selectedPersonId: null,
      viewMode: ViewMode.DESKTOP_DUAL,
      isLoading: false,
      error: null,
      searchQuery: '',

      // 设置方法
      setFamilies: (families) => set({ families }),
      setPersons: (persons) => set({ persons }),
      setCurrentFamily: (familyId) => set({ currentFamilyId: familyId }),
      setReferencePerson: (personId) => set({ referencePersonId: personId }),
      setSelectedPerson: (personId) => set({ selectedPersonId: personId }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      // 数据获取
      fetchFamilyData: async (familyId: string) => {
        set({ isLoading: true, error: null });
        try {
          // 模拟API调用
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const persons = generateMockPersons(familyId);
          const family = mockFamilies.find(f => f.id === familyId);
          
          if (family) {
            set({
              persons,
              currentFamilyId: familyId,
              referencePersonId: family.rootPersonId,
              isLoading: false,
            });
          } else {
            set({ error: '家族不存在', isLoading: false });
          }
        } catch (err) {
          set({ error: '加载数据失败', isLoading: false });
        }
      },

      // 工具方法
      getPersonById: (id: string) => {
        return get().persons.find(p => p.id === id);
      },

      getPersonsByFamily: (familyId: string) => {
        return get().persons;
      },

      getAncestors: (personId: string, generations: number = 5): Person[] => {
        const person = get().getPersonById(personId);
        if (!person) return [];

        const ancestors: Person[] = [];
        const queue: { id: string; gen: number }[] = [
          { id: person.fatherId || '', gen: 1 },
          { id: person.motherId || '', gen: 1 },
        ].filter(item => item.id);

        const visited = new Set<string>();

        while (queue.length > 0) {
          const { id, gen } = queue.shift()!;
          if (visited.has(id) || gen > generations) continue;
          visited.add(id);

          const ancestor = get().getPersonById(id);
          if (ancestor) {
            ancestors.push(ancestor);
            if (ancestor.fatherId) {
              queue.push({ id: ancestor.fatherId, gen: gen + 1 });
            }
            if (ancestor.motherId) {
              queue.push({ id: ancestor.motherId, gen: gen + 1 });
            }
          }
        }

        return ancestors;
      },

      getDescendants: (personId: string, generations: number = 5): Person[] => {
        const person = get().getPersonById(personId);
        if (!person || !person.childrenIds) return [];

        const descendants: Person[] = [];
        const queue: { id: string; gen: number }[] = person.childrenIds.map(id => ({
          id,
          gen: 1,
        }));

        const visited = new Set<string>();

        while (queue.length > 0) {
          const { id, gen } = queue.shift()!;
          if (visited.has(id) || gen > generations) continue;
          visited.add(id);

          const descendant = get().getPersonById(id);
          if (descendant) {
            descendants.push(descendant);
            if (descendant.childrenIds) {
              for (const childId of descendant.childrenIds) {
                queue.push({ id: childId, gen: gen + 1 });
              }
            }
          }
        }

        return descendants;
      },

      getSiblings: (personId: string): Person[] => {
        const person = get().getPersonById(personId);
        if (!person) return [];

        const siblings: Person[] = [];
        
        // 通过父亲找兄弟姐妹
        if (person.fatherId) {
          const father = get().getPersonById(person.fatherId);
          if (father?.childrenIds) {
            for (const siblingId of father.childrenIds) {
              if (siblingId !== personId) {
                const sibling = get().getPersonById(siblingId);
                if (sibling) siblings.push(sibling);
              }
            }
          }
        }

        // 通过母亲找兄弟姐妹
        if (person.motherId) {
          const mother = get().getPersonById(person.motherId);
          if (mother?.childrenIds) {
            for (const siblingId of mother.childrenIds) {
              if (siblingId !== personId && !siblings.find(s => s.id === siblingId)) {
                const sibling = get().getPersonById(siblingId);
                if (sibling) siblings.push(sibling);
              }
            }
          }
        }

        return siblings;
      },

      getSpouses: (personId: string): Person[] => {
        const person = get().getPersonById(personId);
        if (!person?.spouseIds) return [];

        return person.spouseIds
          .map(id => get().getPersonById(id))
          .filter((p): p is Person => p !== undefined);
      },

      searchPersons: (query: string): Person[] => {
        if (!query.trim()) return [];
        
        const lowerQuery = query.toLowerCase();
        return get().persons.filter(p => 
          p.name.toLowerCase().includes(lowerQuery) ||
          p.generation.toString().includes(lowerQuery)
        );
      },

      getPersonMap: (): Map<string, Person> => {
        const map = new Map<string, Person>();
        get().persons.forEach(p => map.set(p.id, p));
        return map;
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
