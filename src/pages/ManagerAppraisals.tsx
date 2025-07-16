
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuthContext } from '@/components/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Calendar, User, CheckCircle, Clock, AlertCircle, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  department_name: string;
  appraisal_id?: string;
  appraisal_status?: string;
  cycle_name?: string;
  submitted_at?: string;
}

export default function ManagerAppraisals() {
  const { profile } = useAuthContext();
  const navigate = useNavigate();

  // Fetch all team members with their appraisal status
  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ['manager-team-members', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      console.log('🔍 Fetching team members for manager:', profile.id);
      
      // Get all team members regardless of appraisal status
      const { data: teamData, error: teamError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          position,
          department:departments!profiles_department_id_fkey(name)
        `)
        .eq('line_manager_id', profile.id)
        .eq('is_active', true);
      
      if (teamError) {
        console.error('❌ Error fetching team members:', teamError);
        throw teamError;
      }

      console.log('👥 Team members found:', teamData?.length || 0);

      // Get current active cycle
      const { data: activeCycle, error: cycleError } = await supabase
        .from('appraisal_cycles')
        .select('id, name')
        .eq('status', 'active')
        .maybeSingle();

      if (cycleError) {
        console.error('❌ Error fetching active cycle:', cycleError);
      }

      if (!activeCycle) {
        console.log('⚠️ No active cycle found');
        return (teamData || []).map(member => ({
          ...member,
          department_name: member.department?.name || 'No Department'
        }));
      }

      console.log('📊 Active cycle:', activeCycle.name);

      // Get appraisal data for team members in the active cycle
      const { data: appraisalData, error: appraisalError } = await supabase
        .from('appraisals')
        .select('id, employee_id, status, employee_submitted_at, manager_reviewed_at')
        .eq('cycle_id', activeCycle.id)
        .in('employee_id', (teamData || []).map(member => member.id));

      if (appraisalError) {
        console.error('❌ Error fetching appraisals:', appraisalError);
      }

      console.log('📝 Appraisals found:', appraisalData?.length || 0);

      // Combine team data with appraisal status
      const enrichedTeamMembers: TeamMember[] = (teamData || []).map(member => {
        const appraisal = appraisalData?.find(a => a.employee_id === member.id);
        
        return {
          ...member,
          department_name: member.department?.name || 'No Department',
          appraisal_id: appraisal?.id,
          appraisal_status: appraisal?.status,
          cycle_name: activeCycle.name,
          submitted_at: appraisal?.employee_submitted_at || appraisal?.manager_reviewed_at
        };
      });

      console.log('✅ Enriched team members:', enrichedTeamMembers);
      return enrichedTeamMembers;
    },
    enabled: !!profile?.id
  });

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'submitted': return <Clock className="h-4 w-4" />;
      case 'manager_review': return <AlertCircle className="h-4 w-4" />;
      case 'committee_review': return <CheckCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'draft': return <Clock className="h-4 w-4" />;
      default: return <UserPlus className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'submitted': return 'bg-yellow-100 text-yellow-800';
      case 'manager_review': return 'bg-blue-100 text-blue-800';
      case 'committee_review': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'submitted': return 'Submitted';
      case 'manager_review': return 'Manager Review';
      case 'committee_review': return 'Committee Review';
      case 'completed': return 'Completed';
      case 'draft': return 'In Progress';
      default: return 'Not Started';
    }
  };

  const handleReviewClick = (member: TeamMember) => {
    if (member.appraisal_id) {
      navigate(`/appraisal/${member.appraisal_id}`);
    } else {
      // Navigate to create new appraisal
      navigate(`/new-appraisal?employeeId=${member.id}`);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Group team members by status for better organization
  const membersByStatus = {
    completed: teamMembers?.filter(m => m.appraisal_status === 'completed') || [],
    inReview: teamMembers?.filter(m => ['committee_review', 'manager_review'].includes(m.appraisal_status || '')) || [],
    submitted: teamMembers?.filter(m => m.appraisal_status === 'submitted') || [],
    inProgress: teamMembers?.filter(m => m.appraisal_status === 'draft') || [],
    notStarted: teamMembers?.filter(m => !m.appraisal_status) || []
  };

  const totalMembers = teamMembers?.length || 0;
  const completedCount = membersByStatus.completed.length;
  const pendingCount = totalMembers - completedCount;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
            <p className="text-gray-600">Manage appraisals for your team members</p>
          </div>
          
          {/* Team Stats */}
          <div className="flex gap-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-green-600">Completed</p>
                  <p className="text-xl font-bold text-green-800">{completedCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-orange-600">Pending</p>
                  <p className="text-xl font-bold text-orange-800">{pendingCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {teamMembers && teamMembers.length > 0 ? (
          <div className="space-y-6">
            {/* Not Started */}
            {membersByStatus.notStarted.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-gray-500" />
                  Not Started ({membersByStatus.notStarted.length})
                </h3>
                <div className="grid gap-4">
                  {membersByStatus.notStarted.map((member) => (
                    <Card key={member.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                            <User className="h-5 w-5 text-gray-500" />
                            <div>
                              <CardTitle className="text-lg">{member.first_name} {member.last_name}</CardTitle>
                              <p className="text-sm text-gray-600">{member.position || 'No Position'}</p>
                              <p className="text-xs text-gray-500">{member.department_name}</p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(member.appraisal_status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(member.appraisal_status)}
                              <span>{getStatusText(member.appraisal_status)}</span>
                            </div>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-600">
                            <p>Ready to start appraisal for {member.cycle_name || 'current cycle'}</p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleReviewClick(member)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Start Review
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* In Progress */}
            {membersByStatus.inProgress.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  In Progress ({membersByStatus.inProgress.length})
                </h3>
                <div className="grid gap-4">
                  {membersByStatus.inProgress.map((member) => (
                    <Card key={member.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                            <User className="h-5 w-5 text-gray-500" />
                            <div>
                              <CardTitle className="text-lg">{member.first_name} {member.last_name}</CardTitle>
                              <p className="text-sm text-gray-600">{member.position || 'No Position'}</p>
                              <p className="text-xs text-gray-500">{member.department_name}</p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(member.appraisal_status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(member.appraisal_status)}
                              <span>{getStatusText(member.appraisal_status)}</span>
                            </div>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-600">
                            <p>Employee is working on their self-assessment</p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleReviewClick(member)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Progress
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Submitted - Ready for Manager Review */}
            {membersByStatus.submitted.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  Ready for Review ({membersByStatus.submitted.length})
                </h3>
                <div className="grid gap-4">
                  {membersByStatus.submitted.map((member) => (
                    <Card key={member.id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                            <User className="h-5 w-5 text-gray-500" />
                            <div>
                              <CardTitle className="text-lg">{member.first_name} {member.last_name}</CardTitle>
                              <p className="text-sm text-gray-600">{member.position || 'No Position'}</p>
                              <p className="text-xs text-gray-500">{member.department_name}</p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(member.appraisal_status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(member.appraisal_status)}
                              <span>{getStatusText(member.appraisal_status)}</span>
                            </div>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>Submitted: {member.submitted_at ? new Date(member.submitted_at).toLocaleDateString() : 'Recently'}</span>
                            </div>
                          </div>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => handleReviewClick(member)}
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

            {/* In Committee/Manager Review */}
            {membersByStatus.inReview.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                  Under Review ({membersByStatus.inReview.length})
                </h3>
                <div className="grid gap-4">
                  {membersByStatus.inReview.map((member) => (
                    <Card key={member.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                            <User className="h-5 w-5 text-gray-500" />
                            <div>
                              <CardTitle className="text-lg">{member.first_name} {member.last_name}</CardTitle>
                              <p className="text-sm text-gray-600">{member.position || 'No Position'}</p>
                              <p className="text-xs text-gray-500">{member.department_name}</p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(member.appraisal_status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(member.appraisal_status)}
                              <span>{getStatusText(member.appraisal_status)}</span>
                            </div>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>Under {member.appraisal_status === 'committee_review' ? 'committee' : 'manager'} review</span>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleReviewClick(member)}
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
            {membersByStatus.completed.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Completed ({membersByStatus.completed.length})
                </h3>
                <div className="grid gap-4">
                  {membersByStatus.completed.map((member) => (
                    <Card key={member.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                            <User className="h-5 w-5 text-gray-500" />
                            <div>
                              <CardTitle className="text-lg">{member.first_name} {member.last_name}</CardTitle>
                              <p className="text-sm text-gray-600">{member.position || 'No Position'}</p>
                              <p className="text-xs text-gray-500">{member.department_name}</p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(member.appraisal_status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(member.appraisal_status)}
                              <span>{getStatusText(member.appraisal_status)}</span>
                            </div>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>Completed: {member.submitted_at ? new Date(member.submitted_at).toLocaleDateString() : 'Recently'}</span>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleReviewClick(member)}
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
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Team Members</h3>
              <p className="text-gray-600 text-center">
                You don't have any team members assigned to you at the moment.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
