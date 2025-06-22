
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { updateEmployeeAssignments } from '@/utils/employeeDataFixer';

interface QuickEmployeeAssignmentFixerProps {
  onFixCompleted?: () => void;
}

export function QuickEmployeeAssignmentFixer({ onFixCompleted }: QuickEmployeeAssignmentFixerProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleUpdateAssignments = async () => {
    setIsUpdating(true);
    try {
      console.log('Triggering employee assignment fix...');
      const result = await updateEmployeeAssignments();
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Employee assignments updated successfully. Data will refresh automatically.",
        });
        
        // Trigger refresh callback if provided
        if (onFixCompleted) {
          setTimeout(() => {
            onFixCompleted();
          }, 1000);
        }
      } else {
        console.error('Fix result error:', result.error);
        toast({
          title: "Error",
          description: "Failed to update employee assignments. Check console for details.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Fix operation error:', error);
      toast({
        title: "Error",
        description: "An error occurred while updating assignments.",
        variant: "destructive"
      });
    }
    setIsUpdating(false);
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Fix Employee Assignments</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          This will assign Ebenezer Ise to the Human Resources department with the HR manager as line manager.
        </p>
        <Button 
          onClick={handleUpdateAssignments}
          disabled={isUpdating}
        >
          {isUpdating ? 'Fixing...' : 'Fix Employee Assignments'}
        </Button>
      </CardContent>
    </Card>
  );
}
