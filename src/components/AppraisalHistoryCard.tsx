import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppraisalAccessDialog } from '@/components/AppraisalAccessDialog';
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Target,
  User,
  Users
} from 'lucide-react';

interface AppraisalHistory {
  id: string;
  status: string;
  cycle_id: string;
  employee_id: string;
  employee_name?: string;
  created_at: string;
  completed_at?: string;
  overall_score?: number;
  performance_band?: string;
  appraisal_cycles: {
    name: string;
    quarter: number;
    year: number;
    start_date: string;
    end_date: string;
    status: string;
  };
}

export function AppraisalHistoryCard() {
  const { profile, user, authReady } = useAuth();
  const [appraisals, setAppraisals] = useState<AppraisalHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [selectedAppraisal, setSelectedAppraisal] = useState<string>('');

  useEffect(() => {
    console.log('AppraisalHistoryCard: Auth state changed', { 
      authReady, 
      hasUser: !!user, 
      hasProfile: !!profile,
      profileRole: profile?.role 
    });
    
    if (authReady && user && profile) {
      loadAppraisalHistory();
    } else if (authReady && !user) {
      setLoading(false);
      setError('User not authenticated');
    }
  }, [authReady, user, profile]);

  const loadAppraisalHistory = async () => {
    if (!profile || !user) {
      console.log('AppraisalHistoryCard: Missing profile or user');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('AppraisalHistoryCard: Loading appraisal history for user:', profile.id, 'role:', profile.role);
      
      // First, let's check if we have any appraisal cycles at all
      const { data: cyclesCheck, error: cyclesError } = await supabase
        .from('appraisal_cycles')
        .select('id, name, status')
        .limit(5);
      
      console.log('AppraisalHistoryCard: Available cycles:', cyclesCheck?.length || 0, cyclesError);
      
      // Then check for any appraisals
      const { data: appraisalsCheck, error: appraisalsError } = await supabase
        .from('appraisals')
        .select('id, employee_id, status')
        .limit(5);
      
      console.log('AppraisalHistoryCard: Available appraisals:', appraisalsCheck?.length || 0, appraisalsError);
      
      let query;
      
      if (profile.role === 'staff') {
        console.log('AppraisalHistoryCard: Fetching staff appraisals for employee:', profile.id);
        
        query = supabase
          .from('appraisals')
          .select(`
            *,
            appraisal_cycles (
              name,
              quarter,
              year,
              start_date,
              end_date,
              status
            )
          `)
          .eq('employee_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(10);

      } else if (profile.role === 'manager') {
        console.log('AppraisalHistoryCard: Fetching manager team appraisals for manager:', profile.id);
        
        // First get team members
        const { data: teamMembers, error: teamError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('line_manager_id', profile.id);
        
        console.log('AppraisalHistoryCard: Team members found:', teamMembers?.length || 0, teamError);
        
        if (teamError) {
          throw teamError;
        }
        
        const teamIds = teamMembers?.map(member => member.id) || [];
        
        if (teamIds.length === 0) {
          console.log('AppraisalHistoryCard: No team members found');
          setAppraisals([]);
          return;
        }
        
        query = supabase
          .from('appraisals')
          .select(`
            *,
            appraisal_cycles (
              name,
              quarter,
              year,
              start_date,
              end_date,
              status
            ),
            profiles!appraisals_employee_id_fkey (
              first_name,
              last_name
            )
          `)
          .in('employee_id', teamIds)
          .order('created_at', { ascending: false })  
          .limit(10);

      } else if (profile.role === 'hr' || profile.role === 'admin') {
        console.log('AppraisalHistoryCard: Fetching all appraisals for HR/Admin');
        
        query = supabase
          .from('appraisals')
          .select(`
            *,
            appraisal_cycles (
              name,
              quarter,
              year,
              start_date,
              end_date,
              status
            ),
            profiles!appraisals_employee_id_fkey (
              first_name,
              last_name
            )
          `)
          .order('created_at', { ascending: false })
          .limit(10);
      }

      if (!query) {
        console.log('AppraisalHistoryCard: No query built for role:', profile.role);
        setAppraisals([]);
        return;
      }

      const { data, error } = await query;
      
      console.log('AppraisalHistoryCard: Query result:', { 
        dataCount: data?.length || 0, 
        error: error?.message,
        firstItem: data?.[0] 
      });

      if (error) {
        console.error('AppraisalHistoryCard: Query error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('AppraisalHistoryCard: No appraisals found');
        setAppraisals([]);
        return;
      }

      // Transform data to include employee names for manager/hr/admin views
      const transformedData = data.map((appraisal: any) => {
        console.log('AppraisalHistoryCard: Processing appraisal:', appraisal.id, appraisal.profiles);
        
        return {
          ...appraisal,
          employee_name: appraisal.profiles 
            ? `${appraisal.profiles.first_name} ${appraisal.profiles.last_name}`
            : undefined
        };
      });

      console.log('AppraisalHistoryCard: Setting appraisals:', transformedData.length);
      setAppraisals(transformedData);

    } catch (error: any) {
      console.error('AppraisalHistoryCard: Error loading appraisal history:', error);
      setError(error.message || 'Failed to load appraisal history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'manager_review': return 'bg-yellow-100 text-yellow-800';
      case 'committee_review': return 'bg-purple-100 text-purple-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'submitted': return <Clock className="h-4 w-4" />;
      case 'manager_review': return <User className="h-4 w-4" />;
      case 'committee_review': return <Users className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const handleAppraisalClick = (appraisal: AppraisalHistory) => {
    if (appraisal.status === 'completed') {
      setSelectedAppraisal(appraisal.appraisal_cycles.name);
      setShowAccessDialog(true);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2 text-orange-600" />
            Appraisal History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
            <span className="ml-2 text-gray-600">Loading appraisal history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2 text-orange-600" />
            Appraisal History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-400" />
            <p className="text-red-600 mb-2">Error loading appraisal history</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <Button 
              variant="outline" 
              onClick={loadAppraisalHistory}
              className="text-orange-600 border-orange-600 hover:bg-orange-50"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2 text-orange-600" />
            Appraisal History
          </CardTitle>
          <CardDescription>
            {profile?.role === 'staff' 
              ? 'Your past and current appraisals'
              : profile?.role === 'manager'
              ? 'Your team\'s appraisal history'
              : 'Company-wide appraisal history'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {appraisals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="mb-2">No appraisal history available</p>
                <p className="text-sm text-gray-400">
                  {profile?.role === 'staff' 
                    ? 'You don\'t have any appraisals yet'
                    : profile?.role === 'manager'
                    ? 'Your team doesn\'t have any appraisals yet'
                    : 'No appraisals have been created yet'
                  }
                </p>
                <Button 
                  variant="outline" 
                  onClick={loadAppraisalHistory}
                  className="mt-4 text-orange-600 border-orange-600 hover:bg-orange-50"
                >
                  Refresh
                </Button>
              </div>
            ) : (
              appraisals.map((appraisal) => (
                <div 
                  key={appraisal.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-md ${
                    appraisal.status === 'completed' 
                      ? 'bg-gray-50 border-gray-200 cursor-pointer hover:bg-gray-100' 
                      : 'bg-white border-orange-200 cursor-pointer hover:bg-orange-50'
                  }`}
                  onClick={() => handleAppraisalClick(appraisal)}
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(appraisal.status)}
                    <div>
                      <div className="font-medium text-sm">
                        {appraisal.appraisal_cycles?.name || 'Unknown Cycle'}
                        {appraisal.employee_name && (
                          <span className="text-gray-600 ml-2">
                            - {appraisal.employee_name}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {appraisal.appraisal_cycles?.start_date 
                          ? `${new Date(appraisal.appraisal_cycles.start_date).toLocaleDateString()} - ${new Date(appraisal.appraisal_cycles.end_date).toLocaleDateString()}`
                          : 'Date range not available'
                        }
                      </div>
                      {appraisal.overall_score && (
                        <div className="text-xs text-green-600 font-medium mt-1">
                          Score: {appraisal.overall_score}% 
                          {appraisal.performance_band && (
                            <span className="ml-2">({appraisal.performance_band})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(appraisal.status)}>
                      {appraisal.status.replace('_', ' ')}
                    </Badge>
                    {appraisal.status === 'completed' && (
                      <div className="text-xs text-gray-500">
                        {new Date(appraisal.completed_at || appraisal.created_at).getFullYear()}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <AppraisalAccessDialog
        isOpen={showAccessDialog}
        onClose={() => setShowAccessDialog(false)}
        appraisalName={selectedAppraisal}
      />
    </>
  );
}
