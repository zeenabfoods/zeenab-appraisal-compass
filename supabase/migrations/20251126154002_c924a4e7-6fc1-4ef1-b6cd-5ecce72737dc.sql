-- Add column to control whether multiple clock-ins per day are allowed
ALTER TABLE public.attendance_rules 
ADD COLUMN allow_multiple_sessions_per_day BOOLEAN NOT NULL DEFAULT true;

-- Add helpful comment
COMMENT ON COLUMN public.attendance_rules.allow_multiple_sessions_per_day IS 'When false, employees can only clock in once per day. When true, multiple clock-in/out sessions are allowed.';