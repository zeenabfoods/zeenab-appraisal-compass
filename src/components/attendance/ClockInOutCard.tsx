import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Wifi, WifiOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { GeofenceMapView } from './GeofenceMapView';
import { cn } from '@/lib/utils';
import { useGeolocation } from '@/hooks/attendance/useGeolocation';
import { useAttendanceLogs } from '@/hooks/attendance/useAttendanceLogs';
import { useBranches } from '@/hooks/attendance/useBranches';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { generateDeviceFingerprint, storeDeviceFingerprint, compareDeviceFingerprint } from '@/utils/deviceFingerprinting';
import { detectLocationSpoofing } from '@/utils/locationSpoofingDetection';

export function ClockInOutCard() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [mode, setMode] = useState<'office' | 'field'>('office');
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [fieldReason, setFieldReason] = useState('');
  const [fieldLocation, setFieldLocation] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { branches } = useBranches();
  const { isClocked, todayLog, clockIn, clockOut, loading: logsLoading, refetch: refetchLogs } = useAttendanceLogs();
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

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Listen for pull-to-refresh events
  useEffect(() => {
    const handleRefresh = () => {
      refetchLogs();
    };
    window.addEventListener('attendance-refresh', handleRefresh);
    return () => window.removeEventListener('attendance-refresh', handleRefresh);
  }, [refetchLogs]);

  const performSecurityChecks = async (): Promise<{ passed: boolean; warnings: string[] }> => {
    const warnings: string[] = [];
    
    try {
      const fingerprint = await generateDeviceFingerprint();
      const deviceComparison = await compareDeviceFingerprint();
      
      if (!deviceComparison.isMatch && deviceComparison.similarityScore < 50) {
        warnings.push('⚠️ Device verification failed. Different device detected.');
      } else if (!deviceComparison.isMatch) {
        warnings.push('⚠️ Device changes detected: ' + deviceComparison.changes.slice(0, 2).join(', '));
      }
      
      if (deviceComparison.similarityScore === 0) {
        storeDeviceFingerprint(fingerprint);
      }

      if (latitude && longitude) {
        const locationCheck = await detectLocationSpoofing(
          latitude,
          longitude,
          10,
          undefined,
          undefined
        );

        if (locationCheck.isSuspicious) {
          warnings.push('🚨 Suspicious location detected: ' + locationCheck.suspicionReasons[0]);
          toast.error('Security Alert', {
            description: 'Suspicious location activity detected. This will be logged.',
          });
        }

        if (locationCheck.warnings.length > 0) {
          warnings.push('⚠️ Location warning: ' + locationCheck.warnings[0]);
        }

        if (locationCheck.confidenceScore < 40) {
          toast.error('Clock-in Blocked', {
            description: 'Location security check failed. Please ensure GPS is enabled.',
          });
          return { passed: false, warnings };
        }
      }

      if (warnings.length > 0) {
        toast.warning('Security Warnings', {
          description: warnings[0],
        });
      } else {
        toast.success('Security Check Passed', {
          description: 'All security verifications completed.',
        });
      }

      return { passed: true, warnings };
    } catch (error) {
      console.error('Security check error:', error);
      toast.error('Security check failed. Please try again.');
      return { passed: false, warnings: ['Security check failed'] };
    }
  };

  const handleClockToggle = async () => {
    if (isClocked && todayLog) {
      await clockOut(latitude, longitude, mode === 'office' ? isWithinGeofence : undefined);
    } else {
      const securityCheck = await performSecurityChecks();
      
      if (!securityCheck.passed) {
        return;
      }

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
  const elapsedSeconds = Math.floor((elapsedMs % (1000 * 60)) / 1000);

  // Format time parts
  const dayName = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = currentTime.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  if (logsLoading) {
    return (
      <Card className="p-8 bg-white">
        <div className="text-center text-muted-foreground">Loading attendance data...</div>
      </Card>
    );
  }

  return (
    <>
      {showMap && <GeofenceMapView onClose={() => setShowMap(false)} />}
      
      <Card className="overflow-hidden bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] border-attendance-card-border">
        {/* Date/Time Banner */}
        <div className="bg-attendance-primary text-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{dayName}, {dateStr}</span>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
            <span className="text-xs">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>

        <div className="p-8">
          {/* Hero Time Display */}
          <div className="text-center mb-6">
            <div className="text-sm text-muted-foreground mb-2 font-medium">
              {isClocked ? 'Clocked In' : 'Clock In'}
            </div>
            <div className="text-6xl md:text-7xl font-bold text-attendance-primary tracking-tight mb-2">
              {timeStr}
            </div>
            {isClocked && clockInTime && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Work Duration</span>
                <span className="text-lg font-bold text-foreground">
                  {elapsedHours}h {elapsedMinutes}m {elapsedSeconds}s
                </span>
              </div>
            )}
          </div>

          {/* Mode Toggles */}
          <div className="flex gap-3 mb-6">
            <Button
              variant={mode === 'office' ? 'default' : 'outline'}
              size="lg"
              className={cn(
                "flex-1 h-12",
                mode === 'office' 
                  ? "bg-attendance-primary hover:bg-attendance-primary-hover text-white" 
                  : "border-2 hover:bg-muted"
              )}
              onClick={() => setMode('office')}
            >
              <MapPin className="w-4 h-4 mr-2" />
              In Office
            </Button>
            <Button
              variant={mode === 'field' ? 'default' : 'outline'}
              size="lg"
              className={cn(
                "flex-1 h-12",
                mode === 'field' 
                  ? "bg-attendance-info hover:opacity-90 text-white" 
                  : "border-2 hover:bg-muted"
              )}
              onClick={() => setMode('field')}
            >
              <MapPin className="w-4 h-4 mr-2" />
              On Field
            </Button>
          </div>

          {/* Geofence Status */}
          {mode === 'office' && activeBranch && (
            <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Geofence Status</span>
                {geoLoading ? (
                  <Badge variant="secondary" className="animate-pulse">Detecting...</Badge>
                ) : isWithinGeofence ? (
                  <Badge className="bg-attendance-success text-white">✓ Inside {activeBranch.name}</Badge>
                ) : (
                  <Badge variant="destructive">⚠ Outside Office</Badge>
                )}
              </div>
              {geoError && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {geoError}
                </p>
              )}
              {!geoLoading && distanceFromOffice !== null && (
                <p className="text-xs text-muted-foreground mt-2">
                  Distance: ~{Math.round(distanceFromOffice)}m from {activeBranch.name}
                </p>
              )}
              <Button
                variant="outline"
                onClick={() => setShowMap(true)}
                size="sm"
                className="w-full mt-3 border-attendance-primary/30 hover:bg-attendance-primary/5 hover:border-attendance-primary"
              >
                <MapPin className="h-4 w-4 mr-2" />
                View Map
              </Button>
            </div>
          )}

          {mode === 'office' && !activeBranch && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                No active branch configured. Contact HR.
              </p>
            </div>
          )}

          {/* Main Action Button */}
          <Button
            size="lg"
            onClick={handleClockToggle}
            disabled={!isClocked && !canClockIn}
            className={cn(
              "w-full h-14 text-lg font-semibold",
              isClocked
                ? "bg-attendance-danger hover:opacity-90 text-white"
                : "bg-attendance-primary hover:bg-attendance-primary-hover text-white"
            )}
          >
            {isClocked ? (
              <>
                <Clock className="w-5 h-5 mr-2" />
                Clock Out
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Clock In
              </>
            )}
          </Button>
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
                className="bg-attendance-primary hover:bg-attendance-primary-hover"
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
