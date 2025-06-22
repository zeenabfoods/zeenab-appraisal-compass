
import React from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { FixStatus } from '@/hooks/useEmployeeProfileFixer';

interface ProfileFixerStatusProps {
  status: FixStatus;
}

export function ProfileFixerStatus({ status }: ProfileFixerStatusProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
      case 'fixing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'checking':
        return 'Checking current profile and department data...';
      case 'fixing':
        return 'Updating employee profile with department and manager...';
      case 'success':
        return 'Employee profile successfully updated with HR department and manager!';
      case 'error':
        return 'Failed to update employee profile.';
      default:
        return 'Employee profile needs department and line manager assignment to show correctly in tracking.';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {getStatusIcon()}
      <span>{getStatusMessage()}</span>
    </div>
  );
}
