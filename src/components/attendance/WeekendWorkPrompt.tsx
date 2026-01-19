import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Calendar, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface WeekendWorkPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptDates: { saturday: string; sunday: string } | null;
  onSubmit: (selections: { saturday: boolean; sunday: boolean }) => Promise<void>;
  onDismiss: () => void;
  loading?: boolean;
}

export function WeekendWorkPrompt({
  open,
  onOpenChange,
  promptDates,
  onSubmit,
  onDismiss,
  loading = false,
}: WeekendWorkPromptProps) {
  const [workSaturday, setWorkSaturday] = useState(false);
  const [workSunday, setWorkSunday] = useState(false);

  const handleSubmit = async () => {
    await onSubmit({
      saturday: workSaturday,
      sunday: workSunday,
    });
  };

  const handleDismiss = () => {
    onDismiss();
    onOpenChange(false);
  };

  if (!promptDates) return null;

  const hasSaturday = !!promptDates.saturday;
  const hasSunday = !!promptDates.sunday;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Weekend Work Schedule
          </DialogTitle>
          <DialogDescription>
            Will you be working this weekend? Your attendance will be logged but no charges will apply.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {hasSaturday && (
            <div className="flex items-center space-x-3 p-3 rounded-lg border bg-muted/30">
              <Checkbox
                id="saturday"
                checked={workSaturday}
                onCheckedChange={(checked) => setWorkSaturday(checked === true)}
              />
              <Label htmlFor="saturday" className="flex-1 cursor-pointer">
                <span className="font-medium">Saturday</span>
                <span className="text-muted-foreground ml-2">
                  {format(parseISO(promptDates.saturday), 'MMMM d, yyyy')}
                </span>
              </Label>
            </div>
          )}

          {hasSunday && (
            <div className="flex items-center space-x-3 p-3 rounded-lg border bg-muted/30">
              <Checkbox
                id="sunday"
                checked={workSunday}
                onCheckedChange={(checked) => setWorkSunday(checked === true)}
              />
              <Label htmlFor="sunday" className="flex-1 cursor-pointer">
                <span className="font-medium">Sunday</span>
                <span className="text-muted-foreground ml-2">
                  {format(parseISO(promptDates.sunday), 'MMMM d, yyyy')}
                </span>
              </Label>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Weekend work is optional and voluntary. No charges will be applied 
            for weekend attendance regardless of your selection.
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleDismiss} className="w-full sm:w-auto">
            Not Working This Weekend
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
