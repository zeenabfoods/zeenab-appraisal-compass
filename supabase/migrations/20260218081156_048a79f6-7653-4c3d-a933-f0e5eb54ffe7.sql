
-- Create shift_assignments table for B+C hybrid shift management
CREATE TABLE public.shift_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('day', 'night', 'rotating')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Index for fast lookups by employee + date
CREATE INDEX idx_shift_assignments_employee_date 
  ON public.shift_assignments(employee_id, start_date, end_date)
  WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER update_shift_assignments_updated_at
  BEFORE UPDATE ON public.shift_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;

-- HR and Admin can manage all shift assignments
CREATE POLICY "HR and Admin can manage shift assignments"
  ON public.shift_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('hr', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('hr', 'admin')
    )
  );

-- Employees can view their own shift assignments
CREATE POLICY "Employees can view own shift assignments"
  ON public.shift_assignments
  FOR SELECT
  USING (employee_id = auth.uid());

-- Managers can view their team's shift assignments
CREATE POLICY "Managers can view team shift assignments"
  ON public.shift_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = shift_assignments.employee_id
      AND line_manager_id = auth.uid()
    )
  );
