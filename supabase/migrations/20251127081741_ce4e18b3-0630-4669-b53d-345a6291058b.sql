-- Create table for tracking manager meetings and calendar events
CREATE TABLE IF NOT EXISTS public.manager_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('meeting', 'c_level_meeting', 'department_meeting', 'all_hands', 'availability')),
  event_date DATE NOT NULL,
  event_time TIME,
  title TEXT NOT NULL,
  department_ids UUID[] DEFAULT '{}',
  is_c_level BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  CONSTRAINT valid_event_type CHECK (event_type IN ('meeting', 'c_level_meeting', 'department_meeting', 'all_hands', 'availability'))
);

-- Enable RLS
ALTER TABLE public.manager_calendar_events ENABLE ROW LEVEL SECURITY;

-- Policy for HR and Admin to manage calendar events
CREATE POLICY "HR and Admin can manage calendar events"
ON public.manager_calendar_events
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('hr', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('hr', 'admin')
  )
);

-- Policy for managers to view their own calendar events
CREATE POLICY "Managers can view their own calendar events"
ON public.manager_calendar_events
FOR SELECT
USING (
  manager_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('hr', 'admin', 'manager')
  )
);

-- Create index for performance
CREATE INDEX idx_manager_calendar_events_date ON public.manager_calendar_events(event_date);
CREATE INDEX idx_manager_calendar_events_manager ON public.manager_calendar_events(manager_id);

-- Create table for department-level eye service summary
CREATE TABLE IF NOT EXISTS public.eye_service_department_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  department_name TEXT NOT NULL,
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_employees INTEGER NOT NULL DEFAULT 0,
  low_risk_count INTEGER NOT NULL DEFAULT 0,
  medium_risk_count INTEGER NOT NULL DEFAULT 0,
  high_risk_count INTEGER NOT NULL DEFAULT 0,
  avg_consistency_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  manager_presence_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(department_id, analysis_date)
);

-- Enable RLS
ALTER TABLE public.eye_service_department_summary ENABLE ROW LEVEL SECURITY;

-- Policy for HR and Admin to manage department summaries
CREATE POLICY "HR and Admin can manage department summaries"
ON public.eye_service_department_summary
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('hr', 'admin')
  )
);

-- Policy for managers to view their department summaries
CREATE POLICY "Managers can view their department summaries"
ON public.eye_service_department_summary
FOR SELECT
USING (
  department_id IN (
    SELECT department_id FROM public.profiles
    WHERE id = auth.uid() AND role = 'manager'
  ) OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('hr', 'admin')
  )
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_eye_service_department_summary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_eye_service_department_summary_updated_at
BEFORE UPDATE ON public.eye_service_department_summary
FOR EACH ROW
EXECUTE FUNCTION update_eye_service_department_summary_updated_at();