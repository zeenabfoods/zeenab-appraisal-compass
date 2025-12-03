import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAttendanceNotifications } from '@/hooks/useAttendanceNotifications';

interface OvertimePromptDialogProps {
  attendanceLogId: string;
  onResponse: (approved: boolean) => void;
}

export function OvertimePromptDialog({ attendanceLogId, onResponse }: OvertimePromptDialogProps) {
  const [open, setOpen] = useState(false);
  const [responding, setResponding] = useState(false);
  const { playNotification } = useAttendanceNotifications();

  useEffect(() => {
    // Check if it's time to show the prompt (at 5pm exactly)
    const checkTime = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const fivePM = 17 * 60; // 5pm in minutes

      if (currentMinutes === fivePM) {
        setOpen(true);
        playNotification('auto_clockout_warning');
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [playNotification]);

  useEffect(() => {
    // Auto-respond "no" after 15 minutes if no response
    if (open) {
      const timeout = setTimeout(() => {
        handleResponse(false);
      }, 15 * 60 * 1000); // 15 minutes

      return () => clearTimeout(timeout);
    }
  }, [open]);

  const handleResponse = async (approved: boolean) => {
    setResponding(true);

    try {
      const { error } = await supabase
        .from('attendance_logs')
        .update({
          overtime_prompted_at: new Date().toISOString(),
          overtime_approved: approved,
          overtime_approved_at: approved ? new Date().toISOString() : null,
          overtime_start_time: approved ? new Date().toISOString() : null,
        })
        .eq('id', attendanceLogId);

      if (error) throw error;

      toast({
        title: approved ? 'Overtime Approved' : 'Overtime Declined',
        description: approved
          ? 'Your overtime hours will now be tracked.'
          : 'You will not be tracked for overtime.',
      });

      setOpen(false);
      onResponse(approved);
    } catch (error) {
      console.error('Error recording overtime response:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to record your overtime response.',
      });
    } finally {
      setResponding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-primary" />
            <DialogTitle>Overtime Work</DialogTitle>
          </div>
          <DialogDescription>
            It's 5:00 PM. Will you be working overtime today?
            <br />
            <span className="text-xs text-muted-foreground mt-2 block">
              If you don't respond within 15 minutes, we'll record it as "No".
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-4">
          <Button
            onClick={() => handleResponse(true)}
            disabled={responding}
            className="w-full"
          >
            Yes, I'll work overtime
          </Button>
          <Button
            onClick={() => handleResponse(false)}
            disabled={responding}
            variant="outline"
            className="w-full"
          >
            No, I'm finishing on time
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
