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
      "relative overflow-hidden transition-all duration-500 shadow-xl",
      isClocked 
        ? "bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200/60 dark:border-green-800/60 shadow-green-200/50" 
        : "bg-gradient-to-br from-orange-50/80 to-amber-50/80 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200/60 dark:border-orange-800/60 shadow-orange-200/50"
    )}>
      {/* Decorative Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-500 to-red-500 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-orange-500 to-red-500 rounded-full blur-3xl" />
      </div>

      <div className="relative p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-4 rounded-2xl transition-all duration-300",
              isClocked ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-xl shadow-green-500/40" : "bg-gradient-to-br from-orange-500 to-orange-600 shadow-xl shadow-orange-500/40"
            )}>
              <Clock className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{isClocked ? 'Clocked In' : 'Ready to Clock In'}</h2>
              <p className="text-sm text-muted-foreground font-medium mt-1">Current time: {currentTime}</p>
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
        <div className="flex gap-4 mb-8">
          <Button
            variant={mode === 'office' ? 'default' : 'outline'}
            size="lg"
            className={cn(
              "flex-1 transition-all duration-300 h-14 text-base font-semibold",
              mode === 'office' 
                ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-xl shadow-orange-500/40" 
                : "border-2 border-orange-200 hover:border-orange-300 hover:bg-orange-50/50"
            )}
            onClick={() => setMode('office')}
          >
            <MapPin className="w-5 h-5 mr-2" />
            In Office
          </Button>
          <Button
            variant={mode === 'field' ? 'default' : 'outline'}
            size="lg"
            className={cn(
              "flex-1 transition-all duration-300 h-14 text-base font-semibold",
              mode === 'field' 
                ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-xl shadow-blue-500/40" 
                : "border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50/50"
            )}
            onClick={() => setMode('field')}
          >
            <MapPin className="w-5 h-5 mr-2" />
            On Field
          </Button>
        </div>

        {/* Location Status */}
        {mode === 'office' && (
          <div className="mb-8 p-6 bg-white/60 dark:bg-gray-900/60 rounded-xl backdrop-blur-sm border-2 border-orange-200 dark:border-orange-800 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                <AlertCircle className="w-5 h-5 text-white flex-shrink-0" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold mb-2">Geofence Status</h4>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  You are <span className="font-bold text-orange-600">2.3 km</span> from Head Office.
                  Move within <span className="font-bold">100m</span> to clock in.
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
            "w-full h-24 text-2xl font-bold transition-all duration-500 transform hover:scale-[1.02] active:scale-[0.98] shadow-2xl tracking-wide",
            isClocked
              ? "bg-gradient-to-r from-red-500 via-red-600 to-rose-600 hover:from-red-600 hover:via-red-700 hover:to-rose-700 shadow-red-500/40"
              : "bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:via-orange-700 hover:to-amber-700 shadow-orange-500/40"
          )}
        >
          {isClocked ? (
            <>
              <Clock className="w-7 h-7 mr-4" />
              Clock Out Now
            </>
          ) : (
            <>
              <CheckCircle2 className="w-7 h-7 mr-4" />
              Clock In Now
            </>
          )}
        </Button>

        {/* Status Info */}
        {isClocked && (
          <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border-2 border-green-200 dark:border-green-800 shadow-lg">
            <div className="flex items-center justify-between text-sm mb-3 pb-3 border-b border-green-200 dark:border-green-800">
              <span className="text-muted-foreground font-semibold">Clocked in at</span>
              <span className="font-bold text-green-700 dark:text-green-400 text-base">08:45 AM</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-semibold">Time elapsed</span>
              <span className="font-bold text-green-700 dark:text-green-400 text-base">2h 15m</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
