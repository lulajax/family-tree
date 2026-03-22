/**
 * 双系族谱系统 - Zustand状态管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState, ViewMode, DeviceType } from '../types';

const MAX_RECENT_REFERENCES = 10;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 初始状态
      currentFamilyId: null,
      referencePersonId: null,
      
      viewMode: 'tree',
      deviceType: 'desktop',
      zoom: 1,
      pan: { x: 0, y: 0 },
      
      selectedPersonId: null,
      highlightedPath: [],
      recentReferences: [],
      
      // 设置参考点
      setReferencePerson: (id: string) => {
        set({ referencePersonId: id });
        get().addRecentReference(id);
      },
      
      // 设置视图模式
      setViewMode: (mode: ViewMode) => {
        set({ viewMode: mode });
      },
      
      // 设置设备类型
      setDeviceType: (type: DeviceType) => {
        set({ deviceType: type });
        // 根据设备类型自动调整视图模式
        if (type === 'mobile' && get().viewMode === 'tree') {
          set({ viewMode: 'list' });
        }
      },
      
      // 选中人员
      selectPerson: (id: string | null) => {
        set({ selectedPersonId: id });
      },
      
      // 设置缩放
      setZoom: (zoom: number) => {
        // 限制缩放范围
        const clampedZoom = Math.max(0.25, Math.min(3, zoom));
        set({ zoom: clampedZoom });
      },
      
      // 设置平移
      setPan: (pan: { x: number; y: number }) => {
        set({ pan });
      },
      
      // 高亮路径
      highlightPath: (personIds: string[]) => {
        set({ highlightedPath: personIds });
      },
      
      // 添加最近使用的参考点
      addRecentReference: (id: string) => {
        const { recentReferences } = get();
        // 移除重复项
        const filtered = recentReferences.filter(ref => ref !== id);
        // 添加到开头，限制数量
        const updated = [id, ...filtered].slice(0, MAX_RECENT_REFERENCES);
        set({ recentReferences: updated });
      },
    }),
    {
      name: 'genealogy-app-storage',
      partialize: (state) => ({
        currentFamilyId: state.currentFamilyId,
        referencePersonId: state.referencePersonId,
        viewMode: state.viewMode,
        recentReferences: state.recentReferences,
      }),
    }
  )
);

// 选择器hooks
export const useCurrentFamily = () => useAppStore((state) => state.currentFamilyId);
export const useReferencePerson = () => useAppStore((state) => state.referencePersonId);
export const useViewMode = () => useAppStore((state) => state.viewMode);
export const useDeviceType = () => useAppStore((state) => state.deviceType);
export const useSelectedPerson = () => useAppStore((state) => state.selectedPersonId);
export const useZoom = () => useAppStore((state) => state.zoom);
export const usePan = () => useAppStore((state) => state.pan);
export const useHighlightedPath = () => useAppStore((state) => state.highlightedPath);
export const useRecentReferences = () => useAppStore((state) => state.recentReferences);

// 组合选择器
export const useTreeViewState = () => 
  useAppStore((state) => ({
    zoom: state.zoom,
    pan: state.pan,
    setZoom: state.setZoom,
    setPan: state.setPan,
  }));

export const useNavigationState = () =>
  useAppStore((state) => ({
    currentFamilyId: state.currentFamilyId,
    referencePersonId: state.referencePersonId,
    viewMode: state.viewMode,
    selectedPersonId: state.selectedPersonId,
    setReferencePerson: state.setReferencePerson,
    setViewMode: state.setViewMode,
    selectPerson: state.selectPerson,
  }));
