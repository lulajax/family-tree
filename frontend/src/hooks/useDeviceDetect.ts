/**
 * 双系族谱系统 - 设备检测Hook
 */

import { useState, useEffect, useCallback } from 'react';
type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'large';

// 断点配置
const BREAKPOINTS = {
  mobile: 768,
  tablet: 1280,
  large: 1920,
} as const;

/**
 * 检测设备类型
 */
export function useDeviceDetect(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  
  const updateDeviceType = useCallback(() => {
    const width = window.innerWidth;
    
    if (width < BREAKPOINTS.mobile) {
      setDeviceType('mobile');
    } else if (width < BREAKPOINTS.tablet) {
      setDeviceType('tablet');
    } else if (width >= BREAKPOINTS.large) {
      setDeviceType('large');
    } else {
      setDeviceType('desktop');
    }
  }, []);
  
  useEffect(() => {
    // 初始检测
    updateDeviceType();
    
    // 监听窗口大小变化
    const handleResize = () => {
      updateDeviceType();
    };
    
    window.addEventListener('resize', handleResize);
    
    // 监听方向变化（移动设备）
    window.addEventListener('orientationchange', updateDeviceType);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', updateDeviceType);
    };
  }, [updateDeviceType]);
  
  return deviceType;
}

/**
 * 检测是否为触摸设备
 */
export function useTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);
  
  useEffect(() => {
    const detectTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        (navigator.msMaxTouchPoints > 0)
      );
    };
    
    detectTouch();
  }, []);
  
  return isTouch;
}

/**
 * 检测是否为移动端
 */
export function useIsMobile(): boolean {
  const deviceType = useDeviceDetect();
  return deviceType === 'mobile';
}

/**
 * 检测是否为平板
 */
export function useIsTablet(): boolean {
  const deviceType = useDeviceDetect();
  return deviceType === 'tablet';
}

/**
 * 检测是否为桌面端
 */
export function useIsDesktop(): boolean {
  const deviceType = useDeviceDetect();
  return deviceType === 'desktop' || deviceType === 'large';
}

/**
 * 响应式值选择器
 */
export function useResponsiveValue<T>(values: { mobile: T; tablet: T; desktop: T; large?: T }): T {
  const deviceType = useDeviceDetect();
  
  switch (deviceType) {
    case 'mobile':
      return values.mobile;
    case 'tablet':
      return values.tablet;
    case 'large':
      return values.large ?? values.desktop;
    case 'desktop':
    default:
      return values.desktop;
  }
}

/**
 * 媒体查询Hook
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const media = window.matchMedia(query);
    
    const updateMatch = () => {
      setMatches(media.matches);
    };
    
    updateMatch();
    
    // 使用addEventListener（现代浏览器）或addListener（旧浏览器）
    if (media.addEventListener) {
      media.addEventListener('change', updateMatch);
    } else {
      // @ts-ignore - 旧版浏览器支持
      media.addListener(updateMatch);
    }
    
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', updateMatch);
      } else {
        // @ts-ignore - 旧版浏览器支持
        media.removeListener(updateMatch);
      }
    };
  }, [query]);
  
  return matches;
}

// 常用媒体查询
export const MEDIA_QUERIES = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1279px)',
  desktop: '(min-width: 1280px)',
  large: '(min-width: 1920px)',
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',
  hover: '(hover: hover)',
  touch: '(hover: none)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  darkMode: '(prefers-color-scheme: dark)',
} as const;

/**
 * 使用预定义媒体查询
 */
export function usePredefinedMediaQuery(queryName: keyof typeof MEDIA_QUERIES): boolean {
  return useMediaQuery(MEDIA_QUERIES[queryName]);
}
