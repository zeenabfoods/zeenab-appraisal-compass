-- Add OneSignal App ID column to attendance_settings
ALTER TABLE public.attendance_settings 
ADD COLUMN IF NOT EXISTS onesignal_app_id TEXT;