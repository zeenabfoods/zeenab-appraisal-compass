
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, TrendingUp, Edit, Trash2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface AppraisalCycleStatsProps {
  cycle: {
    id: string;
    name: string;
    year: number;
    quarter: number;
    start_date: string;
    end_date: string;
    status: string;
  };
  onEdit?: (cycle: any) => void;
  onDelete?: (cycleId: string, cycleName: string) => void;
}

export function AppraisalCycleStats({ cycle, onEdit, onDelete }: AppraisalCycleStatsProps) {
  const { toast } = useToast();

  // Get total active employees
  const { data: totalEmployees } = useQuery({
    queryKey: ['total-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true);
      
      if (error) throw error;
      return data?.length || 0;
    }
  });

  // Get appraisals for this cycle to calculate completion
  const { data: cycleAppraisals } = useQuery({
    queryKey: ['cycle-appraisals', cycle.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appraisals')
        .select('id, status, employee_id')
        .eq('cycle_id', cycle.id);
      
      if (error) throw error;
      return data || [];
    }
  });

  const completedAppraisals = cycleAppraisals?.filter(
    appraisal => appraisal.status === 'completed' || appraisal.status === 'hr_review'
  ).length || 0;

  const totalAppraisalsForCycle = cycleAppraisals?.length || 0;
  const completionPercentage = totalAppraisalsForCycle > 0 
    ? Math.round((completedAppraisals / totalAppraisalsForCycle) * 100)
    : 0;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleActivateCycle = async () => {
    try {
      const { error } = await supabase
        .from('appraisal_cycles')
        .update({ status: 'active' })
        .eq('id', cycle.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Appraisal cycle activated successfully",
      });

      // Refresh the page or trigger a re-fetch
      window.location.reload();
    } catch (error) {
      console.error('Error activating cycle:', error);
      toast({
        title: "Error",
        description: "Failed to activate appraisal cycle",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{cycle.name}</h3>
            <p className="text-sm text-gray-600">Q{cycle.quarter} {cycle.year}</p>
          </div>
          <Badge className={getStatusColor(cycle.status)}>
            {cycle.status}
          </Badge>
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(cycle.start_date)} - {formatDate(cycle.end_date)}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-lg font-semibold">{totalEmployees || 0}</p>
              <p className="text-xs text-gray-500">employees</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-lg font-semibold">{completionPercentage}%</p>
              <p className="text-xs text-gray-500">complete</p>
            </div>
          </div>
        </div>

        {onEdit && onDelete && (
          <div className="flex justify-end space-x-2">
            {cycle.status === 'draft' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleActivateCycle}
                className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
              >
                <Play className="h-4 w-4 mr-1" />
                Activate
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(cycle)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(cycle.id, cycle.name)}
              className="hover:bg-red-100 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
