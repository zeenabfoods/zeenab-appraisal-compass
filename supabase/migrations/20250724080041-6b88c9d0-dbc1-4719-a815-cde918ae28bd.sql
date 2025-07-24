
-- Add a deleted_at column to track when assignments are deleted
ALTER TABLE public.employee_appraisal_questions 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Update the existing RLS policies to exclude deleted assignments
DROP POLICY IF EXISTS "Employees can view their own appraisal questions" ON public.employee_appraisal_questions;
DROP POLICY IF EXISTS "Managers can view their team's appraisal questions" ON public.employee_appraisal_questions;

-- Recreate policies to exclude deleted assignments
CREATE POLICY "Employees can view their own appraisal questions" 
  ON public.employee_appraisal_questions 
  FOR SELECT 
  USING (employee_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Managers can view their team's appraisal questions" 
  ON public.employee_appraisal_questions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = employee_appraisal_questions.employee_id 
      AND profiles.line_manager_id = auth.uid()
    ) 
    AND deleted_at IS NULL
  );

-- Create a function to soft delete appraisal assignments
CREATE OR REPLACE FUNCTION public.delete_employee_appraisal_assignment(assignment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Update the assignment to mark it as deleted
  UPDATE public.employee_appraisal_questions 
  SET deleted_at = now(), is_active = false
  WHERE id = assignment_id;
  
  -- Also deactivate related appraisal responses if they exist
  UPDATE public.appraisal_responses 
  SET status = 'deleted'
  WHERE question_id IN (
    SELECT question_id 
    FROM public.employee_appraisal_questions 
    WHERE id = assignment_id
  );
END;
$function$;
