import { RefreshCw, Wifi, WifiOff, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSyncQueue } from '@/hooks/attendance/useSyncQueue';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { scaleFadeVariants, listContainerVariants, listItemVariants } from '@/utils/animations';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function OfflineQueueIndicator() {
  const { pendingCount, isSyncing, syncQueue, queueItems } = useSyncQueue();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (pendingCount === 0 && isOnline) return null;

  return (
    <motion.div
      variants={scaleFadeVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
    >
      <Card className={cn(
        "fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-40 shadow-xl border-2 transition-all duration-300",
        !isOnline ? "border-red-500/50 bg-red-50/95 dark:bg-red-950/95" : "border-orange-500/50 bg-orange-50/95 dark:bg-orange-950/95"
      )}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2.5 rounded-xl shadow-lg transition-all duration-300",
            !isOnline 
              ? "bg-gradient-to-br from-red-500 to-red-600" 
              : "bg-gradient-to-br from-orange-500 to-orange-600"
          )}>
            {!isOnline ? (
              <WifiOff className="w-5 h-5 text-white" />
            ) : (
              <Clock className="w-5 h-5 text-white" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-sm">
                {!isOnline ? 'Offline Mode' : 'Pending Sync'}
              </h3>
              {pendingCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "font-bold text-xs px-2 py-0.5",
                    !isOnline 
                      ? "bg-red-600 text-white" 
                      : "bg-orange-600 text-white"
                  )}
                >
                  {pendingCount}
                </Badge>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mb-3">
              {!isOnline 
                ? 'Working offline. Data will sync when connected.'
                : `${pendingCount} item${pendingCount > 1 ? 's' : ''} waiting to sync`
              }
            </p>

            {queueItems.length > 0 && (
              <motion.div 
                className="space-y-1.5 mb-3"
                variants={listContainerVariants}
                initial="hidden"
                animate="visible"
              >
                {queueItems.slice(0, 3).map((item, index) => (
                  <motion.div 
                    key={item.id} 
                    className="flex items-center gap-2 text-xs p-2 bg-white/50 dark:bg-gray-900/50 rounded-lg"
                    variants={listItemVariants}
                  >
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      item.sync_status === 'failed' ? "bg-red-500" : "bg-amber-500"
                    )} />
                    <span className="flex-1 truncate font-medium">
                      {item.operation_type.replace('_', ' ').toUpperCase()}
                    </span>
                    {item.sync_attempts > 0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertCircle className="w-3 h-3 text-red-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              {item.sync_attempts} failed attempt{item.sync_attempts > 1 ? 's' : ''}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </motion.div>
                ))}
                {queueItems.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{queueItems.length - 3} more
                  </p>
                )}
              </motion.div>
            )}

            {isOnline && pendingCount > 0 && (
              <Button
                onClick={syncQueue}
                disabled={isSyncing}
                size="sm"
                className={cn(
                  "w-full h-9 font-semibold shadow-lg transition-all duration-300",
                  "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600",
                  "text-white"
                )}
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
            )}

            {!isOnline && (
              <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                <Wifi className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Waiting for connection...
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
    </motion.div>
  );
}
