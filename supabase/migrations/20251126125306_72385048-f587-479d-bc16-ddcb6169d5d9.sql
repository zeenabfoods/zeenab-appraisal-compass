-- Create break schedules table for HR to configure break times
CREATE TABLE IF NOT EXISTS public.attendance_break_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  break_type TEXT NOT NULL CHECK (break_type IN ('short_break', 'lunch', 'afternoon_break')),
  break_name TEXT NOT NULL,
  scheduled_start_time TIME NOT NULL,
  scheduled_end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  applies_to_departments TEXT[],
  notification_minutes_before INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance_break_schedules ENABLE ROW LEVEL SECURITY;

-- Policies for break schedules
CREATE POLICY "All authenticated users can view active break schedules"
  ON public.attendance_break_schedules
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "HR and Admin can manage break schedules"
  ON public.attendance_break_schedules
  FOR ALL
  TO authenticated
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

-- Add break compliance tracking columns to attendance_breaks
ALTER TABLE public.attendance_breaks
  ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES public.attendance_break_schedules(id),
  ADD COLUMN IF NOT EXISTS was_on_time BOOLEAN DEFAULT null,
  ADD COLUMN IF NOT EXISTS minutes_late INTEGER DEFAULT null;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_break_schedules_active ON public.attendance_break_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_break_schedules_type ON public.attendance_break_schedules(break_type);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_break_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_break_schedules_updated_at
  BEFORE UPDATE ON public.attendance_break_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_break_schedule_updated_at();