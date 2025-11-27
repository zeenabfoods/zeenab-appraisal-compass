-- Create storage bucket for alert sounds
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'alert-sounds',
  'alert-sounds',
  true,
  5242880, -- 5MB limit
  ARRAY['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg']
);

-- RLS policies for alert sounds bucket
CREATE POLICY "Anyone can view alert sounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'alert-sounds');

CREATE POLICY "HR and Admin can upload alert sounds"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'alert-sounds' 
  AND auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('hr', 'admin')
  )
);

CREATE POLICY "HR and Admin can update alert sounds"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'alert-sounds'
  AND auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('hr', 'admin')
  )
);

CREATE POLICY "HR and Admin can delete alert sounds"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'alert-sounds'
  AND auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('hr', 'admin')
  )
);

-- Create attendance settings table for alert sound configuration
CREATE TABLE IF NOT EXISTS attendance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_sound_url TEXT,
  alert_volume DECIMAL DEFAULT 0.8,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO attendance_settings (alert_sound_url, alert_volume)
VALUES (NULL, 0.8);

-- Enable RLS
ALTER TABLE attendance_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Anyone can view attendance settings"
ON attendance_settings FOR SELECT
USING (true);

-- Only HR/Admin can update settings
CREATE POLICY "HR and Admin can update attendance settings"
ON attendance_settings FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('hr', 'admin')
  )
);