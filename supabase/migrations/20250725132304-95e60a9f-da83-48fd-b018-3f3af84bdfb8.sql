
-- Fix the delete_appraisal_cycle_cascade function to handle all edge cases
CREATE OR REPLACE FUNCTION public.delete_appraisal_cycle_cascade(cycle_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Delete in correct order to avoid foreign key constraints
  
  -- 1. Delete appraisal responses first
  DELETE FROM public.appraisal_responses 
  WHERE cycle_id = cycle_id_param;
  
  -- 2. Delete employee question assignments  
  DELETE FROM public.employee_appraisal_questions 
  WHERE cycle_id = cycle_id_param;
  
  -- 3. Delete appraisals
  DELETE FROM public.appraisals 
  WHERE cycle_id = cycle_id_param;
  
  -- 4. Finally delete the cycle itself
  DELETE FROM public.appraisal_cycles 
  WHERE id = cycle_id_param;
  
  -- Log success
  RAISE NOTICE 'Successfully deleted appraisal cycle %', cycle_id_param;
END;
$function$
