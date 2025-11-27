import { useState, useEffect } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { useEnhancedProfile } from '@/hooks/useEnhancedProfile';
import { useFieldTrips, FieldTrip } from '@/hooks/useFieldTrips';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MapPin, History, Users, AlertCircle, TrendingUp } from 'lucide-react';
import { StartFieldTripDialog } from '@/components/fieldwork/StartFieldTripDialog';
import { ActiveTripTracker } from '@/components/fieldwork/ActiveTripTracker';
import { FieldTripHistory } from '@/components/fieldwork/FieldTripHistory';
import { FieldTripMapTracker } from '@/components/fieldwork/FieldTripMapTracker';
import { ManagerFieldWorkView } from '@/components/fieldwork/ManagerFieldWorkView';
import { formatDistanceToNow } from 'date-fns';

export default function FieldWorkDashboard() {
  const { profile } = useAuthContext();
  const { enhancedProfile } = useEnhancedProfile();
  const { trips, activeTrip, loading, startTrip } = useFieldTrips();
  const isManager = profile?.role === 'manager' || profile?.role === 'hr' || profile?.role === 'admin';
  const [activeTab, setActiveTab] = useState('overview');
  const [allTrips, setAllTrips] = useState<FieldTrip[]>([]);
  const [allTripsLoading, setAllTripsLoading] = useState(false);

  // Load all trips for managers
  useEffect(() => {
    if (isManager) {
      loadAllTrips();
    }
  }, [isManager]);

  const loadAllTrips = async () => {
    try {
      setAllTripsLoading(true);
      const { data, error } = await supabase
        .from('field_trips')
        .select('*')
        .order('start_time', { ascending: false });

      if (error) throw error;
      setAllTrips((data || []) as FieldTrip[]);
    } catch (error) {
      console.error('Error loading all trips:', error);
    } finally {
      setAllTripsLoading(false);
    }
  };

  const displayTrips = isManager ? allTrips : trips;
  const displayLoading = isManager ? allTripsLoading : loading;
  
  const totalTrips = displayTrips.length;
  const completedTrips = displayTrips.filter(t => t.status === 'completed').length;
  const activeTripsCount = displayTrips.filter(t => t.status === 'active').length;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-orange-50/30 via-white to-amber-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 bg-clip-text text-transparent">
              Field Work Tracking
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time tracking and management for field operations
            </p>
          </div>
          {enhancedProfile && (
            <div className="text-right text-sm">
              <p className="font-semibold text-foreground">
                {enhancedProfile.first_name} {enhancedProfile.last_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {enhancedProfile.position || 'Staff'}
              </p>
              <p className="text-xs text-muted-foreground">
                {enhancedProfile.department_name || 'No Department'}
              </p>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Trips</p>
                <p className="text-3xl font-bold text-orange-600">{totalTrips}</p>
              </div>
              <MapPin className="h-10 w-10 text-orange-500/30" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-green-600">{completedTrips}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-green-500/30" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Now</p>
                <p className="text-3xl font-bold text-blue-600">{activeTripsCount}</p>
              </div>
              <Users className="h-10 w-10 text-blue-500/30" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-3xl font-bold text-purple-600">
                  {totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0}%
                </p>
              </div>
              <AlertCircle className="h-10 w-10 text-purple-500/30" />
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            {isManager && <TabsTrigger value="team">Team Tracking</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {activeTrip ? (
              <div className="space-y-4">
                {isManager && <h3 className="text-lg font-semibold">My Active Trip</h3>}
                <div className="grid gap-6 lg:grid-cols-2">
                  <ActiveTripTracker />
                  <FieldTripMapTracker tripId={activeTrip.id} />
                </div>
              </div>
            ) : (
              <Card className="p-8 text-center">
                <MapPin className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Active Field Trip</h3>
                <p className="text-muted-foreground mb-6">
                  Start a new field trip to begin tracking your location and activities
                </p>
                <StartFieldTripDialog startTripOverride={startTrip} />
              </Card>
            )}

            {isManager && (
              <div className="mt-8 space-y-4">
                <h3 className="text-lg font-semibold">Team Tracking</h3>
                <ManagerFieldWorkView />
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            <FieldTripHistory trips={displayTrips.filter(t => t.status === 'completed')} loading={displayLoading} />
          </TabsContent>

          {isManager && (
            <TabsContent value="team">
              <ManagerFieldWorkView />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
