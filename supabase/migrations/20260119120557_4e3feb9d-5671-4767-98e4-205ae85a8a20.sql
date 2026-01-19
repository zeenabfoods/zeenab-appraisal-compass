-- Create weekend work schedules table to track employee weekend work intentions
CREATE TABLE public.weekend_work_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weekend_date DATE NOT NULL,
  will_work BOOLEAN NOT NULL DEFAULT true,
  confirmed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  attendance_logged BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, weekend_date)
);

-- Enable RLS
ALTER TABLE public.weekend_work_schedules ENABLE ROW LEVEL SECURITY;

-- Employees can view and manage their own weekend schedules
CREATE POLICY "Employees can view their own weekend schedules"
ON public.weekend_work_schedules
FOR SELECT
USING (auth.uid() = employee_id);

CREATE POLICY "Employees can insert their own weekend schedules"
ON public.weekend_work_schedules
FOR INSERT
WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Employees can update their own weekend schedules"
ON public.weekend_work_schedules
FOR UPDATE
USING (auth.uid() = employee_id);

-- HR and Admin can view all weekend schedules
CREATE POLICY "HR and Admin can view all weekend schedules"
ON public.weekend_work_schedules
FOR SELECT
USING (public.is_hr_or_admin(auth.uid()));

-- HR and Admin can manage all weekend schedules
CREATE POLICY "HR and Admin can manage all weekend schedules"
ON public.weekend_work_schedules
FOR ALL
USING (public.is_hr_or_admin(auth.uid()));

-- Add index for faster queries
CREATE INDEX idx_weekend_work_schedules_date ON public.weekend_work_schedules(weekend_date);
CREATE INDEX idx_weekend_work_schedules_employee ON public.weekend_work_schedules(employee_id);

-- Add trigger for updated_at
CREATE TRIGGER update_weekend_work_schedules_updated_at
BEFORE UPDATE ON public.weekend_work_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();