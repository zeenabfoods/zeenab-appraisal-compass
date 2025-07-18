
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuthContext } from '@/components/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, Eye, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MyAppraisals() {
  const { profile } = useAuthContext();
  const navigate = useNavigate();

  console.log('🔍 MyAppraisals: Loading for profile:', profile?.id, 'role:', profile?.role);

  const { data: appraisals, isLoading, error } = useQuery({
    queryKey: ['my-appraisals', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      console.log('📋 MyAppraisals: Fetching appraisals for employee:', profile.id);
      
      const { data, error } = await supabase
        .from('appraisals')
        .select(`
          *,
          cycle:appraisal_cycles(name, year, quarter, status)
        `)
        .eq('employee_id', profile.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ MyAppraisals: Error fetching appraisals:', error);
        throw error;
      }

      console.log('✅ MyAppraisals: Fetched appraisals:', data?.length || 0, data);
      return data || [];
    },
    enabled: !!profile?.id
  });

  const { data: activeCycles } = useQuery({
    queryKey: ['active-cycles'],
    queryFn: async () => {
      console.log('🔄 MyAppraisals: Checking for active cycles...');
      
      const { data, error } = await supabase
        .from('appraisal_cycles')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ MyAppraisals: Error fetching active cycles:', error);
        throw error;
      }
      
      console.log('🔄 MyAppraisals: Active cycles found:', data?.length || 0);
      return data || [];
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'manager_review': return 'bg-yellow-100 text-yellow-800';
      case 'committee_review': return 'bg-purple-100 text-purple-800';
      case 'hr_review': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'committee_review': return 'COMMITTEE REVIEW';
      case 'manager_review': return 'MANAGER REVIEW';
      case 'hr_review': return 'HR REVIEW';
      default: return status?.replace('_', ' ').toUpperCase() || 'DRAFT';
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout pageTitle="My Appraisals" showSearch={true}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <span className="text-gray-600">Loading appraisals...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    console.error('❌ MyAppraisals: Error state:', error);
  }

  const hasActiveCycles = activeCycles && activeCycles.length > 0;

  return (
    <DashboardLayout pageTitle="My Appraisals" showSearch={true}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Track your performance appraisal progress</p>
          {hasActiveCycles && (
            <Button onClick={() => navigate('/appraisal/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Start New Appraisal
            </Button>
          )}
        </div>

        {/* Show cycle status info */}
        {!hasActiveCycles && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-800">No Active Appraisal Cycles</p>
                  <p className="text-sm text-orange-600">
                    There are no active appraisal cycles available at the moment. Contact HR for more information.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Appraisals List */}
        {appraisals && appraisals.length > 0 ? (
          <div className="grid gap-4">
            {appraisals.map((appraisal) => (
              <Card key={appraisal.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-500" />
                      <div>
                        <CardTitle className="text-lg">
                          {appraisal.cycle?.name || `Q${appraisal.quarter || '?'} ${appraisal.year || '?'}`}
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          {appraisal.cycle?.year || appraisal.year} - Quarter {appraisal.cycle?.quarter || appraisal.quarter}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(appraisal.status || 'draft')}>
                      {getStatusLabel(appraisal.status || 'draft')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Created: {new Date(appraisal.created_at || '').toLocaleDateString()}</span>
                      </div>
                      {appraisal.submitted_at && (
                        <div className="flex items-center space-x-1 mt-1">
                          <Calendar className="h-4 w-4" />
                          <span>Submitted: {new Date(appraisal.submitted_at).toLocaleDateString()}</span>
                        </div>
                      )}
                      {appraisal.status === 'committee_review' && (
                        <div className="flex items-center space-x-1 mt-1">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span className="text-purple-600 font-medium">Under Committee Review</span>
                        </div>
                      )}
                      {appraisal.overall_score && (
                        <div className="flex items-center space-x-1 mt-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-green-600 font-medium">Score: {appraisal.overall_score}/100</span>
                        </div>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/appraisal/${appraisal.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {appraisal.status === 'draft' ? 'Continue' : 'View'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Appraisals Yet</h3>
              <p className="text-gray-600 text-center mb-4">
                You haven't started any appraisals yet.
                {hasActiveCycles ? ' Begin your first performance review.' : ' Wait for HR to activate an appraisal cycle.'}
              </p>
              {hasActiveCycles && (
                <Button onClick={() => navigate('/appraisal/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Start Your First Appraisal
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
