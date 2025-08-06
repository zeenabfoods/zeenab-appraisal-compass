
import { Home, ClipboardList, Bell, User, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/components/AuthProvider';
import { useNotificationSystem } from '@/hooks/useNotificationSystem';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function BottomNavigation() {
  const location = useLocation();
  const { signOut } = useAuthContext();
  const { hasUnread, unreadCount } = useNotificationSystem();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const navItems = [
    {
      icon: Home,
      label: 'Dashboard',
      path: '/',
      active: isActive('/')
    },
    {
      icon: ClipboardList,
      label: 'Appraisals',
      path: '/my-appraisals',
      active: isActive('/my-appraisals')
    },
    {
      icon: Bell,
      label: 'Notifications',
      path: '/notifications',
      active: isActive('/notifications'),
      badge: hasUnread ? unreadCount : undefined
    },
    {
      icon: User,
      label: 'Profile',
      path: '/profile',
      active: isActive('/profile')
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg md:hidden">
      <div className="flex items-center justify-around py-2 px-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 rounded-lg transition-colors",
              item.active
                ? "text-orange-600 bg-orange-50"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            )}
          >
            <div className="relative mb-1">
              <item.icon className="h-5 w-5" />
              {item.badge && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center min-w-4">
                  {item.badge > 9 ? '9+' : item.badge}
                </div>
              )}
            </div>
            <span className="text-xs font-medium truncate">{item.label}</span>
          </Link>
        ))}
        
        {/* Logout button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
        >
          <LogOut className="h-5 w-5 mb-1" />
          <span className="text-xs font-medium">Logout</span>
        </Button>
      </div>
    </div>
  );
}
