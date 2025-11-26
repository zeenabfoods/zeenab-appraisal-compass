import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Wifi, WifiOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClockInOutCardProps {
  isClocked: boolean;
  onToggle: (clocked: boolean) => void;
}

export function ClockInOutCard({ isClocked, onToggle }: ClockInOutCardProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [mode, setMode] = useState<'office' | 'field'>('office');
  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

  const handleClockToggle = () => {
    // Add haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    onToggle(!isClocked);
  };

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-500",
      isClocked 
        ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800" 
        : "bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border-orange-200 dark:border-orange-800"
    )}>
      {/* Decorative Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-500 to-red-500 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-orange-500 to-red-500 rounded-full blur-3xl" />
      </div>

      <div className="relative p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-3 rounded-xl transition-all duration-300",
              isClocked ? "bg-green-500 shadow-lg shadow-green-500/50" : "bg-orange-500 shadow-lg shadow-orange-500/50"
            )}>
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{isClocked ? 'Clocked In' : 'Ready to Clock In'}</h2>
              <p className="text-sm text-muted-foreground">Current time: {currentTime}</p>
            </div>
          </div>
          
          {/* Online Status */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-600" />
            )}
            <span className="text-xs font-medium">
              {isOnline ? 'Synced' : 'Offline Mode'}
            </span>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-3 mb-6">
          <Button
            variant={mode === 'office' ? 'default' : 'outline'}
            className={cn(
              "flex-1 transition-all duration-300",
              mode === 'office' 
                ? "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30" 
                : "border-orange-200 hover:border-orange-300"
            )}
            onClick={() => setMode('office')}
          >
            <MapPin className="w-4 h-4 mr-2" />
            In Office
          </Button>
          <Button
            variant={mode === 'field' ? 'default' : 'outline'}
            className={cn(
              "flex-1 transition-all duration-300",
              mode === 'field' 
                ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30" 
                : "border-blue-200 hover:border-blue-300"
            )}
            onClick={() => setMode('field')}
          >
            <MapPin className="w-4 h-4 mr-2" />
            On Field
          </Button>
        </div>

        {/* Location Status */}
        {mode === 'office' && (
          <div className="mb-6 p-4 bg-white/50 dark:bg-gray-900/50 rounded-lg backdrop-blur-sm border border-orange-200 dark:border-orange-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold mb-1">Geofence Status</h4>
                <p className="text-xs text-muted-foreground">
                  You are <span className="font-semibold text-orange-600">2.3 km</span> from Head Office.
                  Move within <span className="font-semibold">100m</span> to clock in.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Clock Button */}
        <Button
          size="lg"
          onClick={handleClockToggle}
          className={cn(
            "w-full h-20 text-xl font-bold transition-all duration-500 transform hover:scale-[1.02] active:scale-[0.98]",
            isClocked
              ? "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-xl shadow-red-500/30"
              : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-xl shadow-orange-500/30"
          )}
        >
          {isClocked ? (
            <>
              <Clock className="w-6 h-6 mr-3" />
              Clock Out Now
            </>
          ) : (
            <>
              <CheckCircle2 className="w-6 h-6 mr-3" />
              Clock In Now
            </>
          )}
        </Button>

        {/* Status Info */}
        {isClocked && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Clocked in at:</span>
              <span className="font-semibold text-green-700 dark:text-green-400">08:45 AM</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-muted-foreground">Time elapsed:</span>
              <span className="font-semibold text-green-700 dark:text-green-400">2h 15m</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
