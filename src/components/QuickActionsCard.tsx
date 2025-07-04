
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/components/AuthProvider';
import { BarChart3, Users, Shield, Calendar, FileText, Settings } from 'lucide-react';

export function QuickActionsCard() {
  const navigate = useNavigate();
  const { profile } = useAuthContext();

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'start-appraisal':
        navigate('/my-appraisals');
        break;
      case 'view-team':
        navigate('/manager-appraisals');
        break;
      case 'generate-reports':
        navigate('/company-reports');
        break;
      case 'manage-cycles':
        navigate('/appraisal-cycles');
        break;
      case 'employee-management':
        navigate('/employee-management');
        break;
      case 'question-templates':
        navigate('/question-templates');
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  // Determine which actions are available based on user role
  const getAvailableActions = () => {
    const commonActions = [
      {
        id: 'start-appraisal',
        label: 'Start New Appraisal',
        icon: BarChart3,
        description: 'Begin a new appraisal cycle'
      }
    ];

    if (profile?.role === 'manager' || profile?.role === 'hr' || profile?.role === 'admin') {
      return [
        ...commonActions,
        {
          id: 'view-team',
          label: 'View Team Performance',
          icon: Users,
          description: 'Review team appraisals'
        },
        {
          id: 'generate-reports',
          label: 'Generate Reports',
          icon: Shield,
          description: 'Create performance reports'
        }
      ];
    }

    if (profile?.role === 'hr' || profile?.role === 'admin') {
      return [
        ...commonActions,
        {
          id: 'manage-cycles',
          label: 'Manage Cycles',
          icon: Calendar,
          description: 'Configure appraisal cycles'
        },
        {
          id: 'employee-management',
          label: 'Manage Employees',
          icon: Users,
          description: 'Employee administration'
        },
        {
          id: 'question-templates',
          label: 'Question Templates',
          icon: FileText,
          description: 'Manage question templates'
        }
      ];
    }

    return commonActions;
  };

  const availableActions = getAvailableActions();

  return (
    <Card className="backdrop-blur-md bg-white/60 border-white/40 shadow-lg">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {availableActions.map((action) => (
            <Button
              key={action.id}
              className="w-full justify-start"
              variant="outline"
              onClick={() => handleQuickAction(action.id)}
            >
              <action.icon className="mr-2 h-4 w-4" />
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
