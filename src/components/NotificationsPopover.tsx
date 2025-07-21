
import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { useNotifications } from '@/hooks/useNotifications';

export function NotificationsPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications } = useNotifications();

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <h4 className="font-medium">Notifications</h4>
          {notifications?.length === 0 ? (
            <p className="text-sm text-gray-500">No notifications</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {notifications?.slice(0, 5).map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-2 rounded border ${
                    !notification.is_read ? 'bg-blue-50' : 'bg-gray-50'
                  }`}
                >
                  <p className="text-sm font-medium">{notification.title}</p>
                  <p className="text-xs text-gray-600">{notification.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
