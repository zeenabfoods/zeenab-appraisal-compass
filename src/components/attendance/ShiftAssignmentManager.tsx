import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Plus, Trash2, Moon, Sun, RotateCcw, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, isWithinInterval, parseISO } from 'date-fns';

interface ShiftAssignment {
  id: string;
  employee_id: string;
  shift_type: 'day' | 'night' | 'rotating';
  start_date: string;
  end_date: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  employee?: {
    first_name: string;
    last_name: string;
    position: string;
    department: string;
  };
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  department: string;
}

const SHIFT_CONFIG = {
  day: {
    label: 'Day Shift',
    icon: Sun,
    badge: 'default' as const,
    color: 'text-foreground',
    description: '8 AM – 5 PM (standard)',
  },
  night: {
    label: 'Night Shift',
    icon: Moon,
    badge: 'secondary' as const,
    color: 'text-primary',
    description: '8 PM – 7 AM',
  },
  rotating: {
    label: 'Rotating',
    icon: RotateCcw,
    badge: 'outline' as const,
    color: 'text-muted-foreground',
    description: 'Alternating day/night',
  },
};

export function ShiftAssignmentManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: '',
    shift_type: 'night' as 'day' | 'night' | 'rotating',
    start_date: '',
    end_date: '',
    notes: '',
  });

  // Fetch all employees
  const { data: employees = [] } = useQuery<Profile[]>({
    queryKey: ['profiles-for-shift'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, position, department')
        .eq('is_active', true)
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all active shift assignments
  const { data: assignments = [], isLoading } = useQuery<ShiftAssignment[]>({
    queryKey: ['shift-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_assignments')
        .select(`
          *,
          employee:profiles!shift_assignments_employee_id_fkey(
            first_name, last_name, position, department
          )
        `)
        .eq('is_active', true)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data || []) as ShiftAssignment[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('shift_assignments').insert({
        employee_id: values.employee_id,
        shift_type: values.shift_type,
        start_date: values.start_date,
        end_date: values.end_date,
        notes: values.notes || null,
        assigned_by: user?.id,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-assignments'] });
      toast.success('Shift assignment created successfully');
      setDialogOpen(false);
      setForm({ employee_id: '', shift_type: 'night', start_date: '', end_date: '', notes: '' });
    },
    onError: (err: any) => {
      toast.error(`Failed to create assignment: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shift_assignments')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-assignments'] });
      toast.success('Shift assignment removed');
    },
    onError: (err: any) => {
      toast.error(`Failed to remove assignment: ${err.message}`);
    },
  });

  const handleSubmit = () => {
    if (!form.employee_id || !form.start_date || !form.end_date) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (new Date(form.end_date) < new Date(form.start_date)) {
      toast.error('End date must be on or after start date');
      return;
    }
    createMutation.mutate(form);
  };

  // Check today's active assignments for quick reference
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAssignments = assignments.filter(a => {
    try {
      return isWithinInterval(parseISO(todayStr), {
        start: parseISO(a.start_date),
        end: parseISO(a.end_date),
      });
    } catch { return false; }
  });

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(['night', 'day', 'rotating'] as const).map((type) => {
          const cfg = SHIFT_CONFIG[type];
          const Icon = cfg.icon;
          const count = todayAssignments.filter(a => a.shift_type === type).length;
          return (
            <Card key={type} className="border-border">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${cfg.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{cfg.label} today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                Shift Assignment Manager
              </CardTitle>
              <CardDescription className="mt-1">
                Assign employees to day, night, or rotating shifts for specific date ranges.
                The charge engine uses these assignments to exclude night-shift workers from
                day-shift absence penalties, and vice versa.
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Assignment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>How it works:</strong> When calculating daily charges, the system first checks
              this table (Option B). If no assignment exists, it analyses the employee's last 7 days
              of clock-in history — if ≥60% are night-shift logs, they're treated as a night worker
              automatically (Option C pattern detection).
            </AlertDescription>
          </Alert>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading assignments…</div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Moon className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No shift assignments yet.</p>
              <p className="text-xs mt-1">
                Without assignments, the system uses pattern detection (Option C) automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Shift Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => {
                    const cfg = SHIFT_CONFIG[a.shift_type];
                    const Icon = cfg.icon;
                    const isCurrentlyActive = (() => {
                      try {
                        return isWithinInterval(parseISO(todayStr), {
                          start: parseISO(a.start_date),
                          end: parseISO(a.end_date),
                        });
                      } catch { return false; }
                    })();

                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          {a.employee?.first_name} {a.employee?.last_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {a.employee?.position || '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                            <Badge variant={cfg.badge} className="text-xs">
                              {cfg.label}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(parseISO(a.start_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(parseISO(a.end_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          {isCurrentlyActive ? (
                            <Badge variant="default" className="text-xs">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              {new Date(a.end_date) < new Date(todayStr) ? 'Expired' : 'Upcoming'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-32 truncate">
                          {a.notes || '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(a.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Shift Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="employee">Employee <span className="text-destructive">*</span></Label>
              <Select value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Select employee…" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.first_name} {e.last_name}
                      {e.position ? ` — ${e.position}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Shift Type <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-3 gap-2">
                {(['day', 'night', 'rotating'] as const).map(type => {
                  const cfg = SHIFT_CONFIG[type];
                  const Icon = cfg.icon;
                  const selected = form.shift_type === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, shift_type: type }))}
                      className={`
                        flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 text-xs font-medium transition-all
                        ${selected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:border-muted-foreground'
                        }
                      `}
                    >
                      <Icon className={`h-4 w-4 ${selected ? '' : cfg.color}`} />
                      {cfg.label}
                      <span className="text-[10px] opacity-70 text-center leading-tight">{cfg.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start_date">Start Date <span className="text-destructive">*</span></Label>
                <Input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end_date">End Date <span className="text-destructive">*</span></Label>
                <Input
                  id="end_date"
                  type="date"
                  value={form.end_date}
                  min={form.start_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                id="notes"
                placeholder="e.g. Week 3 factory night rotation"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>

            <Alert className="py-2">
              <AlertCircle className="h-3.5 w-3.5" />
              <AlertDescription className="text-xs">
                Night-shift workers will be <strong>excluded</strong> from day-shift absence/late charges
                for this date range, and will only be penalised for missing their night shift.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving…' : 'Save Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
