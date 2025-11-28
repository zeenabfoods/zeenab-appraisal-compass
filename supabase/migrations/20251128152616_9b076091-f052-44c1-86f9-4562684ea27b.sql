-- Create voice guides table to store voice file mappings
CREATE TABLE IF NOT EXISTS public.voice_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL UNIQUE,
  event_category TEXT NOT NULL,
  phrase_text TEXT NOT NULL,
  audio_file_url TEXT,
  is_active BOOLEAN DEFAULT true,
  volume DECIMAL(3,2) DEFAULT 0.8,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_guides ENABLE ROW LEVEL SECURITY;

-- HR and Admin can manage voice guides
CREATE POLICY "HR and Admin can view voice guides"
  ON public.voice_guides
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'admin')
    )
  );

CREATE POLICY "HR and Admin can update voice guides"
  ON public.voice_guides
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'admin')
    )
  );

CREATE POLICY "HR and Admin can insert voice guides"
  ON public.voice_guides
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'admin')
    )
  );

-- All authenticated users can read voice guides for playback
CREATE POLICY "All users can read voice guides for playback"
  ON public.voice_guides
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Insert default voice guide entries with all 35 events
INSERT INTO public.voice_guides (event_type, event_category, phrase_text) VALUES
  -- Clock-in/Clock-out Events
  ('clock_in_success', 'clock_events', 'Clock-in successful. Welcome to work. Have a productive day.'),
  ('clock_out_success', 'clock_events', 'Clock-out successful. Thank you for your hard work today. See you tomorrow.'),
  ('clock_in_late', 'clock_events', 'Clock-in recorded. You are late. A lateness charge may be applied.'),
  ('clock_in_reminder', 'clock_events', 'Good morning. This is your clock-in reminder. Work hours have started.'),
  ('clock_out_reminder', 'clock_events', 'Work hours are ending. Please remember to clock out before leaving.'),
  ('auto_clockout_warning', 'clock_events', 'You will be automatically clocked out in one minute. Please clock out manually to avoid early closure charges.'),
  
  -- Geofence Alerts
  ('geofence_exit', 'geofence', 'Alert. You are leaving the office geofence area while still clocked in. Please return or clock out.'),
  ('geofence_entry', 'geofence', 'You have entered the office geofence. You can now clock in.'),
  ('geofence_violation', 'geofence', 'Geofence violation detected. Your location is outside the authorized work area.'),
  
  -- Break Management
  ('break_started', 'breaks', 'Break started. Enjoy your break.'),
  ('break_ended', 'breaks', 'Break ended. Welcome back to work.'),
  ('break_reminder', 'breaks', 'Break time reminder. Your scheduled break period is starting now.'),
  ('break_overdue', 'breaks', 'Break time exceeded. Please return to work immediately.'),
  ('break_not_allowed', 'breaks', 'Break not allowed. You are outside the scheduled break period.'),
  
  -- Time Management
  ('late_arrival', 'time_management', 'You are late. Please clock in immediately. A lateness charge may be applied.'),
  ('early_departure', 'time_management', 'Early departure detected. You are leaving before the end of work hours. An early closure charge will be applied.'),
  ('overtime_started', 'time_management', 'You are now working overtime. Overtime hours will be recorded for compensation.'),
  ('work_hours_complete', 'time_management', 'Your scheduled work hours are complete. You may clock out now.'),
  ('grace_period_expiring', 'time_management', 'Grace period expiring. Please clock in within the next few minutes to avoid lateness charges.'),
  
  -- Field Work & Vehicle Tracking
  ('field_trip_started', 'field_work', 'Field trip started. Your location is being tracked. Drive safely.'),
  ('field_trip_ended', 'field_work', 'Field trip ended successfully. Thank you for completing your field assignment.'),
  ('route_deviation', 'field_work', 'Alert. Route deviation detected. You have moved away from the authorized route.'),
  ('extended_stop', 'field_work', 'Alert. Extended stop detected. You have been stationary for over 15 minutes at a non-work location.'),
  ('trip_overdue', 'field_work', 'Trip overdue. Your expected return time has passed. Please complete your trip and return to base.'),
  
  -- Financial & Compliance
  ('charge_applied', 'financial', 'A lateness charge has been applied to your account. Please arrive on time to avoid future charges.'),
  ('charge_waived', 'financial', 'Your attendance charge has been waived. No deduction will be made.'),
  ('absence_recorded', 'financial', 'Absence recorded. You were marked absent today. An absence charge has been applied.'),
  ('compliance_warning', 'financial', 'Compliance warning. Repeated violations may result in disciplinary action.'),
  
  -- System & Sync
  ('sync_complete', 'system', 'Sync complete. All your attendance records are up to date.'),
  ('sync_pending', 'system', 'You are offline. Your attendance data will sync when connection is restored.'),
  ('sync_error', 'system', 'Sync error. Some of your attendance records could not be uploaded. Please check your connection.'),
  ('system_maintenance', 'system', 'System maintenance scheduled. The attendance system will be unavailable briefly.'),
  
  -- Quick Actions
  ('action_success', 'quick_actions', 'Action successful.'),
  ('action_failed', 'quick_actions', 'Action failed. Please try again.'),
  ('permission_denied', 'quick_actions', 'Permission denied. You do not have authorization for this action.')
ON CONFLICT (event_type) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_voice_guides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER voice_guides_updated_at
  BEFORE UPDATE ON public.voice_guides
  FOR EACH ROW
  EXECUTE FUNCTION update_voice_guides_updated_at();

COMMENT ON TABLE public.voice_guides IS 'Stores voice guide audio files for different attendance events';