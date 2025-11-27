import { useState, ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle } from 'lucide-react';
import { useFieldTrips, FieldTrip } from '@/hooks/useFieldTrips';

interface EndTripDialogProps {
  trip: FieldTrip;
  children: ReactNode;
}

export function EndTripDialog({ trip, children }: EndTripDialogProps) {
  const { endTrip } = useFieldTrips();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await endTrip(trip.id, notes);
      setOpen(false);
      setNotes('');
    } catch (error) {
      console.error('Error ending trip:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>End Field Trip</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-semibold mb-1">Trip Summary</p>
                <p className="text-blue-700 dark:text-blue-300">
                  Purpose: {trip.purpose}
                </p>
                {trip.destination_address && (
                  <p className="text-blue-700 dark:text-blue-300">
                    Destination: {trip.destination_address}
                  </p>
                )}
                <p className="text-blue-700 dark:text-blue-300 mt-2">
                  Your location will be recorded as the end point.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Trip Completion Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any final notes about the trip, expenses, or outcomes..."
                rows={4}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                disabled={loading}
              >
                {loading ? 'Ending...' : 'Complete Trip'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
