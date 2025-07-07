
-- Add a function to complete appraisal cycles and prevent employee access
CREATE OR REPLACE FUNCTION public.complete_appraisal_cycle(cycle_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the cycle status to completed
  UPDATE public.appraisal_cycles 
  SET status = 'completed', updated_at = now()
  WHERE id = cycle_id_param;
  
  -- Update all related appraisals to completed status
  UPDATE public.appraisals 
  SET status = 'completed', completed_at = now()
  WHERE cycle_id = cycle_id_param 
  AND status != 'completed';
END;
$$;

-- Update the accessibility function to be more restrictive for completed cycles
CREATE OR REPLACE FUNCTION public.is_cycle_accessible_to_employee(cycle_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cycle_status text;
  cycle_end_date date;
BEGIN
  SELECT status, end_date 
  INTO cycle_status, cycle_end_date
  FROM public.appraisal_cycles 
  WHERE id = cycle_id_param;
  
  -- Cycle is only accessible if it's active (not completed or draft)
  RETURN cycle_status = 'active';
END;
$$;
