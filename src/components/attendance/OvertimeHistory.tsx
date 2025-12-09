import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Clock, TrendingUp, Loader2 } from 'lucide-react';

interface OvertimeRecord {
  id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  overtime_hours: number | null;
  overtime_amount: number | null;
  overtime_approved: boolean | null;
  overtime_start_time: string | null;
  is_night_shift: boolean | null;
}

export function OvertimeHistory() {
  const { user, profile } = useAuth();
  const [records, setRecords] = useState<OvertimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ hours: 0, amount: 0 });

  useEffect(() => {
    const fetchOvertimeHistory = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('attendance_logs')
          .select('id, clock_in_time, clock_out_time, overtime_hours, overtime_amount, overtime_approved, overtime_start_time, is_night_shift')
          .eq('employee_id', user.id)
          .eq('overtime_approved', true)
          .order('clock_in_time', { ascending: false })
          .limit(50);

        if (error) throw error;

        const overtimeRecords = (data || []).filter(r => r.overtime_hours && r.overtime_hours > 0);
        setRecords(overtimeRecords);

        // Calculate totals
        const totalHours = overtimeRecords.reduce((sum, r) => sum + (r.overtime_hours || 0), 0);
        const totalAmount = overtimeRecords.reduce((sum, r) => sum + (r.overtime_amount || 0), 0);
        setTotals({ hours: totalHours, amount: totalAmount });
      } catch (error) {
        console.error('Error fetching overtime history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOvertimeHistory();
  }, [user]);

  const formatHours = (hours: number | null): string => {
    if (!hours) return '0h 0m';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Overtime Hours</p>
                <p className="text-xl font-bold">{formatHours(totals.hours)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Overtime Pay</p>
                <p className="text-xl font-bold">₦{totals.amount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Overtime History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No overtime records found. Overtime hours will appear here once approved.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Shift Type</TableHead>
                  <TableHead>Overtime Started</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {format(new Date(record.clock_in_time), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={record.is_night_shift ? 'secondary' : 'outline'}>
                        {record.is_night_shift ? 'Night Shift' : 'Day Shift'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {record.overtime_start_time 
                        ? format(new Date(record.overtime_start_time), 'HH:mm')
                        : '-'}
                    </TableCell>
                    <TableCell>{formatHours(record.overtime_hours)}</TableCell>
                    <TableCell className="text-right font-medium text-green-500">
                      ₦{(record.overtime_amount || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
