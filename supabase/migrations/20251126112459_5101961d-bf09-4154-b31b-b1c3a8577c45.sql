-- =====================================================
-- ATTENDANCE MODULE DATABASE SCHEMA
-- Complete isolation with attendance_ namespace prefix
-- Zero dependencies on appraisal system tables
-- =====================================================

-- 1. ATTENDANCE BRANCHES (Geofence Configuration)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.attendance_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  latitude NUMERIC(10, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  geofence_radius INTEGER NOT NULL DEFAULT 100, -- in meters
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. ATTENDANCE RULES (HR Configuration Engine)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.attendance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  late_threshold_minutes INTEGER DEFAULT 15,
  grace_period_minutes INTEGER DEFAULT 5,
  late_charge_amount NUMERIC(10, 2) DEFAULT 500.00, -- Nigerian Naira
  absence_charge_amount NUMERIC(10, 2) DEFAULT 1000.00,
  mandatory_break_duration_minutes INTEGER DEFAULT 30,
  max_break_duration_minutes INTEGER DEFAULT 60,
  work_start_time TIME DEFAULT '08:00:00',
  work_end_time TIME DEFAULT '17:00:00',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- 3. ATTENDANCE LOGS (Core Clock In/Out Records)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  clock_out_time TIMESTAMP WITH TIME ZONE,
  
  -- Location tracking
  location_type TEXT NOT NULL CHECK (location_type IN ('office', 'field')),
  branch_id UUID REFERENCES public.attendance_branches(id),
  clock_in_latitude NUMERIC(10, 8),
  clock_in_longitude NUMERIC(11, 8),
  clock_out_latitude NUMERIC(10, 8),
  clock_out_longitude NUMERIC(11, 8),
  
  -- Geofence validation
  within_geofence_at_clock_in BOOLEAN DEFAULT false,
  within_geofence_at_clock_out BOOLEAN DEFAULT false,
  geofence_distance_at_clock_in INTEGER, -- in meters
  
  -- Field work details
  field_work_reason TEXT,
  field_work_location TEXT,
  
  -- Offline sync support
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  device_timestamp TIMESTAMP WITH TIME ZONE,
  
  -- Calculated fields
  total_hours NUMERIC(5, 2),
  is_late BOOLEAN DEFAULT false,
  late_by_minutes INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. ATTENDANCE BREAKS (Break Management)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.attendance_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_log_id UUID NOT NULL REFERENCES public.attendance_logs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  break_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  break_end TIMESTAMP WITH TIME ZONE,
  break_type TEXT NOT NULL CHECK (break_type IN ('lunch', 'tea', 'personal', 'other')),
  break_duration_minutes INTEGER,
  
  -- Location tracking
  break_start_latitude NUMERIC(10, 8),
  break_start_longitude NUMERIC(11, 8),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. ATTENDANCE CHARGES (Financial Accountability)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.attendance_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attendance_log_id UUID REFERENCES public.attendance_logs(id) ON DELETE SET NULL,
  
  charge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  charge_type TEXT NOT NULL CHECK (charge_type IN ('late_arrival', 'absence', 'early_departure', 'excessive_break', 'repeated_offense')),
  charge_amount NUMERIC(10, 2) NOT NULL,
  
  -- Escalation support
  is_escalated BOOLEAN DEFAULT false,
  escalation_multiplier NUMERIC(3, 2) DEFAULT 1.0,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'waived', 'disputed')),
  waived_by UUID REFERENCES public.profiles(id),
  waived_at TIMESTAMP WITH TIME ZONE,
  waiver_reason TEXT,
  
  -- Dispute handling
  disputed_at TIMESTAMP WITH TIME ZONE,
  dispute_reason TEXT,
  dispute_resolution TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. ATTENDANCE SESSIONS (Multi-session Support)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_number INTEGER NOT NULL DEFAULT 1,
  
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  session_type TEXT CHECK (session_type IN ('regular', 'overtime', 'weekend', 'holiday')),
  
  total_duration_minutes INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(employee_id, session_date, session_number)
);

