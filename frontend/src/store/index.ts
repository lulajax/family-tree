/**
 * 双系族谱系统 - Zustand 状态管理
 * Dual Family Tree System - Zustand State Management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  AppStore,
  ViewMode,
  MAX_RECENT_REFERENCES,
  DEFAULT_VIEW_STATE,
  ZOOM_LIMITS
} from '../types';

// ============================================
// 常量定义
// ============================================

const MAX_RECENT_REFS = 10;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

// ============================================
// 初始状态
// ============================================

const initialState = {
  // 当前家族和参考点
  currentFamilyId: null as string | null,
  referencePersonId: null as string | null,
  
  // 视图状态
  viewMode: 'tree' as ViewMode,
  zoom: 1,
  pan: { x: 0, y: 0 },
  
  // 选中状态
  selectedPersonId: null as string | null,
  highlightedPath: [] as string[],
  
  // 最近使用的参考点
  recentReferenceIds: [] as string[],
  
  // UI 状态
  isSidebarOpen: true,
  isDetailPanelOpen: false,
};

// ============================================
// Store 创建
// ============================================

export const useAppStore = create<AppStore>()(
  immer(
    persist(
      (set, get) => ({
        ...initialState,

        // ========================================
        // 家族和参考点操作
        // ========================================

        /**
         * 设置当前家族
         */
        setCurrentFamily: (familyId: string | null) => {
          set((state) => {
            state.currentFamilyId = familyId;
            // 切换家族时重置参考点
            if (familyId === null) {
              state.referencePersonId = null;
              state.selectedPersonId = null;
              state.highlightedPath = [];
            }
          });
        },

        /**
         * 设置参考点人员
         */
        setReferencePerson: (id: string | null) => {
          set((state) => {
            const previousId = state.referencePersonId;
            state.referencePersonId = id;
            
            // 将之前的参考点添加到最近列表
            if (previousId && previousId !== id) {
              state.addRecentReference(previousId);
            }
            
            // 清空选中状态和高亮路径
            state.selectedPersonId = null;
            state.highlightedPath = [];
          });
        },

        /**
         * 添加最近使用的参考点
         */
        addRecentReference: (id: string) => {
          set((state) => {
            // 移除已存在的相同ID
            state.recentReferenceIds = state.recentReferenceIds.filter(
              (refId) => refId !== id
            );
            // 添加到开头
            state.recentReferenceIds.unshift(id);
            // 限制数量
            if (state.recentReferenceIds.length > MAX_RECENT_REFS) {
              state.recentReferenceIds = state.recentReferenceIds.slice(0, MAX_RECENT_REFS);
            }
          });
        },

        /**
         * 清空最近使用的参考点
         */
        clearRecentReferences: () => {
          set((state) => {
            state.recentReferenceIds = [];
          });
        },

        // ========================================
        // 视图操作
        // ========================================

        /**
         * 设置视图模式
         */
        setViewMode: (mode: ViewMode) => {
          set((state) => {
            state.viewMode = mode;
          });
        },

        /**
         * 设置缩放级别
         */
        setZoom: (zoom: number) => {
          set((state) => {
            // 限制缩放范围
            state.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
          });
        },

        /**
         * 设置平移位置
         */
        setPan: (pan: { x: number; y: number }) => {
          set((state) => {
            state.pan = pan;
          });
        },

        /**
         * 重置视图到默认状态
         */
        resetView: () => {
          set((state) => {
            state.zoom = DEFAULT_VIEW_STATE.zoom;
            state.pan = { ...DEFAULT_VIEW_STATE.pan };
          });
        },

        // ========================================
        // 选中操作
        // ========================================

        /**
         * 选中人员
         */
        selectPerson: (id: string | null) => {
          set((state) => {
            state.selectedPersonId = id;
            // 选中人员时打开详情面板
            state.isDetailPanelOpen = id !== null;
          });
        },

        /**
         * 设置高亮路径
         */
        setHighlightedPath: (path: string[]) => {
          set((state) => {
            state.highlightedPath = path;
          });
        },

        // ========================================
        // UI 操作
        // ========================================

        /**
         * 切换侧边栏
         */
        toggleSidebar: () => {
          set((state) => {
            state.isSidebarOpen = !state.isSidebarOpen;
          });
        },

        /**
         * 设置侧边栏状态
         */
        setSidebarOpen: (open: boolean) => {
          set((state) => {
            state.isSidebarOpen = open;
          });
        },

        /**
         * 切换详情面板
         */
        toggleDetailPanel: () => {
          set((state) => {
            state.isDetailPanelOpen = !state.isDetailPanelOpen;
          });
        },

        /**
         * 设置详情面板状态
         */
        setDetailPanelOpen: (open: boolean) => {
          set((state) => {
            state.isDetailPanelOpen = open;
          });
        },
      }),
      {
        name: 'family-tree-app-storage',
        storage: createJSONStorage(() => localStorage),
        // 只持久化部分状态
        partialize: (state) => ({
          currentFamilyId: state.currentFamilyId,
          referencePersonId: state.referencePersonId,
          recentReferenceIds: state.recentReferenceIds,
          viewMode: state.viewMode,
          isSidebarOpen: state.isSidebarOpen,
        }),
      }
    )
  )
);

