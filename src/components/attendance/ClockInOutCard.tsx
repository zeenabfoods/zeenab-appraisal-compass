import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Wifi, WifiOff, AlertCircle, CheckCircle2, CloudOff } from 'lucide-react';
import { GeofenceMapView } from './GeofenceMapView';
import { cn } from '@/lib/utils';
import { useGeolocation } from '@/hooks/attendance/useGeolocation';
import { useAttendanceLogs } from '@/hooks/attendance/useAttendanceLogs';
import { useBranches } from '@/hooks/attendance/useBranches';
import { useAttendanceRules } from '@/hooks/attendance/useAttendanceRules';
import { useApiDemoMode } from '@/hooks/attendance/useApiDemoMode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { generateDeviceFingerprint, storeDeviceFingerprint, compareDeviceFingerprint } from '@/utils/deviceFingerprinting';
import { detectLocationSpoofing } from '@/utils/locationSpoofingDetection';
import { OvertimePromptDialog } from './OvertimePromptDialog';

export function ClockInOutCard() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [mode, setMode] = useState<'office' | 'field'>('office');
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [fieldReason, setFieldReason] = useState('');
  const [fieldLocation, setFieldLocation] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showEarlyClosureDialog, setShowEarlyClosureDialog] = useState(false);
  const [earlyClosureInfo, setEarlyClosureInfo] = useState<{ hoursWorked: number; requiredHours: number; chargeAmount: number } | null>(null);
  const [showApiDemoDialog, setShowApiDemoDialog] = useState(false);
  
  const { branches } = useBranches();
  const { isClocked, todayLog, clockIn, clockOut, loading: logsLoading, refetch: refetchLogs } = useAttendanceLogs();
  const { rules } = useAttendanceRules();
  const activeBranches = branches.filter(b => b.is_active);
  const activeRule = rules.find(r => r.is_active);
  const { apiDemoMode } = useApiDemoMode();

  const { 
    latitude, 
    longitude, 
    loading: geoLoading, 
    error: geoError,
  } = useGeolocation();

  // Calculate distance and check geofence for all active branches
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Find which branch the employee is within (if any)
  const branchDistances = activeBranches.map(branch => {
    if (!latitude || !longitude) return { branch, distance: null, withinGeofence: false };
    const distance = calculateDistance(latitude, longitude, branch.latitude, branch.longitude);
    const withinGeofence = distance <= branch.geofence_radius;
    return { branch, distance, withinGeofence };
  });

  // Debug log to help identify issues
  console.log('📍 Branch Geofence Check:', {
    userLocation: { latitude, longitude },
    branches: branchDistances.map(bd => ({
      name: bd.branch.name,
      distance: bd.distance ? `${Math.round(bd.distance)}m` : 'N/A',
      radius: `${bd.branch.geofence_radius}m`,
      withinGeofence: bd.withinGeofence,
      coordinates: { lat: bd.branch.latitude, lng: bd.branch.longitude }
    }))
  });

  const currentBranch = branchDistances.find(bd => bd.withinGeofence)?.branch;
  const isWithinGeofence = !!currentBranch;
  const distanceFromOffice = currentBranch && latitude && longitude 
    ? calculateDistance(latitude, longitude, currentBranch.latitude, currentBranch.longitude)
    : null;

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

  const checkEarlyClosureCondition = (): { isEarly: boolean; hoursWorked: number; requiredHours: number; chargeAmount: number } => {
    if (!todayLog || !activeRule) {
      return { isEarly: false, hoursWorked: 0, requiredHours: 9, chargeAmount: 0 };
    }

    const clockInTime = new Date(todayLog.clock_in_time);
    const now = new Date();
    const hoursWorked = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
    
    // Calculate required hours from work_start_time and work_end_time
    const workStartTime = activeRule.work_start_time || '08:00';
    const workEndTime = activeRule.work_end_time || '17:00';
    const [startH, startM] = workStartTime.split(':').map(Number);
    const [endH, endM] = workEndTime.split(':').map(Number);
    const requiredHours = (endH * 60 + endM - startH * 60 - startM) / 60;
    
    // Check if current time is before work end time
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentMinutes = currentHour * 60 + currentMinute;
    const endMinutes = endH * 60 + endM;
    
    const isBeforeEndTime = currentMinutes < endMinutes;
    const hasNotCompletedHours = hoursWorked < requiredHours;
    
    const chargeAmount = activeRule.early_closure_charge_amount || 750;
    
    return {
      isEarly: isBeforeEndTime && hasNotCompletedHours,
      hoursWorked: Math.round(hoursWorked * 100) / 100,
      requiredHours,
      chargeAmount
    };
  };

  const handleClockToggle = async () => {
    // Block clock action if API Demo Mode is enabled
    if (apiDemoMode) {
      setShowApiDemoDialog(true);
      return;
    }
    if (isClocked && todayLog) {
      // Check for early closure if in office mode
      if (todayLog.location_type === 'office') {
        const earlyCheck = checkEarlyClosureCondition();
        
        if (earlyCheck.isEarly) {
          setEarlyClosureInfo(earlyCheck);
          setShowEarlyClosureDialog(true);
          return;
        }
      }
      
      await clockOut(
        latitude,
        longitude,
        mode === 'office' ? isWithinGeofence : undefined,
        false // not early closure
      );
    } else {
      const securityCheck = await performSecurityChecks();
      
      if (!securityCheck.passed) {
        return;
      }
 
      if (mode === 'field') {
        setShowFieldDialog(true);
      } else if (mode === 'office') {
        if (activeBranches.length === 0) {
          toast.error('No Active Branch', {
            description: 'No active branch configured. Contact HR.',
          });
          return;
        }
        
        // Validate geofence status before allowing clock-in
        if (!isWithinGeofence) {
          toast.error('Cannot Clock In', {
            description: 'You are outside any office geofence. Please move closer to an office branch to clock in.',
          });
          return;
        }
        
        await clockIn({
          locationType: 'office',
          latitude,
          longitude,
          branchId: currentBranch!.id,
          withinGeofence: isWithinGeofence,
          geofenceDistance: distanceFromOffice,
        });
      }
    }
  };

  const handleEarlyClosureConfirm = async () => {
    setShowEarlyClosureDialog(false);
    await clockOut(
      latitude,
      longitude,
      mode === 'office' ? isWithinGeofence : undefined,
      true // early closure confirmed
    );
  };

  const handleGoToFieldTrip = () => {
    setShowEarlyClosureDialog(false);
    setMode('field');
    setShowFieldDialog(true);
  };

  // Allow external triggers (e.g., bottom nav fingerprint button) to toggle clock
  useEffect(() => {
    const handleExternalToggle = () => {
      // Reuse the same clock in/out logic
      void handleClockToggle();
    };

    window.addEventListener('attendance-toggle-clock', handleExternalToggle);
    return () => {
      window.removeEventListener('attendance-toggle-clock', handleExternalToggle);
    };
  }, [handleClockToggle]);

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

  const canClockIn = mode === 'field' || (mode === 'office' && activeBranches.length > 0 && !geoLoading);
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
      <Card className="p-8 bg-gradient-to-b from-black via-zinc-950 to-black border border-attendance-primary/20 shadow-[0_20px_60px_rgba(255,107,53,0.3)]">
        <div className="text-center text-white/60 font-semibold flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-attendance-primary border-t-transparent rounded-full animate-spin" />
          Loading attendance data...
        </div>
      </Card>
    );
  }

  return (
    <>
      {showMap && <GeofenceMapView onClose={() => setShowMap(false)} />}
      
      <Card className="overflow-hidden bg-gradient-to-b from-black via-zinc-950 to-black shadow-[0_20px_60px_rgba(255,107,53,0.3)] border border-attendance-primary/20 w-full max-w-full relative">
        {/* Animated Glowing Orb Background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <div className="relative w-64 h-64 sm:w-80 sm:h-80">
            {/* Multiple glowing rings for depth */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-attendance-primary/30 to-orange-600/30 blur-3xl animate-pulse" 
                 style={{ animationDuration: '3s' }} />
            <div className="absolute inset-8 rounded-full bg-gradient-to-r from-attendance-primary/40 to-orange-500/40 blur-2xl animate-pulse" 
                 style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
            <div className="absolute inset-16 rounded-full bg-attendance-primary/50 blur-xl animate-pulse" 
                 style={{ animationDuration: '2.5s', animationDelay: '1s' }} />
            
            {/* Spinning ring effect */}
            <svg className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: '8s' }}>
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                fill="none"
                stroke="url(#gradient1)"
                strokeWidth="2"
                strokeDasharray="4 8"
                opacity="0.6"
              />
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--attendance-primary))" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="hsl(var(--attendance-primary))" stopOpacity="0.1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Date/Time Banner */}
        <div className="bg-gradient-to-r from-attendance-primary via-orange-600 to-attendance-primary text-white px-3 sm:px-6 py-3 flex items-center justify-between w-full relative z-10 shadow-lg shadow-attendance-primary/20">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="font-bold truncate text-sm tracking-wide">{dayName}, {dateStr}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isOnline ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
            <span className="text-xs font-semibold">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>

        <div className="p-4 sm:p-8 w-full max-w-full relative z-10">
          {/* Hero Time Display */}
          <div className="text-center mb-4 sm:mb-6 w-full">
            <div className="text-xs uppercase tracking-widest text-white/60 mb-3 font-bold">
              {isClocked ? 'Currently Active' : 'Ready to Start'}
            </div>
            <div className="text-6xl sm:text-7xl md:text-8xl font-black text-white tracking-tighter mb-2 break-all relative">
              <span className="relative inline-block" style={{
                textShadow: '0 0 40px hsl(var(--attendance-primary)), 0 0 80px hsl(var(--attendance-primary) / 0.5), 0 0 120px hsl(var(--attendance-primary) / 0.3)'
              }}>
                {timeStr}
              </span>
            </div>
            {isClocked && clockInTime && (
              <div className="mt-4 sm:mt-6 inline-flex items-center gap-3 px-4 sm:px-6 py-3 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 max-w-full">
                <span className="text-xs uppercase tracking-wider text-white/70 whitespace-nowrap font-semibold">Duration</span>
                <span className="text-2xl font-black text-white whitespace-nowrap" style={{
                  textShadow: '0 0 20px hsl(var(--attendance-primary) / 0.5)'
                }}>
                  {elapsedHours}h {elapsedMinutes}m {elapsedSeconds}s
                </span>
              </div>
            )}
          </div>

          {/* Mode Toggles */}
          <div className="flex gap-2 sm:gap-3 mb-4 sm:mb-6 w-full max-w-full">
            <Button
              variant={mode === 'office' ? 'default' : 'outline'}
              size="lg"
              className={cn(
                "flex-1 h-14 font-bold tracking-wide transition-all duration-300",
                mode === 'office' 
                  ? "bg-gradient-to-r from-attendance-primary to-orange-600 hover:from-orange-600 hover:to-attendance-primary text-white shadow-lg shadow-attendance-primary/30 border-0" 
                  : "border-2 border-white/20 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/30 backdrop-blur-sm"
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
                "flex-1 h-14 font-bold tracking-wide transition-all duration-300",
                mode === 'field' 
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-blue-600 hover:to-cyan-500 text-white shadow-lg shadow-cyan-500/30 border-0" 
                  : "border-2 border-white/20 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/30 backdrop-blur-sm"
              )}
              onClick={() => setMode('field')}
            >
              <MapPin className="w-4 h-4 mr-2" />
              On Field
            </Button>
          </div>

          {/* Geofence Status */}
          {mode === 'office' && activeBranches.length > 0 && (
            <div className="mb-4 sm:mb-6 p-4 sm:p-5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-white uppercase tracking-wider">Location Status</span>
                {apiDemoMode ? (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 shadow-lg shadow-amber-500/30 font-bold">
                    <CloudOff className="w-3 h-3 mr-1" />
                    Connect to API
                  </Badge>
                ) : geoLoading ? (
                  <Badge variant="secondary" className="animate-pulse bg-white/10 text-white border-white/20">Detecting...</Badge>
                ) : isWithinGeofence && currentBranch ? (
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-lg shadow-green-500/30 font-bold">✓ Inside {currentBranch.name}</Badge>
                ) : (
                  <Badge className="bg-gradient-to-r from-red-500 to-rose-600 text-white border-0 shadow-lg shadow-red-500/30 font-bold">⚠ Outside Office</Badge>
                )}
              </div>
              {apiDemoMode && (
                <p className="text-xs text-amber-400 mt-2 flex items-center gap-1 font-semibold">
                  <CloudOff className="w-3 h-3" />
                  Please connect to API for location services
                </p>
              )}
              {!apiDemoMode && geoError && (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3 h-3" />
                  {geoError}
                </p>
              )}
              {!apiDemoMode && !geoLoading && currentBranch && distanceFromOffice !== null && (
                <p className="text-xs text-white/60 mt-2 font-medium">
                  Distance: ~{Math.round(distanceFromOffice)}m from {currentBranch.name}
                </p>
              )}
              {apiDemoMode && branchDistances.length > 0 && (
                <div className="mt-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <p className="text-xs font-semibold text-amber-400 mb-2">📏 Distance to Branches:</p>
                  {branchDistances.map(bd => (
                    <p key={bd.branch.id} className="text-xs text-amber-400/80 mt-1">
                      {bd.branch.name}: <span className="text-amber-300">Connect to API for distance matrix calculation</span>
                    </p>
                  ))}
                </div>
              )}
              {!apiDemoMode && !geoLoading && !currentBranch && branchDistances.length > 0 && (
                <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-xs font-semibold text-white/80 mb-2">📏 Distance to Branches:</p>
                  {branchDistances.map(bd => bd.distance && (
                    <p key={bd.branch.id} className="text-xs text-white/60 mt-1">
                      {bd.branch.name}: <span className={bd.withinGeofence ? "text-green-400" : "text-red-400"}>
                        {Math.round(bd.distance)}m
                      </span> (radius: {bd.branch.geofence_radius}m)
                    </p>
                  ))}
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => setShowMap(true)}
                size="sm"
                disabled={apiDemoMode}
                className={cn(
                  "w-full mt-3 border-2 font-bold tracking-wide transition-all duration-300",
                  apiDemoMode 
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400 cursor-not-allowed opacity-60"
                    : "border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/40"
                )}
              >
                <MapPin className="h-4 w-4 mr-2" />
                {apiDemoMode ? 'Connect to API to View Map' : 'View Map'}
              </Button>
            </div>
          )}

          {mode === 'office' && activeBranches.length === 0 && (
            <div className="mb-6 p-4 bg-amber-500/10 backdrop-blur-sm rounded-2xl border border-amber-500/30">
              <p className="text-sm text-amber-400 flex items-center gap-2 font-semibold">
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
              "w-full h-16 text-xl font-black uppercase tracking-wider transition-all duration-300 disabled:opacity-30",
              isClocked
                ? "bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-rose-600 hover:via-red-600 hover:to-rose-600 text-white shadow-2xl shadow-red-600/40 border-0"
                : "bg-gradient-to-r from-attendance-primary via-orange-600 to-attendance-primary hover:from-orange-600 hover:via-attendance-primary hover:to-orange-600 text-white shadow-2xl shadow-attendance-primary/40 border-0"
            )}
          >
            {isClocked ? (
              <>
                <Clock className="w-6 h-6 mr-3" />
                Clock Out
              </>
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6 mr-3" />
                Clock In
              </>
            )}
          </Button>
        </div>
      </Card>

      {todayLog && todayLog.location_type === 'office' && !todayLog.clock_out_time && (
        <OvertimePromptDialog
          attendanceLogId={todayLog.id}
          onResponse={(approved) => {
            if (approved) {
              toast.success('Overtime Tracking Started', {
                description: 'Your overtime hours are now being tracked.',
              });
            }
            refetchLogs();
          }}
          onAutoClockOut={async () => {
            if (latitude && longitude) {
              await clockOut(latitude, longitude);
              refetchLogs();
            }
          }}
        />
      )}

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

      {/* Early Closure Warning Dialog */}
      <Dialog open={showEarlyClosureDialog} onOpenChange={setShowEarlyClosureDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-destructive flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              Early Clock-Out Warning
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              You are about to clock out for the day and you have not completed your required hours.
            </DialogDescription>
          </DialogHeader>
          
          {earlyClosureInfo && (
            <div className="space-y-4 py-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Hours Worked:</span>
                  <span className="font-bold">{earlyClosureInfo.hoursWorked.toFixed(2)} hours</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Required Hours:</span>
                  <span className="font-bold">{earlyClosureInfo.requiredHours} hours</span>
                </div>
                <div className="flex justify-between text-sm border-t border-destructive/20 pt-2 mt-2">
                  <span className="text-muted-foreground">Remaining:</span>
                  <span className="font-bold text-destructive">
                    {(earlyClosureInfo.requiredHours - earlyClosureInfo.hoursWorked).toFixed(2)} hours
                  </span>
                </div>
              </div>
              
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">
                  ⚠️ A charge of ₦{earlyClosureInfo.chargeAmount.toLocaleString()} will be applied to your account.
                </p>
                <p className="text-xs text-muted-foreground">
                  If you are going on a field trip, click "Go to Field Trip" instead. 
                  Otherwise, contact HR for appropriate permission before clocking out early.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button 
              variant="destructive" 
              onClick={handleEarlyClosureConfirm}
              className="w-full"
            >
              Clock Out & Accept Charge
            </Button>
            <Button 
              variant="default"
              onClick={handleGoToFieldTrip}
              className="w-full bg-cyan-600 hover:bg-cyan-700"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Go to Field Trip
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowEarlyClosureDialog(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Demo Mode Dialog */}
      <Dialog open={showApiDemoDialog} onOpenChange={setShowApiDemoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <CloudOff className="h-5 w-5" />
              API Connection Required
            </DialogTitle>
            <DialogDescription className="pt-2">
              This feature requires Google Maps API and OneSignal Push Notification services to be connected.
              <br /><br />
              <strong>Please contact HR/Admin to enable API connectivity.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowApiDemoDialog(false)} className="w-full">
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
