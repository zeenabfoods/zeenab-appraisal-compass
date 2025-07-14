
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AppraisalForm } from '@/components/AppraisalForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

  useEffect(() => {
    if (id) {
      loadAppraisal();
    }
  }, [id]);

  const loadAppraisal = async () => {
    if (!id || !profile) return;

    console.log('🏁 AppraisalPage: Loading appraisal with ID:', id);
    console.log('🏁 AppraisalPage: Current profile:', profile.id, profile.role);

    try {
      const { data, error } = await supabase
        .from('appraisals')
        .select(`
          *,
          cycle:appraisal_cycles(name, quarter, year)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
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
    } catch (error) {
      console.error('Error loading appraisal:', error);
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

  const handleComplete = () => {
    toast({
      title: "Success",
      description: "Appraisal completed successfully",
    });
    navigate('/my-appraisals');
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

  const getAppraisalMode = () => {
    if (!profile || !appraisal) return 'employee';
    
    if (appraisal.employee_id === profile.id) {
      return 'employee';
    } else if (profile.role === 'hr' || profile.role === 'admin') {
      return 'hr';
    } else {
      return 'manager';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!appraisal) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Appraisal Not Found</h3>
          <p className="text-gray-600 mb-4">The requested appraisal could not be found.</p>
          <Button onClick={() => navigate('/my-appraisals')}>
            Return to My Appraisals
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
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
              <h1 className="text-2xl font-bold text-gray-900">
                {appraisal.cycle?.name || `Q${appraisal.cycle?.quarter} ${appraisal.cycle?.year}`}
              </h1>
              <p className="text-gray-600">Performance Appraisal</p>
            </div>
          </div>
          <Badge className={getStatusColor(appraisal.status)}>
            {appraisal.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        {/* Appraisal Form */}
        {appraisal.cycle_id && appraisal.employee_id ? (
          <AppraisalForm
            cycleId={appraisal.cycle_id}
            employeeId={appraisal.employee_id}
            mode={getAppraisalMode()}
            onComplete={handleComplete}
          />
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mr-2"></div>
                <span>Loading appraisal details...</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
