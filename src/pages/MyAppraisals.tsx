
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuthContext } from '@/components/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Calendar, Eye, Plus, Search, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function MyAppraisals() {
  const { profile } = useAuthContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  console.log('🔍 MyAppraisals: Loading for profile:', profile?.id, 'role:', profile?.role);

  const isHR = profile?.role === 'hr';

  // Query for user's own appraisals (works for all users including HR)
  const { data: myAppraisals, isLoading: myAppraisalsLoading, error: myAppraisalsError } = useQuery({
    queryKey: ['my-own-appraisals', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      console.log('📋 MyAppraisals: Fetching own appraisals for user:', profile.id);
      
      const { data, error } = await supabase
        .from('appraisals')
        .select(`
          *,
          cycle:appraisal_cycles(name, year, quarter, status)
        `)
        .eq('employee_id', profile.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ MyAppraisals: Error fetching own appraisals:', error);
        throw error;
      }

      console.log('✅ MyAppraisals: Fetched own appraisals:', data?.length || 0, data);
      return data || [];
    },
    enabled: !!profile?.id
  });

  // Query for other employee appraisals (only for HR)
  const { data: employeeAppraisals, isLoading: employeeAppraisalsLoading, error: employeeAppraisalsError } = useQuery({
    queryKey: ['employee-appraisals-search', profile?.id, searchTerm],
    queryFn: async () => {
      if (!profile?.id || !isHR) return [];
      
      console.log('📋 HR Search: Searching for employee appraisals with term:', searchTerm);
      
      let query = supabase
        .from('appraisals')
        .select(`
          *,
          cycle:appraisal_cycles(name, year, quarter, status),
          employee:profiles!appraisals_employee_id_fkey(first_name, last_name, email, position)
        `)
        .neq('employee_id', profile.id) // Exclude HR's own appraisals from this search
        .order('created_at', { ascending: false });

      // If there's a search term, filter by employee name
      if (searchTerm.trim()) {
        const { data: employeeData, error: employeeError } = await supabase
          .from('profiles')
          .select('id')
          .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%`)
          .eq('is_active', true)
          .neq('id', profile.id); // Exclude HR user from search results

        if (employeeError) {
          console.error('❌ Error searching employees:', employeeError);
          throw employeeError;
        }

        if (employeeData && employeeData.length > 0) {
          const employeeIds = employeeData.map(emp => emp.id);
          query = query.in('employee_id', employeeIds);
        } else {
          // No matching employees found
          return [];
        }
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('❌ HR Search: Error fetching employee appraisals:', error);
        throw error;
      }

      console.log('✅ HR Search: Fetched employee appraisals:', data?.length || 0, data);
      return data || [];
    },
    enabled: !!profile?.id && isHR
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

  const renderAppraisalCard = (appraisal: any, showEmployeeName = false) => (
    <Card key={appraisal.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <FileText className="h-5 w-5 text-gray-500" />
            <div>
              <CardTitle className="text-lg">
                {showEmployeeName && appraisal.employee ? (
                  `${appraisal.employee.first_name} ${appraisal.employee.last_name}`
                ) : (
                  appraisal.cycle?.name || `Q${appraisal.quarter || '?'} ${appraisal.year || '?'}`
                )}
              </CardTitle>
              <p className="text-sm text-gray-600">
                {showEmployeeName && appraisal.employee ? (
                  <>
                    {appraisal.employee.position || 'No Position'} • {appraisal.cycle?.name || `Q${appraisal.quarter || '?'} ${appraisal.year || '?'}`}
                  </>
                ) : (
                  `${appraisal.cycle?.year || appraisal.year} - Quarter ${appraisal.cycle?.quarter || appraisal.quarter}`
                )}
              </p>
              {showEmployeeName && appraisal.employee && (
                <p className="text-xs text-gray-500">{appraisal.employee.email}</p>
              )}
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
            {appraisal.status === 'draft' && !showEmployeeName ? 'Continue' : 'View'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const isLoading = myAppraisalsLoading || (isHR && employeeAppraisalsLoading);
  const error = myAppraisalsError || employeeAppraisalsError;

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

  if (isHR) {
    return (
      <DashboardLayout pageTitle="My Appraisals" showSearch={true}>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-gray-600">
              View your own appraisals and search through employee appraisals
            </p>
            {hasActiveCycles && (
              <Button onClick={() => navigate('/appraisal/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Start New Appraisal
              </Button>
            )}
          </div>

          <Tabs defaultValue="my-appraisals" className="w-full">
            <TabsList>
              <TabsTrigger value="my-appraisals">My Appraisals</TabsTrigger>
              <TabsTrigger value="employee-search">Employee Appraisals</TabsTrigger>
            </TabsList>
            
            <TabsContent value="my-appraisals" className="space-y-6">
              {/* Show cycle status info */}
              {!hasActiveCycles && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="font-medium text-orange-800">No Active Appraisal Cycles</p>
                        <p className="text-sm text-orange-600">
                          There are no active appraisal cycles available at the moment.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* My Own Appraisals */}
              {myAppraisals && myAppraisals.length > 0 ? (
                <div className="grid gap-4">
                  {myAppraisals.map((appraisal) => renderAppraisalCard(appraisal, false))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Personal Appraisals Yet</h3>
                    <p className="text-gray-600 text-center mb-4">
                      You haven't started any personal appraisals yet.
                      {hasActiveCycles ? ' Begin your first performance review.' : ' Wait for an active appraisal cycle.'}
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
            </TabsContent>
            
            <TabsContent value="employee-search" className="space-y-6">
              {/* Search Bar for Employee Appraisals */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input 
                  placeholder="Search employee appraisals by name..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* No results message for employee search */}
              {searchTerm.trim() && employeeAppraisals && employeeAppraisals.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <User className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Employee Appraisals Found</h3>
                    <p className="text-gray-600 text-center">
                      No appraisals found for employee "{searchTerm}". 
                      <br />
                      The employee may not have completed any appraisals yet.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Employee Appraisals List */}
              {employeeAppraisals && employeeAppraisals.length > 0 && (
                <div className="grid gap-4">
                  {employeeAppraisals.map((appraisal) => renderAppraisalCard(appraisal, true))}
                </div>
              )}

              {/* Default message when no search term */}
              {!searchTerm.trim() && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Search className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Search Employee Appraisals</h3>
                    <p className="text-gray-600 text-center">
                      Use the search bar above to find appraisals by employee name.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    );
  }

  // Non-HR users (regular staff view)
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

        {/* Show cycle status info for employees */}
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

        {/* My Appraisals */}
        {myAppraisals && myAppraisals.length > 0 ? (
          <div className="grid gap-4">
            {myAppraisals.map((appraisal) => renderAppraisalCard(appraisal, false))}
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
