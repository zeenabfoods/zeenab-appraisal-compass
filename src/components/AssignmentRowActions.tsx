
import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AssignmentRowActionsProps {
  employeeId: string;
  employeeName: string;
  cycleId?: string;
  onDelete: () => void;
}

export function AssignmentRowActions({ employeeId, employeeName, cycleId, onDelete }: AssignmentRowActionsProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Delete question assignments scoped to the current cycle (if provided)
      let questionsQuery = supabase
        .from('employee_appraisal_questions')
        .update({ 
          deleted_at: new Date().toISOString(),
          is_active: false 
        })
        .eq('employee_id', employeeId);

      if (cycleId) {
        questionsQuery = questionsQuery.eq('cycle_id', cycleId);
      }

      const { error: questionsError } = await questionsQuery;
      if (questionsError) throw questionsError;

      // Delete the appraisal record scoped to the current cycle (if provided)
      let appraisalQuery = supabase
        .from('appraisals')
        .delete()
        .eq('employee_id', employeeId);

      if (cycleId) {
        appraisalQuery = appraisalQuery.eq('cycle_id', cycleId);
      }

      const { error: appraisalError } = await appraisalQuery;
      if (appraisalError) throw appraisalError;

      toast({
        title: "Success",
        description: `Assignments for ${employeeName} have been deleted successfully.`
      });

      onDelete();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast({
        title: "Error",
        description: "Failed to delete assignment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Employee Assignment</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Are you sure you want to delete all assignments for <strong>{employeeName}</strong>?</p>
            <p className="text-sm text-red-600">
              This action will remove all question assignments and appraisal data for this employee. 
              The employee will no longer see any assignments. This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? 'Deleting...' : 'Delete Assignment'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
