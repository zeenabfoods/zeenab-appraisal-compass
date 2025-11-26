import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Wifi, WifiOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGeolocation } from '@/hooks/attendance/useGeolocation';
import { useAttendanceLogs } from '@/hooks/attendance/useAttendanceLogs';
import { useBranches } from '@/hooks/attendance/useBranches';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export function ClockInOutCard() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [mode, setMode] = useState<'office' | 'field'>('office');
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [fieldReason, setFieldReason] = useState('');
  const [fieldLocation, setFieldLocation] = useState('');
  
  const { branches } = useBranches();
  const { isClocked, todayLog, clockIn, clockOut, loading: logsLoading } = useAttendanceLogs();
  const activeBranch = branches.find(b => b.is_active);

  const { 
    latitude, 
    longitude, 
    isWithinGeofence, 
    loading: geoLoading, 
    error: geoError,
    distanceFromOffice 
  } = useGeolocation(
    mode === 'office' && activeBranch ? {
      latitude: activeBranch.latitude,
      longitude: activeBranch.longitude,
      radius: activeBranch.geofence_radius,
    } : undefined
  );

  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });

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

  const handleClockToggle = async () => {
    if (isClocked && todayLog) {
      // Clock out
      await clockOut(latitude, longitude, mode === 'office' ? isWithinGeofence : undefined);
    } else {
      // Clock in
      if (mode === 'field') {
        setShowFieldDialog(true);
      } else if (mode === 'office') {
        if (!activeBranch) {
          return;
        }
        
        await clockIn({
          locationType: 'office',
          latitude,
          longitude,
          branchId: activeBranch.id,
          withinGeofence: isWithinGeofence,
          geofenceDistance: distanceFromOffice,
        });
      }
    }
  };

  const handleFieldClockIn = async () => {
    if (!fieldReason.trim() || !fieldLocation.trim()) {
      return;
    }

    await clockIn({
      locationType: 'field',
      latitude,
      longitude,
      fieldWorkReason: fieldReason,
      fieldWorkLocation: fieldLocation,
    });

    setShowFieldDialog(false);
    setFieldReason('');
    setFieldLocation('');
  };

  const canClockIn = mode === 'field' || (mode === 'office' && activeBranch && !geoLoading);
  const clockInTime = todayLog ? new Date(todayLog.clock_in_time) : null;
  const elapsedMs = clockInTime ? Date.now() - clockInTime.getTime() : 0;
  const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));
  const elapsedMinutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60));

  if (logsLoading) {
    return (
      <Card className="p-8">
        <div className="text-center text-muted-foreground">Loading attendance data...</div>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn(
        "relative overflow-hidden transition-all duration-500 shadow-xl",
        isClocked 
          ? "bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200/60 dark:border-green-800/60 shadow-green-200/50" 
          : "bg-gradient-to-br from-orange-50/80 to-amber-50/80 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200/60 dark:border-orange-800/60 shadow-orange-200/50"
      )}>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-500 to-red-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-orange-500 to-red-500 rounded-full blur-3xl" />
        </div>

        <div className="relative p-10">
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

          {mode === 'office' && activeBranch && (
            <div className="mb-8 p-6 bg-white/60 dark:bg-gray-900/60 rounded-xl backdrop-blur-sm border-2 border-orange-200 dark:border-orange-800 shadow-lg">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-bold">Geofence Status</h4>
                {geoLoading ? (
                  <Badge variant="secondary" className="animate-pulse">Detecting...</Badge>
                ) : isWithinGeofence ? (
                  <Badge variant="default" className="bg-green-600">✓ Inside {activeBranch.name}</Badge>
                ) : (
                  <Badge variant="destructive">⚠ Outside Office</Badge>
                )}
              </div>
              {geoError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {geoError}
                </p>
              )}
              {!geoLoading && distanceFromOffice !== null && (
                <p className="text-xs text-muted-foreground mt-2">
                  Distance: ~{Math.round(distanceFromOffice)}m from {activeBranch.name}
                </p>
              )}
            </div>
          )}

          {mode === 'office' && !activeBranch && (
            <div className="mb-8 p-6 bg-amber-50 dark:bg-amber-950/30 rounded-xl border-2 border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                No active branch configured. Contact HR to set up office locations.
              </p>
            </div>
          )}

          <Button
            size="lg"
            onClick={handleClockToggle}
            disabled={!isClocked && !canClockIn}
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

          {isClocked && clockInTime && (
            <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border-2 border-green-200 dark:border-green-800 shadow-lg">
              <div className="flex items-center justify-between text-sm mb-3 pb-3 border-b border-green-200 dark:border-green-800">
                <span className="text-muted-foreground font-semibold">Clocked in at</span>
                <span className="font-bold text-green-700 dark:text-green-400 text-base">
                  {clockInTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-semibold">Time elapsed</span>
                <span className="font-bold text-green-700 dark:text-green-400 text-base">
                  {elapsedHours}h {elapsedMinutes}m
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Dialog open={showFieldDialog} onOpenChange={setShowFieldDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Field Work Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="location">Work Location *</Label>
              <Textarea
                id="location"
                value={fieldLocation}
                onChange={(e) => setFieldLocation(e.target.value)}
                placeholder="e.g., Client office at Victoria Island"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="reason">Reason for Field Work *</Label>
              <Textarea
                id="reason"
                value={fieldReason}
                onChange={(e) => setFieldReason(e.target.value)}
                placeholder="e.g., Client meeting, site visit, delivery"
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowFieldDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleFieldClockIn}
                disabled={!fieldReason.trim() || !fieldLocation.trim()}
              >
                Clock In
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
