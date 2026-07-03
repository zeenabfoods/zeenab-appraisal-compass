import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Shield, RotateCcw, AlertTriangle, Smartphone } from 'lucide-react';

interface TrustedDevice {
  id: string;
  user_id: string;
  device_label: string | null;
  registered_ip: string | null;
  registered_at: string;
  last_seen_at: string;
  last_seen_ip: string | null;
  is_active: boolean;
  reset_count: number;
  profiles?: { first_name: string; last_name: string; email: string } | null;
}

interface Violation {
  id: string;
  user_id: string;
  attempted_ip: string | null;
  user_agent: string | null;
  action_blocked: string;
  attempted_at: string;
  profiles?: { first_name: string; last_name: string; email: string } | null;
}

export function DeviceLockManagement() {
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const [{ data: dev }, { data: vio }] = await Promise.all([
      supabase
        .from('employee_trusted_devices')
        .select('*, profiles!employee_trusted_devices_user_id_fkey(first_name,last_name,email)')
        .order('last_seen_at', { ascending: false }),
      supabase
        .from('device_violation_logs')
        .select('*, profiles!device_violation_logs_user_id_fkey(first_name,last_name,email)')
        .order('attempted_at', { ascending: false })
        .limit(100),
    ]);
    setDevices((dev as any) || []);
    setViolations((vio as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetDevice = async (userId: string, name: string) => {
    if (!confirm(`Reset trusted device for ${name}? Their next clock-in will register a new device.`)) return;
    const { error } = await supabase
      .from('employee_trusted_devices')
      .update({ is_active: false, reset_count: (devices.find(d => d.user_id === userId)?.reset_count ?? 0) + 1 })
      .eq('user_id', userId);
    if (error) {
      toast.error('Failed to reset device', { description: error.message });
      return;
    }
    toast.success(`Device reset for ${name}`);
    load();
  };

  const filtered = devices.filter(d => {
    if (!search) return true;
    const s = search.toLowerCase();
    const n = `${d.profiles?.first_name ?? ''} ${d.profiles?.last_name ?? ''} ${d.profiles?.email ?? ''}`.toLowerCase();
    return n.includes(s);
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Device Lock Management</CardTitle>
          <CardDescription>
            Each employee is bound to one trusted device for clocking in. Reset if a legitimate phone was replaced.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <Input placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <Button variant="outline" onClick={load} disabled={loading}>Refresh</Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Registered IP</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Resets</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {loading ? 'Loading...' : 'No registered devices yet.'}
                  </TableCell></TableRow>
                )}
                {filtered.map(d => {
                  const name = `${d.profiles?.first_name ?? ''} ${d.profiles?.last_name ?? ''}`.trim() || d.profiles?.email || d.user_id.slice(0, 8);
                  return (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="font-medium">{name}</div>
                        <div className="text-xs text-muted-foreground">{d.profiles?.email}</div>
                      </TableCell>
                      <TableCell>
                        {d.is_active
                          ? <Badge className="bg-green-500/10 text-green-700 border-green-500/30" variant="outline"><Smartphone className="w-3 h-3 mr-1" />Locked</Badge>
                          : <Badge variant="outline">Reset — pending re-register</Badge>}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs" title={d.device_label ?? ''}>{d.device_label ?? '—'}</TableCell>
                      <TableCell className="text-xs">{d.registered_ip ?? '—'}</TableCell>
                      <TableCell className="text-xs">{new Date(d.registered_at).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{new Date(d.last_seen_at).toLocaleString()}<br/><span className="text-muted-foreground">{d.last_seen_ip ?? ''}</span></TableCell>
                      <TableCell>{d.reset_count}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => resetDevice(d.user_id, name)}>
                          <RotateCcw className="w-3 h-3 mr-1" /> Reset
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="w-5 h-5" /> Device Violation Log</CardTitle>
          <CardDescription>Blocked clock-in attempts from unregistered devices (latest 100).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Device / Browser</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {violations.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No violations recorded.</TableCell></TableRow>
                )}
                {violations.map(v => (
                  <TableRow key={v.id}>
                    <TableCell className="text-xs">{new Date(v.attempted_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="font-medium">{`${v.profiles?.first_name ?? ''} ${v.profiles?.last_name ?? ''}`.trim() || '—'}</div>
                      <div className="text-xs text-muted-foreground">{v.profiles?.email}</div>
                    </TableCell>
                    <TableCell><Badge variant="destructive">{v.action_blocked}</Badge></TableCell>
                    <TableCell className="text-xs">{v.attempted_ip ?? '—'}</TableCell>
                    <TableCell className="text-xs max-w-[320px] truncate" title={v.user_agent ?? ''}>{v.user_agent ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}