-- 7. ATTENDANCE GEOFENCE ALERTS (Boundary Detection)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.attendance_geofence_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  alert_type TEXT NOT NULL CHECK (alert_type IN ('entering_geofence', 'leaving_geofence', 'approaching_geofence')),
  branch_id UUID REFERENCES public.attendance_branches(id),
  
  latitude NUMERIC(10, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  distance_from_branch INTEGER NOT NULL, -- in meters
  
  alert_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
  acknowledged BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. ATTENDANCE SYNC QUEUE (Offline-First Architecture)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.attendance_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  operation_type TEXT NOT NULL CHECK (operation_type IN ('clock_in', 'clock_out', 'break_start', 'break_end')),
  payload JSONB NOT NULL,
  
  -- Sync tracking
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  sync_attempts INTEGER DEFAULT 0,
  last_sync_attempt TIMESTAMP WITH TIME ZONE,
  sync_error TEXT,
  
  -- Offline tracking
  created_offline BOOLEAN DEFAULT false,
  device_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_attendance_logs_employee_id ON public.attendance_logs(employee_id);
CREATE INDEX idx_attendance_logs_clock_in_time ON public.attendance_logs(clock_in_time);
CREATE INDEX idx_attendance_logs_sync_status ON public.attendance_logs(sync_status);

CREATE INDEX idx_attendance_breaks_employee_id ON public.attendance_breaks(employee_id);
CREATE INDEX idx_attendance_breaks_log_id ON public.attendance_breaks(attendance_log_id);

CREATE INDEX idx_attendance_charges_employee_id ON public.attendance_charges(employee_id);
CREATE INDEX idx_attendance_charges_date ON public.attendance_charges(charge_date);
CREATE INDEX idx_attendance_charges_status ON public.attendance_charges(status);

CREATE INDEX idx_attendance_sessions_employee_date ON public.attendance_sessions(employee_id, session_date);

CREATE INDEX idx_attendance_sync_queue_employee ON public.attendance_sync_queue(employee_id);
CREATE INDEX idx_attendance_sync_queue_status ON public.attendance_sync_queue(sync_status);

CREATE INDEX idx_attendance_geofence_alerts_employee ON public.attendance_geofence_alerts(employee_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_attendance_branches_updated_at
  BEFORE UPDATE ON public.attendance_branches
  FOR EACH ROW EXECUTE FUNCTION update_attendance_updated_at();

CREATE TRIGGER update_attendance_rules_updated_at
  BEFORE UPDATE ON public.attendance_rules
  FOR EACH ROW EXECUTE FUNCTION update_attendance_updated_at();

CREATE TRIGGER update_attendance_logs_updated_at
  BEFORE UPDATE ON public.attendance_logs
  FOR EACH ROW EXECUTE FUNCTION update_attendance_updated_at();

CREATE TRIGGER update_attendance_breaks_updated_at
  BEFORE UPDATE ON public.attendance_breaks
  FOR EACH ROW EXECUTE FUNCTION update_attendance_updated_at();

CREATE TRIGGER update_attendance_charges_updated_at
  BEFORE UPDATE ON public.attendance_charges
  FOR EACH ROW EXECUTE FUNCTION update_attendance_updated_at();

CREATE TRIGGER update_attendance_sessions_updated_at
  BEFORE UPDATE ON public.attendance_sessions
  FOR EACH ROW EXECUTE FUNCTION update_attendance_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.attendance_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_geofence_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sync_queue ENABLE ROW LEVEL SECURITY;

-- BRANCHES: All authenticated users can view, HR/Admin can manage
CREATE POLICY "All users can view active branches"
  ON public.attendance_branches FOR SELECT
  USING (is_active = true);

CREATE POLICY "HR and Admin can manage branches"
  ON public.attendance_branches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('hr', 'admin')
    )
  );

-- RULES: All users can view, HR/Admin can manage
CREATE POLICY "All users can view active rules"
  ON public.attendance_rules FOR SELECT
  USING (is_active = true);

CREATE POLICY "HR and Admin can manage rules"
  ON public.attendance_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('hr', 'admin')
    )
  );

-- LOGS: Employees see own, Managers see team, HR/Admin see all
CREATE POLICY "Employees can view own attendance logs"
  ON public.attendance_logs FOR SELECT
  USING (employee_id = auth.uid());

CREATE POLICY "Employees can insert own attendance logs"
  ON public.attendance_logs FOR INSERT
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees can update own attendance logs"
  ON public.attendance_logs FOR UPDATE
  USING (employee_id = auth.uid());

