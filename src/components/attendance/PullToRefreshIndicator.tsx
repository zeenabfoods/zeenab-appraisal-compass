import { Loader2, ArrowDown } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
  threshold: number;
}

export function PullToRefreshIndicator({
  isPulling,
  pullDistance,
  isRefreshing,
  threshold,
}: PullToRefreshIndicatorProps) {
  const progress = Math.min((pullDistance / threshold) * 100, 100);
  const opacity = Math.min(pullDistance / threshold, 1);

  if (!isPulling && !isRefreshing) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none transition-all duration-200"
      style={{
        transform: `translateY(${isRefreshing ? '0px' : `${pullDistance}px`})`,
        opacity: isRefreshing ? 1 : opacity,
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-full shadow-lg p-3 mt-4 border border-orange-200 dark:border-orange-800">
        {isRefreshing ? (
          <Loader2 className="w-6 h-6 text-orange-600 dark:text-orange-400 animate-spin" />
        ) : (
          <div className="relative">
            <ArrowDown
              className="w-6 h-6 text-orange-600 dark:text-orange-400 transition-transform duration-200"
              style={{
                transform: progress >= 100 ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-orange-200 dark:text-orange-900"
              />
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-orange-600 dark:text-orange-400"
                strokeDasharray={`${2 * Math.PI * 10}`}
                strokeDashoffset={`${2 * Math.PI * 10 * (1 - progress / 100)}`}
                strokeLinecap="round"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
