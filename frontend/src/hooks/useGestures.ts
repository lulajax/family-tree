import { useRef, useCallback, useEffect, useState } from 'react';

interface GestureState {
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
  velocity: number;
  direction: 'left' | 'right' | 'up' | 'down' | null;
}

interface UseGesturesOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onPinch?: (scale: number) => void;
  swipeThreshold?: number;
  doubleTapDelay?: number;
  longPressDelay?: number;
}

export function useGestures<T extends HTMLElement>(options: UseGesturesOptions) {
  const elementRef = useRef<T>(null);
  const gestureState = useRef<GestureState>({
    startX: 0,
    startY: 0,
    deltaX: 0,
    deltaY: 0,
    velocity: 0,
    direction: null,
  });
  
  const [isGesturing, setIsGesturing] = useState(false);
  const lastTapTime = useRef(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const initialDistance = useRef(0);

  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onDoubleTap,
    onLongPress,
    onPinch,
    swipeThreshold = 50,
    doubleTapDelay = 300,
    longPressDelay = 500,
  } = options;

  // 计算两点距离
  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // 处理触摸开始
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    gestureState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      deltaX: 0,
      deltaY: 0,
      velocity: 0,
      direction: null,
    };
    setIsGesturing(true);

    // 检测双指缩放
    if (e.touches.length === 2 && onPinch) {
      initialDistance.current = getDistance(e.touches[0], e.touches[1]);
    }

    // 设置长按定时器
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        onLongPress();
        setIsGesturing(false);
      }, longPressDelay);
    }
  }, [onLongPress, longPressDelay, onPinch, getDistance]);

  // 处理触摸移动
  const handleTouchMove = useCallback((e: TouchEvent) => {
    // 清除长按定时器
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // 处理双指缩放
    if (e.touches.length === 2 && onPinch) {
      e.preventDefault();
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / initialDistance.current;
      onPinch(scale);
      return;
    }

    const touch = e.touches[0];
    const state = gestureState.current;
    
    state.deltaX = touch.clientX - state.startX;
    state.deltaY = touch.clientY - state.startY;

    // 计算速度
    const timeDelta = Date.now() - lastTapTime.current;
    if (timeDelta > 0) {
      state.velocity = Math.sqrt(state.deltaX ** 2 + state.deltaY ** 2) / timeDelta;
    }

    // 确定方向
    if (Math.abs(state.deltaX) > Math.abs(state.deltaY)) {
      state.direction = state.deltaX > 0 ? 'right' : 'left';
    } else {
      state.direction = state.deltaY > 0 ? 'down' : 'up';
    }
  }, [onPinch, getDistance]);

  // 处理触摸结束
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    // 清除长按定时器
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    const state = gestureState.current;
    const absDeltaX = Math.abs(state.deltaX);
    const absDeltaY = Math.abs(state.deltaY);

    // 检测双击
    const currentTime = Date.now();
    const tapInterval = currentTime - lastTapTime.current;
    
    if (tapInterval < doubleTapDelay && absDeltaX < 10 && absDeltaY < 10) {
      onDoubleTap?.();
      lastTapTime.current = 0;
      setIsGesturing(false);
      return;
    }
    
    lastTapTime.current = currentTime;

    // 检测滑动手势
    if (absDeltaX > swipeThreshold || absDeltaY > swipeThreshold) {
      if (absDeltaX > absDeltaY) {
        // 水平滑动
        if (state.deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      } else {
        // 垂直滑动
        if (state.deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    }

    setIsGesturing(false);
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onDoubleTap, swipeThreshold, doubleTapDelay]);

  // 绑定事件
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { ref: elementRef, isGesturing };
}

// 简化的滑动hook
export function useSwipe(options: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}) {
  const { onSwipeLeft, onSwipeRight, threshold = 50 } = options;
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  }, []);

  const onTouchEnd = useCallback(() => {
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > threshold;
    const isRightSwipe = distance < -threshold;

    if (isLeftSwipe) {
      onSwipeLeft?.();
    } else if (isRightSwipe) {
      onSwipeRight?.();
    }
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

// 双击hook
export function useDoubleTap(options: {
  onDoubleTap: () => void;
  delay?: number;
}) {
  const { onDoubleTap, delay = 300 } = options;
  const lastTap = useRef(0);
  const timer = useRef<NodeJS.Timeout | null>(null);

  const onTap = useCallback(() => {
    const currentTime = Date.now();
    const tapLength = currentTime - lastTap.current;

    if (tapLength < delay && tapLength > 0) {
      onDoubleTap();
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    } else {
      timer.current = setTimeout(() => {
        timer.current = null;
      }, delay);
    }

    lastTap.current = currentTime;
  }, [onDoubleTap, delay]);

  return { onTap };
}

// 长按hook
export function useLongPress(options: {
  onLongPress: () => void;
  delay?: number;
}) {
  const { onLongPress, delay = 500 } = options;
  const timer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const start = useCallback(() => {
    isLongPress.current = false;
    timer.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const stop = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const handlers = {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };

  return { handlers, isLongPress: () => isLongPress.current };
}
