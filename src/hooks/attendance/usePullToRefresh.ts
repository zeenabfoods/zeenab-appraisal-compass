import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef<number>(0);
  const scrollTop = useRef<number>(0);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const scrollableParent = target.closest('[data-pull-to-refresh]');
      if (!scrollableParent) return;

      scrollTop.current = scrollableParent.scrollTop;
      
      if (scrollTop.current === 0) {
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const scrollableParent = target.closest('[data-pull-to-refresh]');
      if (!scrollableParent) return;

      if (scrollableParent.scrollTop === 0 && touchStartY.current > 0) {
        const touchY = e.touches[0].clientY;
        const distance = (touchY - touchStartY.current) / resistance;
        
        if (distance > 0) {
          e.preventDefault();
          setIsPulling(true);
          setPullDistance(Math.min(distance, threshold + 20));
        }
      }
    };

    const handleTouchEnd = async () => {
      if (isPulling && pullDistance >= threshold) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      
      setIsPulling(false);
      setPullDistance(0);
      touchStartY.current = 0;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, pullDistance, threshold, onRefresh, resistance]);

  return {
    isPulling,
    pullDistance,
    isRefreshing,
    threshold,
  };
}
