-- Add api_demo_mode column to attendance_settings
ALTER TABLE public.attendance_settings 
ADD COLUMN IF NOT EXISTS api_demo_mode boolean DEFAULT false;