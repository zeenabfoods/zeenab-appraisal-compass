
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { updateEmployeeAssignments } from '@/utils/employeeDataFixer';

export function QuickEmployeeAssignmentFixer() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleUpdateAssignments = async () => {
    setIsUpdating(true);
    try {
      const result = await updateEmployeeAssignments();
      if (result.success) {
        toast({
          title: "Success",
          description: "Employee assignments updated successfully. Please refresh the Assignment Tracking tab.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update employee assignments.",
          variant: "destructive"
        });
      }
    } catch (error) {
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
          This will assign Ebenezer Ise to the Human Resources department with Human Resource as the line manager.
        </p>
        <Button 
          onClick={handleUpdateAssignments}
          disabled={isUpdating}
        >
          {isUpdating ? 'Updating...' : 'Fix Employee Assignments'}
        </Button>
      </CardContent>
    </Card>
  );
}
