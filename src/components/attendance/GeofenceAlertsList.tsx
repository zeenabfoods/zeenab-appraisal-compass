import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/AuthProvider';
import { format } from 'date-fns';
import { MapPin, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface GeofenceAlert {
  id: string;
  alert_type: string;
  alert_time: string;
  distance_from_branch: number;
  latitude: number;
  longitude: number;
  acknowledged: boolean;
  branch_id: string;
  attendance_branches: {
    name: string;
  };
}

export function GeofenceAlertsList() {
  const { profile } = useAuthContext();
  const [alerts, setAlerts] = useState<GeofenceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('geofence-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_geofence_alerts',
          filter: `employee_id=eq.${profile?.id}`
        },
        (payload) => {
          console.log('New geofence alert:', payload);
          fetchAlerts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance_geofence_alerts')
        .select(`
          *,
          attendance_branches (
            name
          )
        `)
        .eq('employee_id', profile?.id)
        .order('alert_time', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching geofence alerts:', error);
      toast.error('Failed to load geofence alerts');
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('attendance_geofence_alerts')
        .update({ acknowledged: true })
        .eq('id', alertId);

      if (error) throw error;
      
      toast.success('Alert acknowledged');
      fetchAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Failed to acknowledge alert');
    }
  };

  const getAlertIcon = (type: string) => {
    return type === 'entering' ? (
      <ArrowRight className="h-5 w-5 text-green-500" />
    ) : (
      <ArrowLeft className="h-5 w-5 text-orange-500" />
    );
  };

  const getAlertBadge = (type: string) => {
    return type === 'entering' ? (
      <Badge className="bg-green-500">Entered</Badge>
    ) : (
      <Badge className="bg-orange-500">Exited</Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Geofence Alerts History
        </CardTitle>
        <CardDescription>
          Track when you enter or exit office boundaries
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No geofence alerts yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Alerts will appear when you cross office boundaries
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 border rounded-lg transition-colors ${
                  alert.acknowledged ? 'bg-muted/30' : 'bg-background'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getAlertIcon(alert.alert_type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">
                          {alert.attendance_branches?.name || 'Unknown Branch'}
                        </span>
                        {getAlertBadge(alert.alert_type)}
                        {alert.acknowledged && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(alert.alert_time), 'MMM dd, yyyy • h:mm a')}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Distance: {alert.distance_from_branch}m from center
                      </div>
                    </div>
                  </div>
                  {!alert.acknowledged && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      Acknowledge
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
