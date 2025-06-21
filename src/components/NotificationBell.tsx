
import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotificationSystem } from '@/hooks/useNotificationSystem';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function NotificationBell({ onClick, size = 'md' }: NotificationBellProps) {
  const { hasUnread, unreadCount, hasNewNotification, clearNewNotificationState } = useNotificationSystem();

  const handleClick = () => {
    if (hasNewNotification) {
      clearNewNotificationState();
    }
    onClick?.();
  };

  const bellSize = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }[size];

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleClick}
        className={cn(
          "relative hover:bg-white/50 transition-all duration-300",
          hasNewNotification && "animate-pulse"
        )}
      >
        <div className="relative">
          <Bell className={cn(
            bellSize,
            hasNewNotification && "animate-bounce"
          )} />
          
          {/* Red dot indicator */}
          {hasUnread && (
            <div className={cn(
              "absolute -top-1 -right-1 rounded-full bg-red-500",
              hasNewNotification 
                ? "w-3 h-3 animate-ping shadow-lg shadow-red-500/50" 
                : "w-2 h-2",
              "flex items-center justify-center"
            )}>
              {/* Breathing glow effect for new notifications */}
              {hasNewNotification && (
                <div className="absolute inset-0 rounded-full bg-red-500 animate-pulse opacity-75"></div>
              )}
            </div>
          )}
          
          {/* Unread count badge for larger numbers */}
          {unreadCount > 1 && (
            <Badge 
              variant="destructive" 
              className={cn(
                "absolute -top-2 -right-2 text-xs px-1 py-0 min-w-5 h-5 flex items-center justify-center",
                hasNewNotification && "animate-bounce shadow-lg shadow-red-500/30"
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>
      </Button>
      
      {/* Outer glow effect for new notifications */}
      {hasNewNotification && (
        <div className="absolute inset-0 rounded-lg bg-red-500/20 animate-pulse pointer-events-none blur-sm"></div>
      )}
    </div>
  );
}
