
import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

interface QuestionAssignmentActionsProps {
  assignmentId: string;
  questionText: string;
  isActive: boolean;
  onDelete: (assignmentId: string) => Promise<boolean>;
  onToggleStatus: (assignmentId: string, isActive: boolean) => Promise<boolean>;
  onSuccess: () => void;
}

export function QuestionAssignmentActions({ 
  assignmentId, 
  questionText, 
  isActive, 
  onDelete, 
  onToggleStatus, 
  onSuccess 
}: QuestionAssignmentActionsProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isToggling, setIsToggling] = React.useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await onDelete(assignmentId);
    setIsDeleting(false);
    if (success) {
      onSuccess();
    }
  };

  const handleToggleStatus = async () => {
    setIsToggling(true);
    const success = await onToggleStatus(assignmentId, !isActive);
    setIsToggling(false);
    if (success) {
      onSuccess();
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggleStatus}
        disabled={isToggling}
        className="flex items-center space-x-1"
      >
        {isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
        <span>{isActive ? 'Deactivate' : 'Activate'}</span>
      </Button>

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
            <AlertDialogTitle>Delete Question Assignment</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to delete this question assignment?</p>
              <p className="font-medium text-gray-900">"{questionText}"</p>
              <p className="text-sm text-red-600">
                This action cannot be undone. The question will be permanently removed from the employee's appraisal.
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
    </div>
  );
}
