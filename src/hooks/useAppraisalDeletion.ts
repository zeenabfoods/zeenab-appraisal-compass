
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAppraisalDeletion() {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteAppraisal = async (appraisalId: string) => {
    try {
      setIsDeleting(true);
      
      // Delete appraisal responses first
      const { error: responsesError } = await supabase
        .from('appraisal_responses')
        .delete()
        .eq('appraisal_id', appraisalId);

      if (responsesError) {
        console.error('Error deleting appraisal responses:', responsesError);
        throw responsesError;
      }

      // Then delete the appraisal itself
      const { error: appraisalError } = await supabase
        .from('appraisals')
        .delete()
        .eq('id', appraisalId);

      if (appraisalError) {
        console.error('Error deleting appraisal:', appraisalError);
        throw appraisalError;
      }

      toast({
        title: "Success",
        description: "Appraisal deleted successfully"
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting appraisal:', error);
      toast({
        title: "Error",
        description: "Failed to delete appraisal",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deleteAppraisal,
    isDeleting
  };
}
