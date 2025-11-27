import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Car, DollarSign, Eye } from 'lucide-react';
import { FieldTrip } from '@/hooks/useFieldTrips';
import { format } from 'date-fns';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FieldTripMapTracker } from './FieldTripMapTracker';

interface FieldTripHistoryProps {
  trips: FieldTrip[];
  loading: boolean;
}

export function FieldTripHistory({ trips, loading }: FieldTripHistoryProps) {
  const [selectedTrip, setSelectedTrip] = useState<FieldTrip | null>(null);

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

  if (trips.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Calendar className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Trip History</h3>
        <p className="text-muted-foreground">
          Your completed field trips will appear here
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {trips.map((trip) => (
          <Card key={trip.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-lg">{trip.purpose}</h3>
                  <Badge variant={trip.status === 'completed' ? 'default' : 'secondary'}>
                    {trip.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(trip.start_time), 'PPp')}</span>
                  </div>

                  {trip.destination_address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{trip.destination_address}</span>
                    </div>
                  )}

                  {trip.vehicle_used && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Car className="h-4 w-4" />
                      <span>{trip.vehicle_used}</span>
                    </div>
                  )}

                  {trip.funds_allocated && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>₦{trip.funds_allocated.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {trip.total_distance_km && (
                  <p className="text-sm text-muted-foreground">
                    Distance traveled: {trip.total_distance_km.toFixed(2)} km
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTrip(trip)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Route
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Trip Route - {selectedTrip?.purpose}</DialogTitle>
          </DialogHeader>
          {selectedTrip && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Started:</span>
                  <p className="font-medium">{format(new Date(selectedTrip.start_time), 'PPp')}</p>
                </div>
                {selectedTrip.actual_end_time && (
                  <div>
                    <span className="text-muted-foreground">Ended:</span>
                    <p className="font-medium">{format(new Date(selectedTrip.actual_end_time), 'PPp')}</p>
                  </div>
                )}
              </div>
              <FieldTripMapTracker tripId={selectedTrip.id} showRoute={true} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
