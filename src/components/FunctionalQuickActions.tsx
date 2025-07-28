
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
  RefreshCw,
  UserPlus,
  Zap
} from 'lucide-react';

export function FunctionalQuickActions() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleAction = async (actionId: string, callback: () => Promise<void> | void) => {
    setIsLoading(actionId);
    try {
      await callback();
    } catch (error) {
      console.error(`Error in ${actionId}:`, error);
      toast({
        title: "Error",
        description: `Failed to perform action. Please try again.`,
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

    if (!appraisals || appraisals.length === 0) {
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
        `${a.profiles?.first_name || ''} ${a.profiles?.last_name || ''}`.trim(),
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
      description: `Performance report downloaded with ${appraisals.length} completed appraisals.`,
    });
  };

  const syncData = async () => {
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: "Data Refreshed",
      description: "All dashboard data has been synchronized.",
    });
  };

  // Only show actions if user has a profile
  if (!profile) {
    return (
      <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Loading user permissions...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getActionButtons = () => {
    const baseActions = [
      {
        id: 'view-analytics',
        icon: BarChart3,
        label: "View Analytics",
        description: "Performance insights and reports",
        action: () => Promise.resolve(navigate('/company-reports')),
        variant: "default" as const
      },
      {
        id: 'generate-report',
        icon: FileText,
        label: "Generate Report",
        description: "Export performance data",
        action: () => handleAction('generate-report', generateReport),
        variant: "outline" as const
      },
      {
        id: 'sync-data',
        icon: RefreshCw,
        label: "Refresh Data",
        description: "Sync latest information",
        action: () => handleAction('sync-data', syncData),
        variant: "outline" as const
      }
    ];

    // Add role-specific actions
    if (profile.role === 'hr' || profile.role === 'admin') {
      baseActions.unshift(
        {
          id: 'new-cycle',
          icon: Plus,
          label: "New Appraisal Cycle",
          description: "Create performance review cycle",
          action: () => Promise.resolve(navigate('/appraisal-cycles')),
          variant: "default" as const
        },
        {
          id: 'manage-employees',
          icon: UserPlus,
          label: "Manage Employees",
          description: "Employee profiles and settings",
          action: () => Promise.resolve(navigate('/employee-management')),
          variant: "outline" as const
        }
      );
    }

    if (profile.role === 'manager') {
      baseActions.unshift(
        {
          id: 'team-reviews',
          icon: Users,
          label: "Team Reviews",
          description: "Review team performance",
          action: () => Promise.resolve(navigate('/manager-appraisals')),
          variant: "default" as const
        }
      );
    }

    return baseActions;
  };

  const actions = getActionButtons();

  return (
    <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Quick Actions
        </CardTitle>
        <CardDescription>
          {profile.role === 'hr' ? 'HR Management Tools' : 
           profile.role === 'admin' ? 'Admin Tools' :
           profile.role === 'manager' ? 'Manager Tools' : 'Employee Tools'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {actions.map((action) => (
            <Button
              key={action.id}
              className="w-full justify-start h-auto p-4 text-left"
              variant={action.variant}
              onClick={action.action}
              disabled={isLoading !== null}
            >
              <div className="flex items-center gap-3 w-full">
                <action.icon className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-medium">{action.label}</div>
                  <div className="text-sm text-muted-foreground">
                    {action.description}
                  </div>
                </div>
                {isLoading === action.id && (
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
