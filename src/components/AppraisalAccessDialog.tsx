
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface AppraisalAccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appraisalName: string;
}

export function AppraisalAccessDialog({ isOpen, onClose, appraisalName }: AppraisalAccessDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="backdrop-blur-md bg-white/90">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            <DialogTitle>Appraisal Cycle Completed</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            The appraisal cycle for "{appraisalName}" has been completed. 
            You will not be able to make any changes to your submission.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4 pt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-medium text-amber-800 mb-2">What happens next?</h4>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• You will face the committee for further action regarding this appraisal</li>
              <li>• Your manager and HR have been notified</li>
              <li>• You may be contacted for additional discussions</li>
              <li>• Future appraisal cycles will be available when they are created</li>
            </ul>
          </div>
          
          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              I Understand
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
