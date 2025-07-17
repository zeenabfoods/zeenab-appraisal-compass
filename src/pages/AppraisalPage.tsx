
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AppraisalForm } from '@/components/AppraisalForm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, FileText } from 'lucide-react';

interface Appraisal {
  id: string;
  employee_id: string;
  cycle_id: string;
  status: string;
  created_at: string;
  cycle?: {
    name: string;
    quarter: number;
    year: number;
  };
}

export default function AppraisalPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appraisal, setAppraisal] = useState<Appraisal | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('🏁 AppraisalPage: Rendered with ID:', id, 'Profile:', profile?.id);

  useEffect(() => {
    if (id && profile) {
      loadAppraisal();
    }
  }, [id, profile]);

  const loadAppraisal = async () => {
    if (!id || !profile) {
      console.log('🏁 AppraisalPage: Missing required data:', { id, profile: !!profile });
      return;
    }

    console.log('🏁 AppraisalPage: Loading appraisal with ID:', id);

    try {
      const { data, error } = await supabase
        .from('appraisals')
        .select(`
          *,
          cycle:appraisal_cycles(name, quarter, year)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ AppraisalPage: Database error:', error);
        throw error;
      }
      
      console.log('🏁 AppraisalPage: Loaded appraisal data:', data);

      // Check if user has access to this appraisal
      if (data.employee_id !== profile.id && 
          profile.role !== 'hr' && 
          profile.role !== 'admin') {
        // Check if user is line manager
        const { data: employeeData } = await supabase
          .from('profiles')
          .select('line_manager_id')
          .eq('id', data.employee_id)
          .single();

        if (!employeeData || employeeData.line_manager_id !== profile.id) {
          console.warn('🏁 AppraisalPage: Access denied for user:', profile.id);
          toast({
            title: "Access Denied",
            description: "You don't have permission to view this appraisal",
            variant: "destructive",
          });
          navigate('/my-appraisals');
          return;
        }
      }

      setAppraisal(data);
    } catch (error: any) {
      console.error('❌ AppraisalPage: Error loading appraisal:', error);
      toast({
        title: "Error",
        description: "Failed to load appraisal",
        variant: "destructive",
      });
      navigate('/my-appraisals');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'manager_review': return 'bg-yellow-100 text-yellow-800';
      case 'hr_review': return 'bg-purple-100 text-purple-800';
      case 'committee_review': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <DashboardLayout pageTitle="Loading Appraisal...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <span className="text-gray-600">Loading appraisal...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!appraisal) {
    return (
      <DashboardLayout pageTitle="Appraisal Not Found">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6">
          <FileText className="h-16 w-16 text-gray-400" />
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Appraisal Not Found</h3>
            <p className="text-gray-600 mb-6">The requested appraisal could not be found.</p>
            <Button onClick={() => navigate('/my-appraisals')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to My Appraisals
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const pageTitle = appraisal.cycle?.name || `Q${appraisal.cycle?.quarter} ${appraisal.cycle?.year}`;

  console.log('✅ AppraisalPage: About to render AppraisalForm');

  return (
    <DashboardLayout pageTitle={pageTitle} showSearch={false}>
      <div className="space-y-6">
        {/* Navigation and Status Section - NO duplicate title here */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/my-appraisals')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Appraisals
            </Button>
            <div>
              <p className="text-gray-600">Performance Appraisal</p>
            </div>
          </div>
          <Badge className={getStatusColor(appraisal.status)}>
            {appraisal.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        {/* Appraisal Form */}
        <Card className="bg-white shadow-sm">
          <CardContent className="p-6">
            {appraisal.cycle_id && appraisal.employee_id ? (
              <AppraisalForm />
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                  <span className="text-gray-600">Loading appraisal details...</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
