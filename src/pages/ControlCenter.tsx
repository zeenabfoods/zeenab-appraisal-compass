import { useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuthContext } from '@/components/AuthProvider';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, Lock, Unlock, MapPin, Edit2, Bell, FileText, ClipboardCheck, Volume2 } from 'lucide-react';

import { BranchManagement } from '@/components/attendance/BranchManagement';
import { ManualOverrides } from '@/components/attendance/ManualOverrides';
import { DeviceLockManagement } from '@/components/attendance/DeviceLockManagement';
import { AttendanceAuditLogs } from '@/components/attendance/AttendanceAuditLogs';
import { AlertSoundManager } from '@/components/attendance/AlertSoundManager';
import { VoiceGuideManager } from '@/components/attendance/VoiceGuideManager';
import { GeofenceAlertsList } from '@/components/attendance/GeofenceAlertsList';

function AppraisalSubmissionControl() {
  const { profile } = useAuthContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['appraisal-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appraisal_settings')
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const staffLocked = (settings as any)?.submission_locked || false;
  const managerLocked = (settings as any)?.manager_submission_locked || false;

  const toggleStaff = useMutation({
    mutationFn: async (locked: boolean) => {
      const { error } = await supabase
        .from('appraisal_settings')
        .update({
          submission_locked: locked,
          locked_by: locked ? profile?.id : null,
          locked_at: locked ? new Date().toISOString() : null,
        })
        .eq('id', (settings as any)?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appraisal-settings'] });
      toast({ title: 'Updated', description: 'Staff submission lock updated.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleManager = useMutation({
    mutationFn: async (locked: boolean) => {
      const { error } = await supabase
        .from('appraisal_settings')
        .update({
          manager_submission_locked: locked,
          manager_locked_by: locked ? profile?.id : null,
          manager_locked_at: locked ? new Date().toISOString() : null,
        })
        .eq('id', (settings as any)?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appraisal-settings'] });
      toast({ title: 'Updated', description: 'Manager review lock updated.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {staffLocked ? <Lock className="w-5 h-5 text-red-600" /> : <Unlock className="w-5 h-5 text-green-600" />}
            Staff Submissions
          </CardTitle>
          <CardDescription>
            When locked, staff cannot submit new appraisals for the current cycle.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Status</Label>
            <div>
              <Badge variant={staffLocked ? 'destructive' : 'default'}>
                {staffLocked ? 'LOCKED' : 'OPEN'}
              </Badge>
            </div>
          </div>
          <Switch checked={staffLocked} onCheckedChange={(v) => toggleStaff.mutate(v)} />
        </CardContent>
      </Card>

      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {managerLocked ? <Lock className="w-5 h-5 text-red-600" /> : <Unlock className="w-5 h-5 text-green-600" />}
            Manager Reviews
          </CardTitle>
          <CardDescription>
            When locked, managers cannot submit reviews on staff appraisals.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Status</Label>
            <div>
              <Badge variant={managerLocked ? 'destructive' : 'default'}>
                {managerLocked ? 'LOCKED' : 'OPEN'}
              </Badge>
            </div>
          </div>
          <Switch checked={managerLocked} onCheckedChange={(v) => toggleManager.mutate(v)} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function ControlCenter() {
  const { profile } = useAuthContext();

  // Restrict to super_admin only — even HR/Admin cannot access
  if (profile && profile.role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <DashboardLayout pageTitle="Super Admin Control Center" showSearch={false}>
      <div className="space-y-6">
        <div className="rounded-xl border bg-gradient-to-r from-orange-500/10 via-red-500/5 to-orange-500/10 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Super Admin Control Center
              </h1>
              <p className="text-sm text-muted-foreground">
                Centralized command for Appraisals & Smart Attendance governance.
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="appraisal-lock" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full h-auto">
            <TabsTrigger value="appraisal-lock" className="gap-1"><ClipboardCheck className="w-4 h-4" />Appraisal Lock</TabsTrigger>
            <TabsTrigger value="branches" className="gap-1"><MapPin className="w-4 h-4" />Branches</TabsTrigger>
            <TabsTrigger value="device-lock" className="gap-1"><Shield className="w-4 h-4" />Device Lock</TabsTrigger>
            <TabsTrigger value="overrides" className="gap-1"><Edit2 className="w-4 h-4" />Overrides</TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1"><Bell className="w-4 h-4" />Alerts</TabsTrigger>
            <TabsTrigger value="audit" className="gap-1"><FileText className="w-4 h-4" />Audit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="appraisal-lock" className="mt-6">
            <AppraisalSubmissionControl />
          </TabsContent>

          <TabsContent value="branches" className="mt-6">
            <BranchManagement />
          </TabsContent>

          <TabsContent value="device-lock" className="mt-6">
            <DeviceLockManagement />
          </TabsContent>

          <TabsContent value="overrides" className="mt-6">
            <ManualOverrides />
          </TabsContent>

          <TabsContent value="alerts" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Volume2 className="w-5 h-5" />Alert Sounds</CardTitle>
                <CardDescription>Manage upload and volume of system alert sounds.</CardDescription>
              </CardHeader>
              <CardContent>
                <AlertSoundManager />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Voice Guides</CardTitle>
                <CardDescription>Custom voice notifications for attendance events.</CardDescription>
              </CardHeader>
              <CardContent>
                <VoiceGuideManager />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Geofence Alerts</CardTitle>
                <CardDescription>Recent geofence entry/exit alerts.</CardDescription>
              </CardHeader>
              <CardContent>
                <GeofenceAlertsList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="mt-6">
            <AttendanceAuditLogs />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}