// ============================================
// 选择器 Hooks（用于优化重渲染）
// ============================================

/**
 * 获取当前家族ID
 */
export const useCurrentFamilyId = () => 
  useAppStore((state) => state.currentFamilyId);

/**
 * 获取当前参考点ID
 */
export const useReferencePersonId = () => 
  useAppStore((state) => state.referencePersonId);

/**
 * 获取当前视图模式
 */
export const useViewMode = () => 
  useAppStore((state) => state.viewMode);

/**
 * 获取当前缩放级别
 */
export const useZoom = () => 
  useAppStore((state) => state.zoom);

/**
 * 获取当前平移位置
 */
export const usePan = () => 
  useAppStore((state) => state.pan);

/**
 * 获取当前选中的人员ID
 */
export const useSelectedPersonId = () => 
  useAppStore((state) => state.selectedPersonId);

/**
 * 获取高亮路径
 */
export const useHighlightedPath = () => 
  useAppStore((state) => state.highlightedPath);

/**
 * 获取最近使用的参考点ID列表
 */
export const useRecentReferenceIds = () => 
  useAppStore((state) => state.recentReferenceIds);

/**
 * 获取侧边栏状态
 */
export const useIsSidebarOpen = () => 
  useAppStore((state) => state.isSidebarOpen);

/**
 * 获取详情面板状态
 */
export const useIsDetailPanelOpen = () => 
  useAppStore((state) => state.isDetailPanelOpen);

// ============================================
// 组合选择器
// ============================================

/**
 * 获取视图状态（zoom + pan）
 */
export const useViewState = () => 
  useAppStore((state) => ({
    zoom: state.zoom,
    pan: state.pan,
  }));

/**
 * 获取选中状态
 */
export const useSelectionState = () => 
  useAppStore((state) => ({
    selectedPersonId: state.selectedPersonId,
    highlightedPath: state.highlightedPath,
  }));

// ============================================
// 操作 Hooks
// ============================================

/**
 * 获取家族和参考点相关操作
 */
export const useFamilyActions = () => 
  useAppStore((state) => ({
    setCurrentFamily: state.setCurrentFamily,
    setReferencePerson: state.setReferencePerson,
    addRecentReference: state.addRecentReference,
    clearRecentReferences: state.clearRecentReferences,
  }));

/**
 * 获取视图相关操作
 */
export const useViewActions = () => 
  useAppStore((state) => ({
    setViewMode: state.setViewMode,
    setZoom: state.setZoom,
    setPan: state.setPan,
    resetView: state.resetView,
  }));

/**
 * 获取选中相关操作
 */
export const useSelectionActions = () => 
  useAppStore((state) => ({
    selectPerson: state.selectPerson,
    setHighlightedPath: state.setHighlightedPath,
  }));

/**
 * 获取 UI 相关操作
 */
export const useUIActions = () => 
  useAppStore((state) => ({
    toggleSidebar: state.toggleSidebar,
    setSidebarOpen: state.setSidebarOpen,
    toggleDetailPanel: state.toggleDetailPanel,
    setDetailPanelOpen: state.setDetailPanelOpen,
  }));

// ============================================
// 工具函数
// ============================================

/**
 * 重置整个 store 到初始状态
 */
export const resetStore = () => {
  useAppStore.setState({ ...initialState });
};

/**
 * 获取完整的 store 状态（用于调试）
 */
export const getFullState = () => {
  return useAppStore.getState();
};
