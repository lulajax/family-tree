import { useState, useEffect } from 'react';

// 媒体查询Hook
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    // 设置初始值
    setMatches(media.matches);

    // 监听变化
    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    media.addEventListener('change', listener);
    
    return () => {
      media.removeEventListener('change', listener);
    };
  }, [query]);

  return matches;
}

// 预设的断点
export const breakpoints = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
};

// 便捷的断点hooks
export function useIsMobile(): boolean {
  return !useMediaQuery(breakpoints.md);
}

export function useIsTablet(): boolean {
  const isMd = useMediaQuery(breakpoints.md);
  const isLg = useMediaQuery(breakpoints.lg);
  return isMd && !isLg;
}

export function useIsDesktop(): boolean {
  return useMediaQuery(breakpoints.lg);
}

export function useIsLargeDesktop(): boolean {
  return useMediaQuery(breakpoints.xl);
}

// 获取当前视图模式
export function useViewMode(): 'mobile' | 'tablet' | 'desktop' | 'largeDesktop' {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isLargeDesktop = useIsLargeDesktop();

  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  if (isLargeDesktop) return 'largeDesktop';
  return 'desktop';
}
