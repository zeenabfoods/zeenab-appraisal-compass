import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Car, Calendar, DollarSign } from 'lucide-react';
import { useFieldTrips } from '@/hooks/useFieldTrips';

const TRIP_PURPOSES = [
  'Procurement',
  'Client Meeting',
  'Bank Errand',
  'Document Delivery',
  'Site Visit',
  'Vendor Meeting',
  'Office Supplies',
  'Other'
];

interface StartFieldTripDialogProps {
  startTripOverride?: (tripData: {
    purpose: string;
    expected_end_time: string;
    vehicle_used?: string;
    vehicle_registration?: string;
    funds_allocated?: number;
    destination_address?: string;
    notes?: string;
  }) => Promise<any>;
}

export function StartFieldTripDialog({ startTripOverride }: StartFieldTripDialogProps) {
  const { startTrip: hookStartTrip } = useFieldTrips();
  const startTrip = startTripOverride ?? hookStartTrip;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    purpose: '',
    customPurpose: '',
    expected_end_time: '',
    vehicle_used: '',
    vehicle_registration: '',
    funds_allocated: '',
    destination_address: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const purpose = formData.purpose === 'Other' ? formData.customPurpose : formData.purpose;
      
      await startTrip({
        purpose,
        expected_end_time: new Date(formData.expected_end_time).toISOString(),
        vehicle_used: formData.vehicle_used || null,
        vehicle_registration: formData.vehicle_registration || null,
        funds_allocated: formData.funds_allocated ? parseFloat(formData.funds_allocated) : null,
        destination_address: formData.destination_address || null,
        notes: formData.notes || null
      });

      setOpen(false);
      setFormData({
        purpose: '',
        customPurpose: '',
        expected_end_time: '',
        vehicle_used: '',
        vehicle_registration: '',
        funds_allocated: '',
        destination_address: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error starting trip:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg">
          <MapPin className="mr-2 h-5 w-5" />
          Start Field Trip
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            Start Field Trip
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="purpose">Trip Purpose *</Label>
            <Select
              value={formData.purpose}
              onValueChange={(value) => setFormData({ ...formData, purpose: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select purpose" />
              </SelectTrigger>
              <SelectContent>
                {TRIP_PURPOSES.map((purpose) => (
                  <SelectItem key={purpose} value={purpose}>
                    {purpose}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.purpose === 'Other' && (
            <div className="space-y-2">
              <Label htmlFor="customPurpose">Specify Purpose *</Label>
              <Input
                id="customPurpose"
                value={formData.customPurpose}
                onChange={(e) => setFormData({ ...formData, customPurpose: e.target.value })}
                placeholder="Enter trip purpose"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="destination">Destination Address *</Label>
            <Input
              id="destination"
              value={formData.destination_address}
              onChange={(e) => setFormData({ ...formData, destination_address: e.target.value })}
              placeholder="Enter destination address"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected_end">Expected Return Time *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="expected_end"
                type="datetime-local"
                value={formData.expected_end_time}
                onChange={(e) => setFormData({ ...formData, expected_end_time: e.target.value })}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle">Vehicle Type</Label>
              <div className="relative">
                <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Select
                  value={formData.vehicle_used}
                  onValueChange={(value) => setFormData({ ...formData, vehicle_used: value })}
                >
                  <SelectTrigger className="pl-10">
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Company Car">Company Car</SelectItem>
                    <SelectItem value="Company Van">Company Van</SelectItem>
                    <SelectItem value="Personal Vehicle">Personal Vehicle</SelectItem>
                    <SelectItem value="Motorcycle">Motorcycle</SelectItem>
                    <SelectItem value="Public Transport">Public Transport</SelectItem>
                    <SelectItem value="Walking">Walking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.vehicle_used && !['Public Transport', 'Walking'].includes(formData.vehicle_used) && (
              <div className="space-y-2">
                <Label htmlFor="registration">Vehicle Reg.</Label>
                <Input
                  id="registration"
                  value={formData.vehicle_registration}
                  onChange={(e) => setFormData({ ...formData, vehicle_registration: e.target.value })}
                  placeholder="e.g., ABC 123 XY"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="funds">Allocated Funds (₦)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="funds"
                type="number"
                step="0.01"
                value={formData.funds_allocated}
                onChange={(e) => setFormData({ ...formData, funds_allocated: e.target.value })}
                className="pl-10"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
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
              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600"
              disabled={loading}
            >
              {loading ? 'Starting...' : 'Start Trip'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
