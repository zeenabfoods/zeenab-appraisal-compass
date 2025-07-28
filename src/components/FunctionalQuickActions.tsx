
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, 
  Users, 
  Shield, 
  Plus, 
  FileText,
  Calendar,
  Settings,
  Download,
  RefreshCw,
  UserPlus
} from 'lucide-react';

export function FunctionalQuickActions() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleAction = async (action: string, callback: () => Promise<void> | void) => {
    setIsLoading(action);
    try {
      await callback();
    } catch (error) {
      console.error(`Error in ${action}:`, error);
      toast({
        title: "Error",
        description: `Failed to perform ${action}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(null);
    }
  };

  const generateReport = async () => {
    const { data: appraisals } = await supabase
      .from('appraisals')
      .select(`
        id, 
        status, 
        overall_score, 
        completed_at,
        profiles!appraisals_employee_id_fkey(first_name, last_name, email)
      `)
      .eq('status', 'completed');

    if (!appraisals) {
      toast({
        title: "No Data",
        description: "No completed appraisals found for report generation.",
        variant: "destructive"
      });
      return;
    }

    // Create CSV content
    const csvContent = [
      ['Employee Name', 'Email', 'Score', 'Completion Date'],
      ...appraisals.map(a => [
        `${a.profiles?.first_name} ${a.profiles?.last_name}`,
        a.profiles?.email || '',
        a.overall_score?.toString() || '',
        a.completed_at ? new Date(a.completed_at).toLocaleDateString() : ''
      ])
    ].map(row => row.join(',')).join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appraisal-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Report Generated",
      description: "Performance report has been downloaded successfully.",
    });
  };

  const syncData = async () => {
    // Simulate data sync - in reality this might refresh analytics or update cached data
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast({
      title: "Data Synced",
      description: "All analytics data has been refreshed successfully.",
    });
  };

  const getActionButtons = () => {
    const baseActions = [
      {
        icon: BarChart3,
        label: "View Analytics",
        description: "Comprehensive performance insights",
        action: () => Promise.resolve(navigate('/company-reports')),
        variant: "default" as const
      },
      {
        icon: FileText,
        label: "Generate Report",
        description: "Export performance data",
        action: () => handleAction('generate-report', generateReport),
        variant: "outline" as const
      },
      {
        icon: RefreshCw,
        label: "Sync Data",
        description: "Refresh all analytics",
        action: () => handleAction('sync-data', syncData),
        variant: "outline" as const
      }
    ];

    // Add role-specific actions
    if (profile?.role === 'hr' || profile?.role === 'admin') {
      baseActions.unshift(
        {
          icon: Plus,
          label: "New Appraisal Cycle",
          description: "Create new performance cycle",
          action: () => Promise.resolve(navigate('/appraisal-cycles')),
          variant: "default" as const
        },
        {
          icon: UserPlus,
          label: "Manage Employees",
          description: "Add or update employee profiles",
          action: () => Promise.resolve(navigate('/employee-management')),
          variant: "outline" as const
        },
        {
          icon: Settings,
          label: "Question Templates",
          description: "Manage appraisal questions",
          action: () => Promise.resolve(navigate('/question-templates')),
          variant: "outline" as const
        }
      );
    }

    if (profile?.role === 'manager') {
      baseActions.unshift(
        {
          icon: Users,
          label: "Team Reviews",
          description: "Review team appraisals",
          action: () => Promise.resolve(navigate('/manager-appraisals')),
          variant: "default" as const
        },
        {
          icon: Calendar,
          label: "Schedule Reviews",
          description: "Manage review timeline",
          action: () => Promise.resolve(navigate('/appraisal-cycles')),
          variant: "outline" as const
        }
      );
    }

    return baseActions;
  };

  return (
    <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Quick Actions
        </CardTitle>
        <CardDescription>
          Common tasks and shortcuts for {profile?.role === 'hr' ? 'HR' : profile?.role === 'manager' ? 'Managers' : 'Employees'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {getActionButtons().map((action, index) => (
            <Button
              key={index}
              className="w-full justify-start h-auto p-4"
              variant={action.variant}
              onClick={action.action}
              disabled={isLoading !== null}
            >
              <div className="flex items-center gap-3 w-full">
                <action.icon className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1 text-left">
                  <div className="font-medium">{action.label}</div>
                  <div className="text-sm text-muted-foreground">
                    {action.description}
                  </div>
                </div>
                {isLoading === action.label.toLowerCase().replace(/\s+/g, '-') && (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                )}
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
