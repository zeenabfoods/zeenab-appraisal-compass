
import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { useAppraisalDeletion } from '@/hooks/useAppraisalDeletion';

interface DeleteAppraisalButtonProps {
  appraisalId: string;
  employeeName: string;
  onSuccess: () => void;
}

export function DeleteAppraisalButton({ appraisalId, employeeName, onSuccess }: DeleteAppraisalButtonProps) {
  const { deleteAppraisal, isDeleting } = useAppraisalDeletion();

  const handleDelete = async () => {
    const success = await deleteAppraisal(appraisalId);
    if (success) {
      onSuccess();
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          className="flex items-center space-x-2"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete Appraisal</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Appraisal</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Are you sure you want to delete this appraisal for <strong>{employeeName}</strong>?</p>
            <p className="text-sm text-red-600">
              This action cannot be undone. All responses and data associated with this appraisal will be permanently deleted.
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
            {isDeleting ? 'Deleting...' : 'Delete Appraisal'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
