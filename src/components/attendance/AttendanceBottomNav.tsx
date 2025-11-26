import { Home, Clock, BarChart3, User, Fingerprint } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAttendanceLogs } from '@/hooks/attendance/useAttendanceLogs';
import { slideUpVariants } from '@/utils/animations';

interface AttendanceBottomNavProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function AttendanceBottomNav({ activeView, onViewChange }: AttendanceBottomNavProps) {
  const { isClocked } = useAttendanceLogs();
  const [isPressing, setIsPressing] = useState(false);
  const pressTimeoutRef = useRef<number | null>(null);

  const triggerClockToggle = () => {
    // Ensure we are on the main overview card
    onViewChange('overview');
    window.dispatchEvent(
      new CustomEvent('attendance-toggle-clock', {
        detail: { source: 'bottom-nav' },
      })
    );
  };

  const startLongPress = () => {
    if (pressTimeoutRef.current) return;
    setIsPressing(true);
    pressTimeoutRef.current = window.setTimeout(() => {
      triggerClockToggle();
      pressTimeoutRef.current = null;
    }, 3000);
  };

  const endLongPress = () => {
    if (pressTimeoutRef.current) {
      clearTimeout(pressTimeoutRef.current);
      pressTimeoutRef.current = null;
    }
    setIsPressing(false);
  };

  useEffect(() => {
    return () => {
      if (pressTimeoutRef.current) {
        clearTimeout(pressTimeoutRef.current);
      }
    };
  }, []);

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
            onMouseDown={startLongPress}
            onMouseUp={endLongPress}
            onMouseLeave={endLongPress}
            onTouchStart={(e) => {
              e.preventDefault();
              startLongPress();
            }}
            onTouchEnd={endLongPress}
            onTouchCancel={endLongPress}
            className={cn(
              "absolute left-1/2 -top-6",
              "h-16 w-16 rounded-full",
              "flex items-center justify-center",
              "transition-colors touch-none select-none",
              isClocked
                ? "bg-attendance-danger"
                : "bg-attendance-primary"
            )}
            style={{
              transform: 'translateX(-50%)',
            }}
            animate={{
              scale: isPressing ? 1.3 : 1,
              boxShadow: isPressing
                ? [
                    "0 0 0px rgba(255, 107, 53, 0.8), 0 0 30px rgba(255, 107, 53, 0.6), 0 0 50px rgba(255, 107, 53, 0.4)",
                    "0 0 20px rgba(255, 107, 53, 1), 0 0 40px rgba(255, 107, 53, 0.8), 0 0 60px rgba(255, 107, 53, 0.6)",
                    "0 0 0px rgba(255, 107, 53, 0.8), 0 0 30px rgba(255, 107, 53, 0.6), 0 0 50px rgba(255, 107, 53, 0.4)",
                  ]
                : "0 8px 25px -8px rgba(255, 107, 53, 0.5)",
            }}
            transition={{
              scale: {
                type: 'spring',
                stiffness: 300,
                damping: 20,
              },
              boxShadow: isPressing
                ? {
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }
                : {
                    duration: 0.3,
                  },
            }}
          >
            <Fingerprint className="h-8 w-8 text-white" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
