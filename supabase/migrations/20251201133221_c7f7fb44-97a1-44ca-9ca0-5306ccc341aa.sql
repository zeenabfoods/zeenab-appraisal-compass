-- Add overtime prompt tracking columns to attendance_logs
ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS overtime_prompted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS overtime_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS overtime_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS overtime_start_time TIMESTAMP WITH TIME ZONE;