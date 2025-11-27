import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Battery, Eye, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FieldTripMapTracker } from './FieldTripMapTracker';

interface ActiveFieldTrip {
  id: string;
  employee_id: string;
  purpose: string;
  start_time: string;
  expected_end_time: string;
  destination_address: string | null;
  vehicle_used: string | null;
  status: string;
  employee_name: string;
  latest_location?: {
    latitude: number;
    longitude: number;
    battery_level: number;
    timestamp: string;
  };
}

export function ManagerFieldWorkView() {
  const [activeTrips, setActiveTrips] = useState<ActiveFieldTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null);

  useEffect(() => {
    loadActiveTrips();
    
    // Refresh every 2 minutes
    const interval = setInterval(loadActiveTrips, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const loadActiveTrips = async () => {
    try {
      // Get all active field trips with employee names
      const { data: trips, error: tripsError } = await supabase
        .from('field_trips')
        .select(`
          *,
          profiles!field_trips_employee_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq('status', 'active')
        .order('start_time', { ascending: false });

      if (tripsError) throw tripsError;

      // Get latest location for each trip
      const tripsWithLocations = await Promise.all(
        (trips || []).map(async (trip: any) => {
          const { data: latestPoint } = await supabase
            .from('location_points')
            .select('latitude, longitude, battery_level, timestamp')
            .eq('trip_id', trip.id)
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();

          return {
            ...trip,
            employee_name: `${trip.profiles?.first_name || ''} ${trip.profiles?.last_name || ''}`.trim(),
            latest_location: latestPoint || undefined
          };
        })
      );

      setActiveTrips(tripsWithLocations);
    } catch (error) {
      console.error('Error loading active trips:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-12 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mx-auto" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2 mx-auto" />
        </div>
      </Card>
    );
  }

  if (activeTrips.length === 0) {
    return (
      <Card className="p-12 text-center">
        <MapPin className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Active Field Trips</h3>
        <p className="text-muted-foreground">
          No employees are currently on field assignments
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {activeTrips.map((trip) => {
          const isOverdue = new Date(trip.expected_end_time) < new Date();
          const lastPing = trip.latest_location?.timestamp 
            ? formatDistanceToNow(new Date(trip.latest_location.timestamp), { addSuffix: true })
            : 'No location data';

          return (
            <Card key={trip.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-600 text-white">
                      {trip.employee_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-3 flex-1">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{trip.employee_name}</h3>
                        <Badge variant={isOverdue ? 'destructive' : 'default'}>
                          {isOverdue ? 'Overdue' : 'On Time'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{trip.purpose}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Started {formatDistanceToNow(new Date(trip.start_time), { addSuffix: true })}</span>
                      </div>

                      {trip.latest_location && (
                        <div className="flex items-center gap-2">
                          <Battery className={`h-4 w-4 ${trip.latest_location.battery_level < 20 ? 'text-red-500' : 'text-green-500'}`} />
                          <span>{trip.latest_location.battery_level}%</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{lastPing}</span>
                      </div>
                    </div>

                    {trip.destination_address && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {trip.destination_address}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {isOverdue && (
                    <Button variant="outline" size="sm" className="text-red-600 border-red-300">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Alert
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTrip(trip.id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Track
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Live Trip Tracking</DialogTitle>
          </DialogHeader>
          {selectedTrip && (
            <FieldTripMapTracker tripId={selectedTrip} showRoute={true} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
