import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Battery, Signal, Camera, FileCheck, Navigation } from 'lucide-react';
import { useFieldTrips } from '@/hooks/useFieldTrips';
import { EvidenceCaptureDialog } from './EvidenceCaptureDialog';
import { EndTripDialog } from './EndTripDialog';
import { formatDistanceToNow } from 'date-fns';

export function ActiveTripTracker() {
  const { activeTrip, recordLocationPoint } = useFieldTrips();
  const [battery, setBattery] = useState(100);
  const [network, setNetwork] = useState('Unknown');
  const [lastPing, setLastPing] = useState<Date | null>(null);

  useEffect(() => {
    if (!activeTrip) return;

    // Track location every 15 minutes (hybrid approach)
    const interval = setInterval(async () => {
      await recordLocationPoint(activeTrip.id);
      setLastPing(new Date());
    }, 15 * 60 * 1000); // 15 minutes

    // Initial ping
    recordLocationPoint(activeTrip.id);
    setLastPing(new Date());

    // Monitor battery
    const updateBattery = async () => {
      try {
        const batteryManager = await (navigator as any).getBattery();
        setBattery(Math.round(batteryManager.level * 100));
        
        batteryManager.addEventListener('levelchange', () => {
          setBattery(Math.round(batteryManager.level * 100));
        });
      } catch {}
    };
    updateBattery();

    // Monitor network
    const connection = (navigator as any).connection;
    if (connection) {
      setNetwork(connection.effectiveType || 'Unknown');
      connection.addEventListener('change', () => {
        setNetwork(connection.effectiveType || 'Unknown');
      });
    }

    return () => clearInterval(interval);
  }, [activeTrip]);

  if (!activeTrip) return null;

  const isOverdue = new Date(activeTrip.expected_end_time) < new Date();

  return (
    <Card className="p-6 bg-gradient-to-br from-orange-50/80 to-amber-50/80 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200/60 dark:border-orange-800/60 shadow-lg">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
              <Navigation className="h-5 w-5 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">Active Field Trip</h3>
              <p className="text-sm text-muted-foreground">
                Started {formatDistanceToNow(new Date(activeTrip.start_time), { addSuffix: true })}
              </p>
            </div>
          </div>
          <Badge className={isOverdue ? 'bg-red-500' : 'bg-green-500'}>
            {isOverdue ? 'Overdue' : 'On Time'}
          </Badge>
        </div>

        <div className="space-y-3 bg-white/50 dark:bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Purpose:</span>
            <span className="font-semibold">{activeTrip.purpose}</span>
          </div>
          
          {activeTrip.destination_address && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Destination:</span>
              <span className="font-medium text-right max-w-[200px] truncate">{activeTrip.destination_address}</span>
            </div>
          )}

          {activeTrip.vehicle_used && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Vehicle:</span>
              <span className="font-medium">
                {activeTrip.vehicle_used}
                {activeTrip.vehicle_registration && ` (${activeTrip.vehicle_registration})`}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Expected Return:</span>
            <span className="font-medium">
              {new Date(activeTrip.expected_end_time).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2 text-xs bg-white/50 dark:bg-gray-900/50 rounded-lg p-3">
            <Battery className={`h-4 w-4 ${battery < 20 ? 'text-red-500' : 'text-green-500'}`} />
            <span>{battery}%</span>
          </div>
          <div className="flex items-center gap-2 text-xs bg-white/50 dark:bg-gray-900/50 rounded-lg p-3">
            <Signal className="h-4 w-4 text-blue-500" />
            <span>{network}</span>
          </div>
          <div className="flex items-center gap-2 text-xs bg-white/50 dark:bg-gray-900/50 rounded-lg p-3">
            <Clock className="h-4 w-4 text-purple-500" />
            <span>{lastPing ? formatDistanceToNow(lastPing, { addSuffix: true }) : 'Never'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <EvidenceCaptureDialog tripId={activeTrip.id}>
            <Button variant="outline" className="w-full">
              <Camera className="mr-2 h-4 w-4" />
              Add Evidence
            </Button>
          </EvidenceCaptureDialog>

          <EndTripDialog trip={activeTrip}>
            <Button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700">
              <FileCheck className="mr-2 h-4 w-4" />
              End Trip
            </Button>
          </EndTripDialog>
        </div>
      </div>
    </Card>
  );
}
