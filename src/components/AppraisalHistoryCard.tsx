
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
  const { profile } = useAuth();
  const [appraisals, setAppraisals] = useState<AppraisalHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [selectedAppraisal, setSelectedAppraisal] = useState<string>('');

  useEffect(() => {
    if (profile) {
      loadAppraisalHistory();
    }
  }, [profile]);

  const loadAppraisalHistory = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      
      // Different queries based on user role
      if (profile.role === 'staff') {
        // Employees see their own appraisals
        const { data, error } = await supabase
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

        if (error) throw error;
        setAppraisals(data || []);

      } else if (profile.role === 'manager') {
        // Managers see their team's appraisals
        const { data: teamMembers } = await supabase
          .from('profiles')
          .select('id')
          .eq('line_manager_id', profile.id);
        
        const teamIds = teamMembers?.map(member => member.id) || [];
        
        if (teamIds.length > 0) {
          const { data, error } = await supabase
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

          if (error) throw error;

          // Transform data to include employee names
          const transformedData = (data || []).map((appraisal: any) => ({
            ...appraisal,
            employee_name: appraisal.profiles 
              ? `${appraisal.profiles.first_name} ${appraisal.profiles.last_name}`
              : undefined
          }));

          setAppraisals(transformedData);
        } else {
          // Manager has no team members
          setAppraisals([]);
        }

      } else if (profile.role === 'hr' || profile.role === 'admin') {
        // HR and Admin see all appraisals
        const { data, error } = await supabase
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

        if (error) throw error;

        // Transform data to include employee names
        const transformedData = (data || []).map((appraisal: any) => ({
          ...appraisal,
          employee_name: appraisal.profiles 
            ? `${appraisal.profiles.first_name} ${appraisal.profiles.last_name}`
            : undefined
        }));

        setAppraisals(transformedData);
      }

    } catch (error) {
      console.error('Error loading appraisal history:', error);
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
                <p>No appraisal history available</p>
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
                        {appraisal.appraisal_cycles.name}
                        {appraisal.employee_name && (
                          <span className="text-gray-600 ml-2">
                            - {appraisal.employee_name}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(appraisal.appraisal_cycles.start_date).toLocaleDateString()} - {new Date(appraisal.appraisal_cycles.end_date).toLocaleDateString()}
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
