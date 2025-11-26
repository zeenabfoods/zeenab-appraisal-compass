-- =====================================================
-- SECURITY FIX: Add search_path to attendance functions
-- This prevents potential security vulnerabilities
-- =====================================================

-- Fix update_attendance_updated_at trigger function
CREATE OR REPLACE FUNCTION update_attendance_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix calculate_distance_meters function
CREATE OR REPLACE FUNCTION calculate_distance_meters(
  lat1 NUMERIC, lon1 NUMERIC, 
  lat2 NUMERIC, lon2 NUMERIC
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
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
$$;

-- Fix is_within_geofence function
CREATE OR REPLACE FUNCTION is_within_geofence(
  employee_lat NUMERIC, 
  employee_lon NUMERIC, 
  branch_id_param UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
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
$$;