CREATE POLICY "Managers can view team attendance logs"
  ON public.attendance_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = employee_id AND line_manager_id = auth.uid()
    )
  );

CREATE POLICY "HR and Admin can manage all attendance logs"
  ON public.attendance_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('hr', 'admin')
    )
  );

-- BREAKS: Same pattern as logs
CREATE POLICY "Employees can manage own breaks"
  ON public.attendance_breaks FOR ALL
  USING (employee_id = auth.uid());

CREATE POLICY "Managers can view team breaks"
  ON public.attendance_breaks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = employee_id AND line_manager_id = auth.uid()
    )
  );

CREATE POLICY "HR and Admin can manage all breaks"
  ON public.attendance_breaks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('hr', 'admin')
    )
  );

-- CHARGES: Employees view own, HR/Admin manage
CREATE POLICY "Employees can view own charges"
  ON public.attendance_charges FOR SELECT
  USING (employee_id = auth.uid());

CREATE POLICY "Managers can view team charges"
  ON public.attendance_charges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = employee_id AND line_manager_id = auth.uid()
    )
  );

CREATE POLICY "HR and Admin can manage all charges"
  ON public.attendance_charges FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('hr', 'admin')
    )
  );

-- SESSIONS: Same pattern as logs
CREATE POLICY "Employees can manage own sessions"
  ON public.attendance_sessions FOR ALL
  USING (employee_id = auth.uid());

CREATE POLICY "Managers can view team sessions"
  ON public.attendance_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = employee_id AND line_manager_id = auth.uid()
    )
  );

CREATE POLICY "HR and Admin can manage all sessions"
  ON public.attendance_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('hr', 'admin')
    )
  );

-- GEOFENCE ALERTS: Employees view own, HR/Admin see all
CREATE POLICY "Employees can view own geofence alerts"
  ON public.attendance_geofence_alerts FOR SELECT
  USING (employee_id = auth.uid());

CREATE POLICY "Employees can insert own geofence alerts"
  ON public.attendance_geofence_alerts FOR INSERT
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "HR and Admin can view all geofence alerts"
  ON public.attendance_geofence_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('hr', 'admin')
    )
  );

-- SYNC QUEUE: Employees manage own, HR/Admin see all
CREATE POLICY "Employees can manage own sync queue"
  ON public.attendance_sync_queue FOR ALL
  USING (employee_id = auth.uid());

CREATE POLICY "HR and Admin can view all sync queue"
  ON public.attendance_sync_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('hr', 'admin')
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Calculate distance between two GPS coordinates (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_meters(
  lat1 NUMERIC, lon1 NUMERIC, 
  lat2 NUMERIC, lon2 NUMERIC
)
RETURNS INTEGER AS $$
DECLARE
  earth_radius CONSTANT NUMERIC := 6371000; -- meters
  dlat NUMERIC;
  dlon NUMERIC;
  a NUMERIC;
  c NUMERIC;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  a := sin(dlat/2) * sin(dlat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dlon/2) * sin(dlon/2);
  
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN ROUND(earth_radius * c);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Check if coordinates are within geofence
CREATE OR REPLACE FUNCTION is_within_geofence(
  employee_lat NUMERIC, 
  employee_lon NUMERIC, 
  branch_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  branch_lat NUMERIC;
  branch_lon NUMERIC;
  geofence_radius INTEGER;
  distance INTEGER;
BEGIN
  SELECT latitude, longitude, geofence_radius
  INTO branch_lat, branch_lon, geofence_radius
  FROM public.attendance_branches
  WHERE id = branch_id_param AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  distance := calculate_distance_meters(employee_lat, employee_lon, branch_lat, branch_lon);
  
  RETURN distance <= geofence_radius;
END;
$$ LANGUAGE plpgsql STABLE;

-- Insert default attendance rule
INSERT INTO public.attendance_rules (
  rule_name,
  late_threshold_minutes,
  grace_period_minutes,
  late_charge_amount,
  absence_charge_amount,
  mandatory_break_duration_minutes,
  max_break_duration_minutes,
  work_start_time,
  work_end_time,
  is_active
) VALUES (
  'Default Company Policy',
  15,
  5,
  500.00,
  1000.00,
  30,
  60,
  '08:00:00',
  '17:00:00',
  true
) ON CONFLICT DO NOTHING;