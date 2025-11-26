import { Home, Clock, BarChart3, User, Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAttendanceLogs } from '@/hooks/attendance/useAttendanceLogs';
import { toast } from 'sonner';

interface AttendanceBottomNavProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function AttendanceBottomNav({ activeView, onViewChange }: AttendanceBottomNavProps) {
  const { isClocked } = useAttendanceLogs();

  const handleClockToggle = () => {
    // This will trigger the parent to show the main clock in/out view
    onViewChange('overview');
    toast.info('Use the main card above to clock in/out');
  };

  const navItems = [
    {
      id: 'overview',
      icon: Home,
      label: 'Home',
    },
    {
      id: 'breaks',
      icon: Clock,
      label: 'Breaks',
    },
    // Center button space
    null,
    {
      id: 'stats',
      icon: BarChart3,
      label: 'Reports',
    },
    {
      id: 'security',
      icon: User,
      label: 'Profile',
    },
  ];

  return (
    <div className="lg:hidden">
      {/* Safe area spacer */}
      <div className="h-20" />
      
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg safe-area-bottom">
        <div className="relative flex items-center justify-around h-16 px-2">
          {navItems.map((item, index) => {
            if (item === null) {
              // Center placeholder
              return <div key="center-space" className="flex-1" />;
            }

            const isActive = activeView === item.id;
            const IconComponent = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-2 rounded-lg transition-colors",
                  isActive
                    ? "text-attendance-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <IconComponent className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}

          {/* Floating Center Button */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-6">
            <Button
              onClick={handleClockToggle}
              className={cn(
                "h-14 w-14 rounded-full shadow-lg transition-all",
                isClocked
                  ? "bg-attendance-danger hover:bg-attendance-danger/90"
                  : "bg-attendance-primary hover:bg-attendance-primary-hover"
              )}
            >
              <Fingerprint className="h-7 w-7 text-white" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
