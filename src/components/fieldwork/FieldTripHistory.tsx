import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Car, DollarSign, Eye, Trash2 } from 'lucide-react';
import { FieldTrip } from '@/hooks/useFieldTrips';
import { format } from 'date-fns';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FieldTripMapTracker } from './FieldTripMapTracker';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface FieldTripHistoryProps {
  trips: FieldTrip[];
  loading: boolean;
  onTripDeleted?: () => void;
}

export function FieldTripHistory({ trips, loading, onTripDeleted }: FieldTripHistoryProps) {
  const [selectedTrip, setSelectedTrip] = useState<FieldTrip | null>(null);
  const [tripToDelete, setTripToDelete] = useState<FieldTrip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { profile } = useAuth();

  const isHROrAdmin = profile?.role === 'hr' || profile?.role === 'admin';

  const handleDeleteTrip = async () => {
    if (!tripToDelete) return;
    
    setIsDeleting(true);
    try {
      // First delete location points associated with this trip
      const { error: pointsError } = await supabase
        .from('location_points')
        .delete()
        .eq('trip_id', tripToDelete.id);

      if (pointsError) throw pointsError;

      // Then delete the trip itself
      const { error: tripError } = await supabase
        .from('field_trips')
        .delete()
        .eq('id', tripToDelete.id);

      if (tripError) throw tripError;

      toast.success('Field trip deleted successfully');
      setTripToDelete(null);
      onTripDeleted?.();
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast.error('Failed to delete field trip');
    } finally {
      setIsDeleting(false);
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

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTrip(trip)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Route
                </Button>
                
                {isHROrAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTripToDelete(trip)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
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

      <AlertDialog open={!!tripToDelete} onOpenChange={() => setTripToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Field Trip</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this field trip record? This will permanently remove the trip
              and all its location tracking data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTrip}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
