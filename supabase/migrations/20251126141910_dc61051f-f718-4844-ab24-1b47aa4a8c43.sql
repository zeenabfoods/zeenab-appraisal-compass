-- Add overtime and night shift columns to attendance_rules
ALTER TABLE public.attendance_rules 
ADD COLUMN IF NOT EXISTS overtime_rate numeric DEFAULT 1.5,
ADD COLUMN IF NOT EXISTS night_shift_start_time time DEFAULT '22:00:00',
ADD COLUMN IF NOT EXISTS night_shift_end_time time DEFAULT '06:00:00',
ADD COLUMN IF NOT EXISTS night_shift_rate numeric DEFAULT 1.2;

-- Add overtime and night shift tracking to attendance_logs
ALTER TABLE public.attendance_logs
ADD COLUMN IF NOT EXISTS overtime_hours numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_night_shift boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS night_shift_hours numeric DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN public.attendance_rules.overtime_rate IS 'Multiplier for overtime pay (e.g., 1.5 = 150% of base rate)';
COMMENT ON COLUMN public.attendance_rules.night_shift_start_time IS 'Start time for night shift window';
COMMENT ON COLUMN public.attendance_rules.night_shift_end_time IS 'End time for night shift window';
COMMENT ON COLUMN public.attendance_rules.night_shift_rate IS 'Additional multiplier for night shift (e.g., 1.2 = 120% of base rate)';

COMMENT ON COLUMN public.attendance_logs.overtime_hours IS 'Hours worked beyond standard work hours';
COMMENT ON COLUMN public.attendance_logs.is_night_shift IS 'Whether this attendance log is for a night shift';
COMMENT ON COLUMN public.attendance_logs.night_shift_hours IS 'Number of hours worked during night shift window';