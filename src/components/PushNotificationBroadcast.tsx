import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Send, Bell, Users, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface BroadcastLog {
  id: string;
  title: string;
  message: string;
  target: string;
  sent_at: string;
  status: 'success' | 'error';
  recipients?: number;
}

export function PushNotificationBroadcast() {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'all' | 'staff' | 'managers'>('all');
  const [isSending, setIsSending] = useState(false);
  const [recentLogs, setRecentLogs] = useState<BroadcastLog[]>([]);

  // Fetch profiles to show target counts
  const { data: profiles = [] } = useQuery({
    queryKey: ['broadcast-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, first_name, last_name')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    }
  });

  const staffCount = profiles.filter(p => p.role === 'staff').length;
  const managerCount = profiles.filter(p => ['manager'].includes(p.role)).length;
  const allCount = profiles.length;

  const getTargetCount = () => {
    if (target === 'staff') return staffCount;
    if (target === 'managers') return managerCount;
    return allCount;
  };

  const getTargetLabel = () => {
    if (target === 'staff') return 'Staff only';
    if (target === 'managers') return 'Managers only';
    return 'All employees';
  };

  const handleSend = async () => {
    if (!title.trim()) {
      toast({ title: 'Missing title', description: 'Please enter a notification title.', variant: 'destructive' });
      return;
    }
    if (!message.trim()) {
      toast({ title: 'Missing message', description: 'Please enter a notification message.', variant: 'destructive' });
      return;
    }

    setIsSending(true);

    try {
      // Build the target: use segments for broad sends
      // For role-specific, we'd need OneSignal external user IDs
      // For now, use the "Subscribed Users" segment (all) or filter by role
      const payload: Record<string, unknown> = {
        title: title.trim(),
        message: message.trim(),
      };

      // For role-specific sends, get the user IDs and pass them as external user IDs
      if (target !== 'all') {
        const roleFilter = target === 'staff' ? ['staff'] : ['manager'];
        const targetProfiles = profiles.filter(p => roleFilter.includes(p.role));
        payload.userIds = targetProfiles.map(p => p.id);
      } else {
        payload.segments = ['Subscribed Users'];
      }

      payload.data = { type: 'hr_broadcast', sent_at: new Date().toISOString() };

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: payload,
      });

      if (error) throw error;

      const newLog: BroadcastLog = {
        id: crypto.randomUUID(),
        title: title.trim(),
        message: message.trim(),
        target: getTargetLabel(),
        sent_at: new Date().toISOString(),
        status: 'success',
        recipients: getTargetCount(),
      };

      setRecentLogs(prev => [newLog, ...prev].slice(0, 10));

      toast({
        title: 'Notification Sent',
        description: `Push notification delivered to ${getTargetLabel()}.`,
      });

      setTitle('');
      setMessage('');
    } catch (err: any) {
      const newLog: BroadcastLog = {
        id: crypto.randomUUID(),
        title: title.trim(),
        message: message.trim(),
        target: getTargetLabel(),
        sent_at: new Date().toISOString(),
        status: 'error',
      };
      setRecentLogs(prev => [newLog, ...prev].slice(0, 10));

      toast({
        title: 'Send Failed',
        description: err.message || 'Failed to send push notification.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Compose Panel */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-orange-50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Broadcast Push Notification</CardTitle>
              <CardDescription>Send a push message to subscribed employees</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Target Audience */}
          <div className="space-y-2">
            <Label htmlFor="target">Target Audience</Label>
            <Select value={target} onValueChange={(v) => setTarget(v as typeof target)}>
              <SelectTrigger id="target" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    All Employees ({allCount})
                  </div>
                </SelectItem>
                <SelectItem value="staff">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Staff Only ({staffCount})
                  </div>
                </SelectItem>
                <SelectItem value="managers">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Managers Only ({managerCount})
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              {getTargetCount()} employee{getTargetCount() !== 1 ? 's' : ''} will be notified (subscribers only)
            </p>
          </div>

          {/* Notification Title */}
          <div className="space-y-2">
            <Label htmlFor="notif-title">Notification Title</Label>
            <Input
              id="notif-title"
              placeholder="e.g. Appraisal Reminder"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground text-right">{title.length}/100</p>
          </div>

          {/* Message Body */}
          <div className="space-y-2">
            <Label htmlFor="notif-message">Message</Label>
            <Textarea
              id="notif-message"
              placeholder="e.g. Please complete your Q4 appraisal before the deadline on February 28."
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={500}
              className="min-h-[100px] resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{message.length}/500</p>
          </div>

          {/* Preview Card */}
          {(title || message) && (
            <div className="rounded-lg border bg-card p-4 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preview</p>
              <div className="flex items-start gap-3 mt-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                  HR
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">{title || '(No title)'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{message || '(No message)'}</p>
                </div>
              </div>
            </div>
          )}

          <Button
            className="w-full gap-2"
            onClick={handleSend}
            disabled={isSending || !title.trim() || !message.trim()}
          >
            {isSending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send to {getTargetLabel()}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Broadcast History (session only) */}
      {recentLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Broadcasts (This Session)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3 rounded-lg border p-3">
                  {log.status === 'success' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">{log.title}</p>
                      <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                        {log.status === 'success' ? 'Sent' : 'Failed'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{log.target}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(log.sent_at).toLocaleString()}
                      {log.recipients != null && ` • ${log.recipients} targeted`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border-dashed">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <Bell className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Push Notification Notes</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Only employees who have subscribed to push notifications will receive the message.</li>
                <li>iOS users must have the app installed to their home screen to receive notifications.</li>
                <li>Android users must have granted notification permission in the app.</li>
                <li>Use this for important announcements like appraisal deadlines or urgent HR updates.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
