-- Field Trips Table
CREATE TABLE IF NOT EXISTS public.field_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expected_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_end_time TIMESTAMP WITH TIME ZONE,
  vehicle_used TEXT,
  vehicle_registration TEXT,
  funds_allocated NUMERIC(10, 2),
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, abandoned
  start_location_lat NUMERIC,
  start_location_lng NUMERIC,
  end_location_lat NUMERIC,
  end_location_lng NUMERIC,
  total_distance_km NUMERIC(10, 2),
  destination_address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Location Points Table (for tracking route)
CREATE TABLE IF NOT EXISTS public.location_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.field_trips(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  battery_level INTEGER, -- 0-100
  network_type TEXT, -- wifi, 4g, 3g, etc
  speed_kmh NUMERIC(5, 2),
  accuracy_meters INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trip Evidence Table
CREATE TABLE IF NOT EXISTS public.trip_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.field_trips(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL, -- photo, signature, receipt, document
  file_url TEXT,
  description TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC,
  location_verified BOOLEAN DEFAULT false,
  receipt_amount NUMERIC(10, 2),
  vendor_name TEXT,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Authorized Routes Table
CREATE TABLE IF NOT EXISTS public.authorized_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_name TEXT NOT NULL,
  description TEXT,
  expected_path TEXT, -- JSON string of waypoints
  allowed_deviation_km NUMERIC(5, 2) DEFAULT 2.0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trip Alerts Table
CREATE TABLE IF NOT EXISTS public.trip_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.field_trips(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- route_deviation, extended_stop, speed_violation, time_exceeded
  severity TEXT NOT NULL, -- low, medium, high
  message TEXT NOT NULL,
  location_lat NUMERIC,
  location_lng NUMERIC,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES public.profiles(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_field_trips_employee ON public.field_trips(employee_id);
CREATE INDEX IF NOT EXISTS idx_field_trips_status ON public.field_trips(status);
CREATE INDEX IF NOT EXISTS idx_field_trips_start_time ON public.field_trips(start_time);
CREATE INDEX IF NOT EXISTS idx_location_points_trip ON public.location_points(trip_id);
CREATE INDEX IF NOT EXISTS idx_location_points_timestamp ON public.location_points(timestamp);
CREATE INDEX IF NOT EXISTS idx_trip_evidence_trip ON public.trip_evidence(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_alerts_trip ON public.trip_alerts(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_alerts_acknowledged ON public.trip_alerts(acknowledged);

-- Enable Row Level Security
ALTER TABLE public.field_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authorized_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for field_trips
CREATE POLICY "Employees can manage own field trips"
  ON public.field_trips
  FOR ALL
  USING (employee_id = auth.uid());

CREATE POLICY "HR and Admin can manage all field trips"
  ON public.field_trips
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('hr', 'admin')
    )
  );

CREATE POLICY "Managers can view team field trips"
  ON public.field_trips
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = field_trips.employee_id AND line_manager_id = auth.uid()
    )
  );

-- RLS Policies for location_points
CREATE POLICY "Employees can manage own location points"
  ON public.location_points
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.field_trips
      WHERE field_trips.id = location_points.trip_id AND field_trips.employee_id = auth.uid()
    )
  );

CREATE POLICY "HR and Admin can view all location points"
  ON public.location_points
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('hr', 'admin')
    )
  );

CREATE POLICY "Managers can view team location points"
  ON public.location_points
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.field_trips ft
      JOIN public.profiles p ON ft.employee_id = p.id
      WHERE ft.id = location_points.trip_id AND p.line_manager_id = auth.uid()
    )
  );

-- RLS Policies for trip_evidence
CREATE POLICY "Employees can manage own trip evidence"
  ON public.trip_evidence
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.field_trips
      WHERE field_trips.id = trip_evidence.trip_id AND field_trips.employee_id = auth.uid()
    )
  );

CREATE POLICY "HR and Admin can view all trip evidence"
  ON public.trip_evidence
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('hr', 'admin')
    )
  );

CREATE POLICY "Managers can view team trip evidence"
  ON public.trip_evidence
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.field_trips ft
      JOIN public.profiles p ON ft.employee_id = p.id
      WHERE ft.id = trip_evidence.trip_id AND p.line_manager_id = auth.uid()
    )
  );

-- RLS Policies for authorized_routes
CREATE POLICY "All authenticated users can view active routes"
  ON public.authorized_routes
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "HR and Admin can manage authorized routes"
  ON public.authorized_routes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('hr', 'admin')
    )
  );

-- RLS Policies for trip_alerts
CREATE POLICY "Employees can view own trip alerts"
  ON public.trip_alerts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.field_trips
      WHERE field_trips.id = trip_alerts.trip_id AND field_trips.employee_id = auth.uid()
    )
  );

CREATE POLICY "HR and Admin can manage all trip alerts"
  ON public.trip_alerts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('hr', 'admin')
    )
  );

CREATE POLICY "Managers can view and acknowledge team trip alerts"
  ON public.trip_alerts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.field_trips ft
      JOIN public.profiles p ON ft.employee_id = p.id
      WHERE ft.id = trip_alerts.trip_id AND p.line_manager_id = auth.uid()
    )
  );

-- Create storage bucket for field trip evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('field-evidence', 'field-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for field evidence
CREATE POLICY "Users can upload evidence for own trips"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'field-evidence' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view evidence for own trips"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'field-evidence' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "HR and Admin can view all field evidence"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'field-evidence' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('hr', 'admin')
    )
  );

-- Trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_field_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_field_trips_updated_at
  BEFORE UPDATE ON public.field_trips
  FOR EACH ROW
  EXECUTE FUNCTION update_field_tracking_updated_at();

CREATE TRIGGER update_authorized_routes_updated_at
  BEFORE UPDATE ON public.authorized_routes
  FOR EACH ROW
  EXECUTE FUNCTION update_field_tracking_updated_at();