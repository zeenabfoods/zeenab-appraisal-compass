import { useState } from 'react';
import { Plus, Clock, Trash2, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useBreakSchedules } from '@/hooks/attendance/useBreakSchedules';
import { Skeleton } from '@/components/ui/skeleton';

export function BreakScheduleConfig() {
  const { schedules, loading, createSchedule, updateSchedule, deleteSchedule } = useBreakSchedules();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [formData, setFormData] = useState({
    break_name: '',
    break_type: 'lunch',
    scheduled_start_time: '12:00',
    scheduled_end_time: '13:00',
    duration_minutes: 60,
    is_mandatory: false,
    notification_minutes_before: 5,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSchedule) {
        await updateSchedule(editingSchedule.id, formData);
      } else {
        await createSchedule({
          ...formData,
          is_active: true,
          applies_to_departments: null,
        });
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      break_name: '',
      break_type: 'lunch',
      scheduled_start_time: '12:00',
      scheduled_end_time: '13:00',
      duration_minutes: 60,
      is_mandatory: false,
      notification_minutes_before: 5,
    });
    setEditingSchedule(null);
  };

  const handleEdit = (schedule: any) => {
    setEditingSchedule(schedule);
    setFormData({
      break_name: schedule.break_name,
      break_type: schedule.break_type,
      scheduled_start_time: schedule.scheduled_start_time,
      scheduled_end_time: schedule.scheduled_end_time,
      duration_minutes: schedule.duration_minutes,
      is_mandatory: schedule.is_mandatory,
      notification_minutes_before: schedule.notification_minutes_before,
    });
    setIsDialogOpen(true);
  };

  const getBreakTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'lunch': 'Lunch',
      'short_break': 'Short Break',
      'afternoon_break': 'Afternoon Break',
    };
    return labels[type] || type;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Break Schedules</CardTitle>
            <CardDescription>Configure break times and automatic notifications for employees</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Schedule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSchedule ? 'Edit' : 'Create'} Break Schedule</DialogTitle>
                <DialogDescription>
                  Configure break times and employees will receive notifications
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="break_name">Break Name</Label>
                  <Input
                    id="break_name"
                    value={formData.break_name}
                    onChange={(e) => setFormData({ ...formData, break_name: e.target.value })}
                    placeholder="e.g., Lunch Break"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="break_type">Break Type</Label>
                  <Select
                    value={formData.break_type}
                    onValueChange={(value) => setFormData({ ...formData, break_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lunch">Lunch Break</SelectItem>
                      <SelectItem value="short_break">Short Break</SelectItem>
                      <SelectItem value="afternoon_break">Afternoon Break</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={formData.scheduled_start_time}
                      onChange={(e) => setFormData({ ...formData, scheduled_start_time: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={formData.scheduled_end_time}
                      onChange={(e) => setFormData({ ...formData, scheduled_end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="5"
                    max="120"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notification">Notify Before (minutes)</Label>
                  <Input
                    id="notification"
                    type="number"
                    min="0"
                    max="30"
                    value={formData.notification_minutes_before}
                    onChange={(e) => setFormData({ ...formData, notification_minutes_before: parseInt(e.target.value) })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Employees will be notified this many minutes before break time
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="mandatory">Mandatory Break</Label>
                    <p className="text-xs text-muted-foreground">
                      Track if employees take this break on time
                    </p>
                  </div>
                  <Switch
                    id="mandatory"
                    checked={formData.is_mandatory}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_mandatory: checked })}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingSchedule ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No break schedules configured</p>
            <p className="text-sm">Add your first break schedule to enable notifications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {schedule.break_name}
                      {schedule.is_mandatory && (
                        <Badge variant="secondary" className="text-xs">Mandatory</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getBreakTypeLabel(schedule.break_type)} • 
                      {schedule.scheduled_start_time.slice(0, 5)} - {schedule.scheduled_end_time.slice(0, 5)} •
                      {schedule.duration_minutes} min •
                      Notify {schedule.notification_minutes_before} min before
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(schedule)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSchedule(schedule.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
