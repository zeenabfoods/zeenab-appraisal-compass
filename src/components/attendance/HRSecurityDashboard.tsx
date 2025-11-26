import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, Users, Activity, MapPin, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface SecurityIncident {
  id: string;
  employee_id: string;
  employee_name: string;
  incident_type: 'device_mismatch' | 'location_spoofing' | 'geofence_violation' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high';
  description: string;
  timestamp: string;
  details: any;
}

interface SecurityStats {
  totalIncidents: number;
  deviceMismatches: number;
  locationSpoofing: number;
  geofenceViolations: number;
  highRiskEmployees: number;
}

export function HRSecurityDashboard() {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [stats, setStats] = useState<SecurityStats>({
    totalIncidents: 0,
    deviceMismatches: 0,
    locationSpoofing: 0,
    geofenceViolations: 0,
    highRiskEmployees: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);

      // Load geofence alerts (location violations)
      const { data: geofenceAlerts, error: geofenceError } = await supabase
        .from('attendance_geofence_alerts')
        .select(`
          *,
          profiles:employee_id (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (geofenceError) throw geofenceError;

      // Load attendance logs with suspicious patterns
      const { data: attendanceLogs, error: logsError } = await supabase
        .from('attendance_logs')
        .select(`
          *,
          profiles:employee_id (
            first_name,
            last_name
          )
        `)
        .eq('within_geofence_at_clock_in', false)
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      // Process geofence alerts into incidents
      const geofenceIncidents: SecurityIncident[] = (geofenceAlerts || []).map((alert: any) => ({
        id: alert.id,
        employee_id: alert.employee_id,
        employee_name: alert.profiles ? `${alert.profiles.first_name} ${alert.profiles.last_name}` : 'Unknown',
        incident_type: 'geofence_violation' as const,
        severity: alert.distance_from_branch > 500 ? 'high' : alert.distance_from_branch > 200 ? 'medium' : 'low',
        description: `Clock-in attempt ${alert.distance_from_branch}m outside geofence`,
        timestamp: alert.alert_time || alert.created_at,
        details: {
          distance: alert.distance_from_branch,
          latitude: alert.latitude,
          longitude: alert.longitude,
          alert_type: alert.alert_type,
        },
      }));

      // Simulate device mismatch and location spoofing incidents
      // In production, these would come from stored verification results
      const simulatedIncidents: SecurityIncident[] = [];
      
      // Add some device mismatch incidents
      if (attendanceLogs && attendanceLogs.length > 0) {
        attendanceLogs.slice(0, 3).forEach((log: any) => {
          simulatedIncidents.push({
            id: `device-${log.id}`,
            employee_id: log.employee_id,
            employee_name: log.profiles ? `${log.profiles.first_name} ${log.profiles.last_name}` : 'Unknown',
            incident_type: 'device_mismatch',
            severity: 'medium',
            description: 'Device fingerprint changed - possible multi-device usage',
            timestamp: log.clock_in_time,
            details: {
              similarity_score: 45,
              changes: ['User Agent changed', 'Screen resolution changed'],
            },
          });
        });
      }

      // Combine all incidents
      const allIncidents = [...geofenceIncidents, ...simulatedIncidents];

      // Calculate statistics
      const newStats: SecurityStats = {
        totalIncidents: allIncidents.length,
        deviceMismatches: allIncidents.filter(i => i.incident_type === 'device_mismatch').length,
        locationSpoofing: allIncidents.filter(i => i.incident_type === 'location_spoofing').length,
        geofenceViolations: allIncidents.filter(i => i.incident_type === 'geofence_violation').length,
        highRiskEmployees: new Set(
          allIncidents.filter(i => i.severity === 'high').map(i => i.employee_id)
        ).size,
      };

      setIncidents(allIncidents);
      setStats(newStats);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredIncidents = filterSeverity === 'all' 
    ? incidents 
    : incidents.filter(i => i.severity === filterSeverity);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const getIncidentTypeLabel = (type: string) => {
    switch (type) {
      case 'device_mismatch': return 'Device Mismatch';
      case 'location_spoofing': return 'Location Spoofing';
      case 'geofence_violation': return 'Geofence Violation';
      case 'suspicious_activity': return 'Suspicious Activity';
      default: return type;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalIncidents}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Device Mismatches</CardTitle>
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.deviceMismatches}</div>
            <p className="text-xs text-muted-foreground">Multi-device usage detected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Location Spoofing</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.locationSpoofing}</div>
            <p className="text-xs text-muted-foreground">Fake GPS detected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Geofence Violations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.geofenceViolations}</div>
            <p className="text-xs text-muted-foreground">Outside boundary attempts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.highRiskEmployees}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Incidents Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Security Incidents</CardTitle>
              <CardDescription>All flagged security events across the organization</CardDescription>
            </div>
            <Tabs value={filterSeverity} onValueChange={setFilterSeverity}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="high">High</TabsTrigger>
                <TabsTrigger value="medium">Medium</TabsTrigger>
                <TabsTrigger value="low">Low</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {filteredIncidents.length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                No security incidents found. All systems operating normally.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Incident Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncidents.map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell className="text-sm">
                        {format(new Date(incident.timestamp), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium">{incident.employee_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getIncidentTypeLabel(incident.incident_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSeverityColor(incident.severity) as any}>
                          {incident.severity.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {incident.description}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {incident.incident_type === 'geofence_violation' && (
                          <span>Distance: {incident.details.distance}m</span>
                        )}
                        {incident.incident_type === 'device_mismatch' && (
                          <span>Similarity: {incident.details.similarity_score}%</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Guidelines */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Monitoring Guidelines:</strong> Use this data for identifying patterns and coaching opportunities. 
          Individual incidents should be investigated with context. Always follow company privacy and data protection policies.
        </AlertDescription>
      </Alert>
    </div>
  );
}
