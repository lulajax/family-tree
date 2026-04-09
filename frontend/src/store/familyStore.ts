import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Family UI state — persisted across sessions.
 * All data fetching / CRUD is handled by TanStack Query (see api/queries.ts, api/mutations.ts).
 */
interface FamilyUIState {
  currentFamilyId: string | null;
  referencePersonId: string | null;
  selectedPersonId: string | null;
  treeViewMode: 'dual' | 'paternal' | 'maternal';

  setCurrentFamily: (familyId: string | null) => void;
  setReferencePerson: (personId: string | null) => void;
  setSelectedPerson: (personId: string | null) => void;
  setTreeViewMode: (mode: 'dual' | 'paternal' | 'maternal') => void;
}

export const useFamilyStore = create<FamilyUIState>()(
  persist(
    (set) => ({
      currentFamilyId: null,
      referencePersonId: null,
      selectedPersonId: null,
      treeViewMode: 'dual',

      setCurrentFamily: (familyId) =>
        set({ currentFamilyId: familyId, referencePersonId: null, selectedPersonId: null }),
      setReferencePerson: (personId) =>
        set({ referencePersonId: personId, selectedPersonId: null }),
      setSelectedPerson: (personId) =>
        set({ selectedPersonId: personId }),
      setTreeViewMode: (mode) =>
        set({ treeViewMode: mode }),
    }),
    {
      name: 'family-store',
      partialize: (state) => ({
        currentFamilyId: state.currentFamilyId,
        referencePersonId: state.referencePersonId,
        treeViewMode: state.treeViewMode,
      }),
    },
  ),
);
