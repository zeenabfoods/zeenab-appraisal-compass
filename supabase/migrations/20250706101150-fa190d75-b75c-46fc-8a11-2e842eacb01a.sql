
-- First, let's add RLS policies to allow HR/Admin to delete appraisals
CREATE POLICY "HR and Admin can delete appraisals" 
ON public.appraisals 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('hr', 'admin')
  )
);

-- Add policy to allow HR/Admin to delete appraisal cycles
CREATE POLICY "HR and Admin can delete cycles" 
ON public.appraisal_cycles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('hr', 'admin')
  )
);

-- Add a function to check if an appraisal cycle is accessible to employees
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
  
  -- Cycle is accessible if it's active or if it's completed but within 30 days of end date
  RETURN cycle_status = 'active' OR 
         (cycle_status = 'completed' AND cycle_end_date >= CURRENT_DATE - INTERVAL '30 days');
END;
$$;

-- Update appraisals RLS policy for employees to check cycle accessibility
DROP POLICY IF EXISTS "Employees can view their own appraisals" ON public.appraisals;
CREATE POLICY "Employees can view accessible appraisals" 
ON public.appraisals 
FOR SELECT 
USING (
  employee_id = auth.uid() 
  AND (
    -- HR/Admin can always view
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('hr', 'admin')
    )
    OR 
    -- Employees can only view if cycle is accessible
    public.is_cycle_accessible_to_employee(cycle_id)
  )
);

-- Update employee draft appraisal update policy to check cycle accessibility
DROP POLICY IF EXISTS "Employees can update their own draft appraisals" ON public.appraisals;
CREATE POLICY "Employees can update accessible draft appraisals" 
ON public.appraisals 
FOR UPDATE 
USING (
  employee_id = auth.uid() 
  AND status = 'draft' 
  AND public.is_cycle_accessible_to_employee(cycle_id)
);
