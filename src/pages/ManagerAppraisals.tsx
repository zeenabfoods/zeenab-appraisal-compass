
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuthContext } from '@/components/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Calendar, User, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TeamMemberAppraisal {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  department_name: string;
  appraisal_id: string;
  appraisal_status: string;
  cycle_name: string;
  submitted_at: string;
  cycle_id: string;
}

export default function ManagerAppraisals() {
  const { profile } = useAuthContext();
  const navigate = useNavigate();

  const { data: teamAppraisals, isLoading } = useQuery({
    queryKey: ['manager-team-appraisals', profile?.id],
    queryFn: async (): Promise<TeamMemberAppraisal[]> => {
      if (!profile?.id) return [];
      
      console.log('🔍 Fetching submitted appraisals for manager:', profile.id);
      
      // Get current active cycle
      const { data: activeCycle, error: cycleError } = await supabase
        .from('appraisal_cycles')
        .select('id, name')
        .eq('status', 'active')
        .maybeSingle();

      if (cycleError) {
        console.error('❌ Error fetching active cycle:', cycleError);
        throw cycleError;
      }

      if (!activeCycle) {
        console.log('⚠️ No active cycle found');
        return [];
      }

      console.log('📊 Active cycle:', activeCycle.name);

      // Get appraisals for team members that have been submitted (ready for manager review)
      const { data: appraisalData, error: appraisalError } = await supabase
        .from('appraisals')
        .select(`
          id,
          employee_id,
          status,
          employee_submitted_at,
          manager_reviewed_at,
          committee_reviewed_at,
          cycle_id,
          profiles!appraisals_employee_id_fkey (
            id,
            first_name,
            last_name,
            email,
            position,
            line_manager_id,
            department:departments!profiles_department_id_fkey(name)
          )
        `)
        .eq('cycle_id', activeCycle.id)
        .in('status', ['submitted', 'manager_review', 'committee_review', 'completed'])
        .not('employee_submitted_at', 'is', null); // Only show appraisals that have been submitted by employees

      if (appraisalError) {
        console.error('❌ Error fetching appraisals:', appraisalError);
        throw appraisalError;
      }

      console.log('📝 Submitted appraisals found:', appraisalData?.length || 0);

      // Filter to only include team members under this manager
      const managerAppraisals = (appraisalData || [])
        .filter(appraisal => appraisal.profiles?.line_manager_id === profile.id)
        .map(appraisal => ({
          id: appraisal.profiles?.id || '',
          first_name: appraisal.profiles?.first_name || '',
          last_name: appraisal.profiles?.last_name || '',
          email: appraisal.profiles?.email || '',
          position: appraisal.profiles?.position || 'No Position',
          department_name: appraisal.profiles?.department?.name || 'No Department',
          appraisal_id: appraisal.id,
          appraisal_status: appraisal.status,
          cycle_name: activeCycle.name,
          submitted_at: appraisal.employee_submitted_at || appraisal.manager_reviewed_at || appraisal.committee_reviewed_at || '',
          cycle_id: appraisal.cycle_id
        }));

      console.log('✅ Manager appraisals:', managerAppraisals.length);
      return managerAppraisals;
    },
    enabled: !!profile?.id
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return <Clock className="h-4 w-4" />;
      case 'manager_review': return <AlertCircle className="h-4 w-4" />;
      case 'committee_review': return <CheckCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-yellow-100 text-yellow-800';
      case 'manager_review': return 'bg-blue-100 text-blue-800';
      case 'committee_review': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted': return 'Awaiting Review';
      case 'manager_review': return 'Under Review';
      case 'committee_review': return 'Committee Review';
      case 'completed': return 'Completed';
      default: return 'Pending';
    }
  };

  const getStatusPriority = (status: string) => {
    switch (status) {
      case 'submitted': return 1; // Highest priority - needs immediate attention
      case 'manager_review': return 2;
      case 'committee_review': return 3;
      case 'completed': return 4; // Lowest priority
      default: return 5;
    }
  };

  const handleReviewClick = (appraisal: TeamMemberAppraisal) => {
    navigate(`/appraisal/${appraisal.appraisal_id}`);
  };

  if (isLoading) {
    return (
      <DashboardLayout pageTitle="Team Appraisals" showSearch={false}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Group appraisals by status for better organization
  const appraisalsByStatus = {
    submitted: teamAppraisals?.filter(a => a.appraisal_status === 'submitted') || [],
    manager_review: teamAppraisals?.filter(a => a.appraisal_status === 'manager_review') || [],
    committee_review: teamAppraisals?.filter(a => a.appraisal_status === 'committee_review') || [],
    completed: teamAppraisals?.filter(a => a.appraisal_status === 'completed') || []
  };

  const totalAppraisals = teamAppraisals?.length || 0;
  const completedCount = appraisalsByStatus.completed.length;
  const pendingCount = appraisalsByStatus.submitted.length + appraisalsByStatus.manager_review.length;

  return (
    <DashboardLayout pageTitle="Team Appraisals" showSearch={false}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-600">Review submitted appraisals from your team members</p>
            <p className="text-sm text-gray-500 mt-1">
              Only team members who have submitted their appraisals will appear here
            </p>
          </div>
          
          {/* Stats */}
          <div className="flex gap-4">
            <div className="bg-yellow-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-yellow-600">Pending Review</p>
                  <p className="text-xl font-bold text-yellow-800">{pendingCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-green-600">Completed</p>
                  <p className="text-xl font-bold text-green-800">{completedCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {teamAppraisals && teamAppraisals.length > 0 ? (
          <div className="space-y-6">
            {/* Submitted - Ready for Manager Review */}
            {appraisalsByStatus.submitted.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  Ready for Your Review ({appraisalsByStatus.submitted.length})
                </h3>
                <div className="grid gap-4">
                  {appraisalsByStatus.submitted.map((appraisal) => (
                    <Card key={appraisal.id} className="hover:shadow-md transition-shadow border-l-4 border-l-yellow-500">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                            <User className="h-5 w-5 text-gray-500" />
                            <div>
                              <CardTitle className="text-lg">{appraisal.first_name} {appraisal.last_name}</CardTitle>
                              <p className="text-sm text-gray-600">{appraisal.position}</p>
                              <p className="text-xs text-gray-500">{appraisal.department_name}</p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(appraisal.appraisal_status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(appraisal.appraisal_status)}
                              <span>{getStatusText(appraisal.appraisal_status)}</span>
                            </div>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>Submitted: {new Date(appraisal.submitted_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Cycle: {appraisal.cycle_name}</p>
                          </div>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => handleReviewClick(appraisal)}
                            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Review Now
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Under Manager Review */}
            {appraisalsByStatus.manager_review.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  Under Your Review ({appraisalsByStatus.manager_review.length})
                </h3>
                <div className="grid gap-4">
                  {appraisalsByStatus.manager_review.map((appraisal) => (
                    <Card key={appraisal.id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                            <User className="h-5 w-5 text-gray-500" />
                            <div>
                              <CardTitle className="text-lg">{appraisal.first_name} {appraisal.last_name}</CardTitle>
                              <p className="text-sm text-gray-600">{appraisal.position}</p>
                              <p className="text-xs text-gray-500">{appraisal.department_name}</p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(appraisal.appraisal_status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(appraisal.appraisal_status)}
                              <span>{getStatusText(appraisal.appraisal_status)}</span>
                            </div>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>In review since: {new Date(appraisal.submitted_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Cycle: {appraisal.cycle_name}</p>
                          </div>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => handleReviewClick(appraisal)}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Continue Review
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Committee Review */}
            {appraisalsByStatus.committee_review.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                  Committee Review ({appraisalsByStatus.committee_review.length})
                </h3>
                <div className="grid gap-4">
                  {appraisalsByStatus.committee_review.map((appraisal) => (
                    <Card key={appraisal.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                            <User className="h-5 w-5 text-gray-500" />
                            <div>
                              <CardTitle className="text-lg">{appraisal.first_name} {appraisal.last_name}</CardTitle>
                              <p className="text-sm text-gray-600">{appraisal.position}</p>
                              <p className="text-xs text-gray-500">{appraisal.department_name}</p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(appraisal.appraisal_status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(appraisal.appraisal_status)}
                              <span>{getStatusText(appraisal.appraisal_status)}</span>
                            </div>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>Under committee review</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Cycle: {appraisal.cycle_name}</p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleReviewClick(appraisal)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Completed */}
            {appraisalsByStatus.completed.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Completed ({appraisalsByStatus.completed.length})
                </h3>
                <div className="grid gap-4">
                  {appraisalsByStatus.completed.map((appraisal) => (
                    <Card key={appraisal.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                            <User className="h-5 w-5 text-gray-500" />
                            <div>
                              <CardTitle className="text-lg">{appraisal.first_name} {appraisal.last_name}</CardTitle>
                              <p className="text-sm text-gray-600">{appraisal.position}</p>
                              <p className="text-xs text-gray-500">{appraisal.department_name}</p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(appraisal.appraisal_status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(appraisal.appraisal_status)}
                              <span>{getStatusText(appraisal.appraisal_status)}</span>
                            </div>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>Completed: {new Date(appraisal.submitted_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Cycle: {appraisal.cycle_name}</p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleReviewClick(appraisal)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Final
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Card className="backdrop-blur-md bg-white/60 border-white/40">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Submitted Appraisals</h3>
              <p className="text-gray-600 text-center">
                Your team members haven't submitted any appraisals yet. 
                <br />
                Appraisals will appear here once employees complete and submit them.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
