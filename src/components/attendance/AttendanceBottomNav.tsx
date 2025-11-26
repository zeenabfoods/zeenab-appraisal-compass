import { Home, Clock, BarChart3, User, Fingerprint } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAttendanceLogs } from '@/hooks/attendance/useAttendanceLogs';
import { slideUpVariants } from '@/utils/animations';

interface AttendanceBottomNavProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function AttendanceBottomNav({ activeView, onViewChange }: AttendanceBottomNavProps) {
  const { isClocked } = useAttendanceLogs();

  const handleClockToggle = () => {
    // Ensure we are on the main overview card
    onViewChange('overview');
    window.dispatchEvent(
      new CustomEvent('attendance-toggle-clock', {
        detail: { source: 'bottom-nav' },
      })
    );
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
    <motion.div 
      className="lg:hidden"
      variants={slideUpVariants}
      initial="hidden"
      animate="visible"
    >
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
              <motion.button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-2 rounded-lg transition-colors",
                  isActive
                    ? "text-attendance-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
              >
                <IconComponent className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </motion.button>
            );
          })}

          {/* Floating Center Button */}
          <motion.button
            onClick={handleClockToggle}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 -top-6",
              "h-16 w-16 rounded-full shadow-lg",
              "flex items-center justify-center",
              "transition-colors",
              isClocked
                ? "bg-attendance-danger hover:bg-attendance-danger/90"
                : "bg-attendance-primary hover:bg-attendance-primary-hover"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 1.1 }}
            animate={{
              boxShadow: [
                "0 10px 30px -10px rgba(255, 107, 53, 0.3)",
                "0 10px 40px -5px rgba(255, 107, 53, 0.5)",
                "0 10px 30px -10px rgba(255, 107, 53, 0.3)"
              ]
            }}
            transition={{
              boxShadow: {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
          >
            <Fingerprint className="h-8 w-8 text-white" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
