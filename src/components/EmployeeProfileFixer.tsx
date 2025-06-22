
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useEmployeeProfileFixer } from '@/hooks/useEmployeeProfileFixer';
import { ProfileFixerStatus } from '@/components/ProfileFixerStatus';

interface EmployeeProfileFixerProps {
  onFixCompleted?: () => void;
}

export function EmployeeProfileFixer({ onFixCompleted }: EmployeeProfileFixerProps) {
  const { fixing, status, fixEmployeeProfile } = useEmployeeProfileFixer();

  const handleFixProfile = () => {
    fixEmployeeProfile(onFixCompleted);
  };

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <CardTitle>
          <ProfileFixerStatus status={status} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Fix Profile Assignment Issue
        </p>
        
        {status !== 'success' && (
          <Button 
            onClick={handleFixProfile}
            disabled={fixing}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {fixing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Fixing Profile...
              </>
            ) : (
              'Fix Employee Profile'
            )}
          </Button>
        )}
        
        {status === 'success' && (
          <div className="space-y-2">
            <p className="text-sm text-green-600 font-medium">
              ✅ Profile fixed! The assignment tracking should now show proper department and manager.
            </p>
            <Button 
              onClick={() => onFixCompleted?.()}
              variant="outline"
              size="sm"
            >
              Refresh Assignment Data
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
