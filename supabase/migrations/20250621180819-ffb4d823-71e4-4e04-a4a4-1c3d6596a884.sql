
-- Enable RLS on appraisals table (if not already enabled)
ALTER TABLE public.appraisals ENABLE ROW LEVEL SECURITY;

-- Create policy to allow HR and Admin users to insert appraisals
CREATE POLICY "HR and Admin can insert appraisals"
ON public.appraisals
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('hr', 'admin')
  )
);

-- Create policy to allow HR and Admin users to select all appraisals
CREATE POLICY "HR and Admin can view all appraisals"
ON public.appraisals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('hr', 'admin')
  )
);

-- Create policy to allow employees to view their own appraisals
CREATE POLICY "Employees can view their own appraisals"
ON public.appraisals
FOR SELECT
USING (employee_id = auth.uid());

-- Create policy to allow line managers to view appraisals of their direct reports
CREATE POLICY "Line managers can view their team's appraisals"
ON public.appraisals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND id IN (
      SELECT line_manager_id FROM public.profiles
      WHERE id = appraisals.employee_id
    )
  )
);

-- Create policy to allow HR and Admin users to update appraisals
CREATE POLICY "HR and Admin can update appraisals"
ON public.appraisals
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('hr', 'admin')
  )
);

-- Create policy to allow employees to update their own appraisals (when in draft status)
CREATE POLICY "Employees can update their own draft appraisals"
ON public.appraisals
FOR UPDATE
USING (
  employee_id = auth.uid()
  AND status = 'draft'
);
