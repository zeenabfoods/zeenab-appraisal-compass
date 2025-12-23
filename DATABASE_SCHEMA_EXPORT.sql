-- ============================================
-- COMPLETE DATABASE SCHEMA EXPORT
-- Project: vedgkzikqccykuozkmxl
-- Generated: 2025-12-23
-- ============================================

-- ============================================
-- STEP 1: CUSTOM TYPES (ENUMS)
-- ============================================

CREATE TYPE user_role AS ENUM ('staff', 'manager', 'hr', 'admin', 'recruiter');
CREATE TYPE appraisal_status AS ENUM ('draft', 'submitted', 'manager_review', 'committee_review', 'completed');

-- ============================================
-- STEP 2: TABLES (in dependency order)
-- ============================================

-- Departments table
CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  line_manager_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Profiles table (references departments)
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  department text,
  department_id uuid REFERENCES public.departments(id),
  position text,
  line_manager_id uuid REFERENCES public.profiles(id),
  is_active boolean DEFAULT true,
  last_login timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Add foreign key for departments.line_manager_id after profiles exists
ALTER TABLE public.departments 
  ADD CONSTRAINT departments_line_manager_id_fkey 
  FOREIGN KEY (line_manager_id) REFERENCES public.profiles(id);

-- Appraisal cycles
CREATE TABLE public.appraisal_cycles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  year integer NOT NULL,
  quarter integer NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Appraisal question sections
CREATE TABLE public.appraisal_question_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  weight numeric NOT NULL DEFAULT 1.0,
  max_score integer NOT NULL DEFAULT 5,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Appraisal sections (legacy)
CREATE TABLE public.appraisal_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  weight numeric NOT NULL,
  max_marks integer NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Appraisal questions
CREATE TABLE public.appraisal_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'rating',
  weight numeric NOT NULL DEFAULT 1.0,
  is_required boolean NOT NULL DEFAULT true,
  multiple_choice_options text[] NOT NULL DEFAULT '{}',
  section_id uuid REFERENCES public.appraisal_question_sections(id),
  cycle_id uuid REFERENCES public.appraisal_cycles(id),
  applies_to_departments uuid[] DEFAULT '{}',
  applies_to_roles text[] DEFAULT '{}',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Appraisals
CREATE TABLE public.appraisals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES public.profiles(id),
  manager_id uuid REFERENCES public.profiles(id),
  cycle_id uuid REFERENCES public.appraisal_cycles(id),
  status appraisal_status DEFAULT 'draft',
  year integer,
  quarter integer,
  overall_score numeric,
  performance_band text,
  emp_comments text,
  mgr_comments text,
  committee_comments text,
  goals text,
  training_needs text,
  noteworthy text,
  employee_submitted_at timestamp with time zone,
  manager_reviewed_at timestamp with time zone,
  manager_reviewed_by uuid REFERENCES public.profiles(id),
  committee_reviewed_at timestamp with time zone,
  committee_reviewed_by uuid REFERENCES public.profiles(id),
  hr_reviewer_id uuid REFERENCES public.profiles(id),
  hr_finalized_at timestamp with time zone,
  submitted_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Appraisal responses
CREATE TABLE public.appraisal_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appraisal_id uuid REFERENCES public.appraisals(id),
  question_id uuid REFERENCES public.appraisal_questions(id),
  employee_id uuid REFERENCES public.profiles(id),
  manager_id uuid REFERENCES public.profiles(id),
  cycle_id uuid REFERENCES public.appraisal_cycles(id),
  emp_rating integer,
  mgr_rating integer,
  committee_rating integer,
  emp_comment text,
  mgr_comment text,
  committee_comment text,
  status text NOT NULL DEFAULT 'pending',
  employee_submitted_at timestamp with time zone,
  manager_reviewed_at timestamp with time zone,
  hr_finalized_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Appraisal settings
CREATE TABLE public.appraisal_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_locked boolean NOT NULL DEFAULT false,
  locked_by uuid REFERENCES public.profiles(id),
  locked_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Employee appraisal questions (assignments)
CREATE TABLE public.employee_appraisal_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  question_id uuid NOT NULL REFERENCES public.appraisal_questions(id),
  cycle_id uuid NOT NULL REFERENCES public.appraisal_cycles(id),
  assigned_by uuid REFERENCES public.profiles(id),
  assigned_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  deleted_at timestamp with time zone
);

-- Employee questions (custom per employee)
CREATE TABLE public.employee_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'rating',
  weight numeric NOT NULL DEFAULT 1.0,
  is_required boolean NOT NULL DEFAULT true,
  section_id uuid REFERENCES public.appraisal_question_sections(id),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Line managers
CREATE TABLE public.line_managers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id uuid NOT NULL REFERENCES public.profiles(id),
  department_id uuid NOT NULL UNIQUE REFERENCES public.departments(id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  related_appraisal_id uuid REFERENCES public.appraisals(id),
  related_employee_id uuid REFERENCES public.profiles(id),
  related_question_ids uuid[],
  created_at timestamp with time zone DEFAULT now()
);

-- Performance analytics
CREATE TABLE public.performance_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  cycle_id uuid NOT NULL REFERENCES public.appraisal_cycles(id),
  overall_score numeric,
  performance_band text,
  section_scores jsonb,
  trends jsonb,
  predictions jsonb,
  recommendations jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================
-- ATTENDANCE TABLES
-- ============================================

-- Attendance branches
CREATE TABLE public.attendance_branches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  address text,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  geofence_radius integer NOT NULL DEFAULT 100,
  geofence_color text DEFAULT '#FF6B35',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Attendance rules
CREATE TABLE public.attendance_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name text NOT NULL,
  work_start_time time without time zone DEFAULT '08:00:00',
  work_end_time time without time zone DEFAULT '17:00:00',
  grace_period_minutes integer DEFAULT 5,
  late_threshold_minutes integer DEFAULT 15,
  late_charge_amount numeric DEFAULT 500.00,
  absence_charge_amount numeric DEFAULT 1000.00,
  early_closure_charge_amount numeric DEFAULT 750.00,
  overtime_rate numeric DEFAULT 1.5,
  night_shift_start_time time without time zone DEFAULT '22:00:00',
  night_shift_end_time time without time zone DEFAULT '06:00:00',
  night_shift_rate numeric DEFAULT 1.2,
  mandatory_break_duration_minutes integer DEFAULT 30,
  max_break_duration_minutes integer DEFAULT 60,
  allow_multiple_sessions_per_day boolean NOT NULL DEFAULT true,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Attendance logs
CREATE TABLE public.attendance_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  branch_id uuid REFERENCES public.attendance_branches(id),
  location_type text NOT NULL,
  clock_in_time timestamp with time zone NOT NULL DEFAULT now(),
  clock_out_time timestamp with time zone,
  clock_in_latitude numeric,
  clock_in_longitude numeric,
  clock_out_latitude numeric,
  clock_out_longitude numeric,
  within_geofence_at_clock_in boolean DEFAULT false,
  within_geofence_at_clock_out boolean DEFAULT false,
  geofence_distance_at_clock_in integer,
  is_late boolean DEFAULT false,
  late_by_minutes integer DEFAULT 0,
  total_hours numeric,
  overtime_hours numeric DEFAULT 0,
  overtime_amount numeric DEFAULT 0,
  overtime_approved boolean DEFAULT false,
  overtime_approved_at timestamp with time zone,
  overtime_prompted_at timestamp with time zone,
  overtime_start_time timestamp with time zone,
  is_night_shift boolean DEFAULT false,
  night_shift_hours numeric DEFAULT 0,
  early_closure boolean DEFAULT false,
  auto_clocked_out boolean DEFAULT false,
  field_work_location text,
  field_work_reason text,
  device_timestamp timestamp with time zone,
  sync_status text DEFAULT 'synced',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Attendance break schedules
CREATE TABLE public.attendance_break_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  break_name text NOT NULL,
  break_type text NOT NULL,
  scheduled_start_time time without time zone NOT NULL,
  scheduled_end_time time without time zone NOT NULL,
  duration_minutes integer NOT NULL,
  is_mandatory boolean NOT NULL DEFAULT false,
  notification_minutes_before integer NOT NULL DEFAULT 5,
  applies_to_departments uuid[],
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Attendance breaks
CREATE TABLE public.attendance_breaks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  attendance_log_id uuid NOT NULL REFERENCES public.attendance_logs(id),
  schedule_id uuid REFERENCES public.attendance_break_schedules(id),
  break_type text NOT NULL,
  break_start timestamp with time zone NOT NULL DEFAULT now(),
  break_end timestamp with time zone,
  break_duration_minutes integer,
  break_start_latitude numeric,
  break_start_longitude numeric,
  was_on_time boolean,
  minutes_late integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Attendance charges
CREATE TABLE public.attendance_charges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  attendance_log_id uuid REFERENCES public.attendance_logs(id),
  charge_type text NOT NULL,
  charge_amount numeric NOT NULL,
  charge_date date NOT NULL DEFAULT CURRENT_DATE,
  status text DEFAULT 'pending',
  is_escalated boolean DEFAULT false,
  escalation_multiplier numeric DEFAULT 1.0,
  waived_by uuid REFERENCES public.profiles(id),
  waiver_reason text,
  waived_at timestamp with time zone,
  dispute_reason text,
  dispute_resolution text,
  disputed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Attendance geofence alerts
CREATE TABLE public.attendance_geofence_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  branch_id uuid REFERENCES public.attendance_branches(id),
  alert_type text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  distance_from_branch integer NOT NULL,
  acknowledged boolean DEFAULT false,
  alert_time timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Attendance sessions
CREATE TABLE public.attendance_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  session_number integer NOT NULL DEFAULT 1,
  session_type text,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  total_duration_minutes integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Attendance settings
CREATE TABLE public.attendance_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  onesignal_app_id text,
  alert_sound_url text,
  alert_volume numeric DEFAULT 0.8,
  api_demo_mode boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Attendance sync queue
CREATE TABLE public.attendance_sync_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  operation_type text NOT NULL,
  payload jsonb NOT NULL,
  device_timestamp timestamp with time zone NOT NULL,
  sync_status text DEFAULT 'pending',
  sync_attempts integer DEFAULT 0,
  last_sync_attempt timestamp with time zone,
  sync_error text,
  synced_at timestamp with time zone,
  created_offline boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Overtime rates
CREATE TABLE public.overtime_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position_name text NOT NULL,
  day_type text NOT NULL,
  rate_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================
-- FIELD WORK TABLES
-- ============================================

-- Authorized routes
CREATE TABLE public.authorized_routes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_name text NOT NULL,
  description text,
  expected_path text,
  allowed_deviation_km numeric DEFAULT 2.0,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Field trips
CREATE TABLE public.field_trips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  purpose text NOT NULL,
  destination_address text,
  vehicle_used text,
  vehicle_registration text,
  funds_allocated numeric,
  start_time timestamp with time zone NOT NULL DEFAULT now(),
  expected_end_time timestamp with time zone NOT NULL,
  actual_end_time timestamp with time zone,
  start_location_lat numeric,
  start_location_lng numeric,
  end_location_lat numeric,
  end_location_lng numeric,
  total_distance_km numeric,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Location points
CREATE TABLE public.location_points (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES public.field_trips(id),
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  accuracy_meters numeric,
  speed_kmh numeric,
  battery_level numeric,
  network_type text,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Manager calendar events
CREATE TABLE public.manager_calendar_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id uuid NOT NULL REFERENCES public.profiles(id),
  title text NOT NULL,
  event_type text NOT NULL,
  event_date date NOT NULL,
  event_time time without time zone,
  department_ids uuid[],
  is_c_level boolean DEFAULT false,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Eye service department summary
CREATE TABLE public.eye_service_department_summary (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id uuid REFERENCES public.departments(id),
  department_name text NOT NULL,
  analysis_date date NOT NULL DEFAULT CURRENT_DATE,
  total_employees integer NOT NULL DEFAULT 0,
  low_risk_count integer NOT NULL DEFAULT 0,
  medium_risk_count integer NOT NULL DEFAULT 0,
  high_risk_count integer NOT NULL DEFAULT 0,
  avg_consistency_score numeric NOT NULL DEFAULT 0,
  manager_presence_rate numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- TRAINING TABLES
-- ============================================

-- Training categories
CREATE TABLE public.training_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Trainings
CREATE TABLE public.trainings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  category_id uuid REFERENCES public.training_categories(id),
  content_type text NOT NULL DEFAULT 'video',
  content_url text,
  duration_minutes integer,
  passing_score integer NOT NULL DEFAULT 70,
  max_attempts integer NOT NULL DEFAULT 3,
  is_mandatory boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  quiz_questions jsonb,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Training requests
CREATE TABLE public.training_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  training_id uuid NOT NULL REFERENCES public.trainings(id),
  requested_by uuid REFERENCES public.profiles(id),
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamp with time zone,
  rejected_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Training assignments
CREATE TABLE public.training_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  training_id uuid NOT NULL REFERENCES public.trainings(id),
  request_id uuid REFERENCES public.training_requests(id),
  assigned_by uuid NOT NULL REFERENCES public.profiles(id),
  due_date timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'assigned',
  assigned_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Quiz attempts
CREATE TABLE public.quiz_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id uuid NOT NULL REFERENCES public.training_assignments(id),
  attempt_number integer NOT NULL,
  answers jsonb,
  score_percentage numeric,
  passed boolean NOT NULL DEFAULT false,
  time_taken_minutes integer,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

-- Disciplinary panels
CREATE TABLE public.disciplinary_panels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  training_assignment_id uuid NOT NULL REFERENCES public.training_assignments(id),
  panel_members uuid[] NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  review_date timestamp with time zone,
  decision text,
  decision_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================
-- RECRUITMENT TABLES
-- ============================================

-- Recruitment settings
CREATE TABLE public.recruitment_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_name text NOT NULL,
  required_keywords text[] NOT NULL DEFAULT '{}',
  passing_threshold integer NOT NULL DEFAULT 70,
  skill_requirements jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Candidates
CREATE TABLE public.candidates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text,
  phone text,
  applied_role text,
  candidate_current_role text,
  location text,
  education text,
  years_of_experience integer,
  skills text[] DEFAULT '{}',
  resume_url text,
  resume_text text,
  linkedin text,
  match_score integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  cycle_id uuid REFERENCES public.recruitment_settings(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Candidate evaluations
CREATE TABLE public.candidate_evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id),
  evaluator_id uuid NOT NULL REFERENCES public.profiles(id),
  technical_proficiency integer NOT NULL DEFAULT 0,
  relevant_experience integer NOT NULL DEFAULT 0,
  cultural_fit integer NOT NULL DEFAULT 0,
  problem_solving integer NOT NULL DEFAULT 0,
  leadership integer NOT NULL DEFAULT 0,
  total_score integer,
  comments text,
  submitted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================
-- STEP 3: DATABASE FUNCTIONS
-- ============================================

-- Calculate distance in meters
CREATE OR REPLACE FUNCTION public.calculate_distance_meters(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE
  earth_radius CONSTANT NUMERIC := 6371000;
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
$function$;

-- Check if within geofence
CREATE OR REPLACE FUNCTION public.is_within_geofence(employee_lat numeric, employee_lon numeric, branch_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
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
$function$;

-- Calculate performance band
CREATE OR REPLACE FUNCTION public.calculate_performance_band(score numeric)
RETURNS text
LANGUAGE plpgsql
AS $function$
BEGIN
  IF score >= 91 THEN RETURN 'Exceptional';
  ELSIF score >= 81 THEN RETURN 'Excellent';
  ELSIF score >= 71 THEN RETURN 'Very Good';
  ELSIF score >= 61 THEN RETURN 'Good';
  ELSIF score >= 51 THEN RETURN 'Fair';
  ELSE RETURN 'Poor';
  END IF;
END;
$function$;

-- Check if cycle is accessible to employee
CREATE OR REPLACE FUNCTION public.is_cycle_accessible_to_employee(cycle_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  cycle_status text;
BEGIN
  SELECT status INTO cycle_status
  FROM public.appraisal_cycles 
  WHERE id = cycle_id_param;
  RETURN cycle_status = 'active';
END;
$function$;

-- Get team members
CREATE OR REPLACE FUNCTION public.get_team_members(manager_id_param uuid)
RETURNS TABLE(id uuid, first_name text, last_name text, email text, "position" text, department_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT p.id, p.first_name, p.last_name, p.email, p."position", d.name as department_name
  FROM public.profiles p
  LEFT JOIN public.departments d ON p.department_id = d.id
  WHERE p.line_manager_id = manager_id_param AND p.is_active = true;
$function$;

-- Get manager appraisals
CREATE OR REPLACE FUNCTION public.get_manager_appraisals(manager_id_param uuid)
RETURNS TABLE(appraisal_id uuid, employee_id uuid, employee_name text, cycle_name text, status appraisal_status, submitted_at timestamp with time zone, cycle_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT a.id, a.employee_id, p.first_name || ' ' || p.last_name, ac.name, a.status, a.employee_submitted_at, a.cycle_id
  FROM public.appraisals a
  JOIN public.profiles p ON a.employee_id = p.id
  JOIN public.appraisal_cycles ac ON a.cycle_id = ac.id
  WHERE p.line_manager_id = manager_id_param AND a.status IN ('submitted', 'manager_review')
  ORDER BY a.employee_submitted_at DESC;
$function$;

-- Delete employee appraisal assignment
CREATE OR REPLACE FUNCTION public.delete_employee_appraisal_assignment(assignment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.employee_appraisal_questions 
  SET deleted_at = now(), is_active = false
  WHERE id = assignment_id;
END;
$function$;

-- Complete appraisal cycle
CREATE OR REPLACE FUNCTION public.complete_appraisal_cycle(cycle_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.appraisal_cycles SET status = 'completed', updated_at = now() WHERE id = cycle_id_param;
  UPDATE public.appraisals SET status = 'completed', completed_at = now() WHERE cycle_id = cycle_id_param AND status != 'completed';
END;
$function$;

-- Delete appraisal cycle cascade
CREATE OR REPLACE FUNCTION public.delete_appraisal_cycle_cascade(cycle_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM appraisal_responses WHERE cycle_id = cycle_id_param;
  DELETE FROM employee_appraisal_questions WHERE cycle_id = cycle_id_param;
  DELETE FROM appraisal_questions WHERE cycle_id = cycle_id_param;
  DELETE FROM performance_analytics WHERE cycle_id = cycle_id_param;
  DELETE FROM appraisals WHERE cycle_id = cycle_id_param;
  DELETE FROM appraisal_cycles WHERE id = cycle_id_param;
END;
$function$;

-- Delete section with questions
CREATE OR REPLACE FUNCTION public.delete_section_with_questions(section_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM public.employee_appraisal_questions WHERE question_id IN (SELECT id FROM public.appraisal_questions WHERE section_id = section_id_param);
  DELETE FROM public.appraisal_questions WHERE section_id = section_id_param;
  DELETE FROM public.appraisal_question_sections WHERE id = section_id_param;
END;
$function$;

-- Notify line manager
CREATE OR REPLACE FUNCTION public.notify_line_manager(employee_id_param uuid, question_ids_param uuid[], assigned_by_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  line_manager_id UUID;
  employee_name TEXT;
  question_count INTEGER;
BEGIN
  SELECT p.line_manager_id, p.first_name || ' ' || p.last_name INTO line_manager_id, employee_name
  FROM public.profiles p WHERE p.id = employee_id_param;
  
  IF line_manager_id IS NOT NULL THEN
    question_count := array_length(question_ids_param, 1);
    INSERT INTO public.notifications (user_id, type, title, message, related_employee_id, related_question_ids)
    VALUES (line_manager_id, 'questions_assigned', 'Questions Assigned to Team Member',
      question_count || ' appraisal question(s) have been assigned to ' || employee_name || ' for completion.',
      employee_id_param, question_ids_param);
  END IF;
END;
$function$;

-- Notify line manager on submission
CREATE OR REPLACE FUNCTION public.notify_line_manager_submission(appraisal_id_param uuid, employee_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  line_manager_id UUID;
  employee_name TEXT;
  cycle_name TEXT;
BEGIN
  SELECT p.line_manager_id, p.first_name || ' ' || p.last_name, ac.name
  INTO line_manager_id, employee_name, cycle_name
  FROM public.profiles p
  JOIN public.appraisals a ON a.employee_id = p.id
  JOIN public.appraisal_cycles ac ON a.cycle_id = ac.id
  WHERE p.id = employee_id_param AND a.id = appraisal_id_param;
  
  IF line_manager_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, related_employee_id, related_appraisal_id)
    VALUES (line_manager_id, 'appraisal_submitted', 'Employee Appraisal Submitted',
      employee_name || ' has submitted their appraisal for ' || cycle_name || ' and it is ready for your review.',
      employee_id_param, appraisal_id_param);
  END IF;
END;
$function$;

-- Notify HR on manager review
CREATE OR REPLACE FUNCTION public.notify_hr_manager_review(appraisal_id_param uuid, manager_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  employee_name TEXT;
  manager_name TEXT;
  cycle_name TEXT;
  hr_user RECORD;
BEGIN
  SELECT emp.first_name || ' ' || emp.last_name, mgr.first_name || ' ' || mgr.last_name, ac.name
  INTO employee_name, manager_name, cycle_name
  FROM public.appraisals a
  JOIN public.profiles emp ON a.employee_id = emp.id
  JOIN public.profiles mgr ON mgr.id = manager_id_param
  JOIN public.appraisal_cycles ac ON a.cycle_id = ac.id
  WHERE a.id = appraisal_id_param;
  
  FOR hr_user IN SELECT id FROM public.profiles WHERE role = 'hr' AND is_active = true
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, related_employee_id, related_appraisal_id)
    VALUES (hr_user.id, 'manager_review_completed', 'Manager Review Completed',
      manager_name || ' has completed the appraisal review for ' || employee_name || ' (' || cycle_name || ').',
      (SELECT employee_id FROM public.appraisals WHERE id = appraisal_id_param), appraisal_id_param);
  END LOOP;
END;
$function$;

-- Get candidate aggregated score
CREATE OR REPLACE FUNCTION public.get_candidate_aggregated_score(candidate_id_param uuid)
RETURNS TABLE(avg_technical numeric, avg_experience numeric, avg_cultural_fit numeric, avg_problem_solving numeric, avg_leadership numeric, avg_total numeric, evaluator_count integer)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT 
    COALESCE(AVG(technical_proficiency), 0),
    COALESCE(AVG(relevant_experience), 0),
    COALESCE(AVG(cultural_fit), 0),
    COALESCE(AVG(problem_solving), 0),
    COALESCE(AVG(leadership), 0),
    COALESCE(AVG(total_score), 0),
    COUNT(*)::integer
  FROM public.candidate_evaluations
  WHERE candidate_id = candidate_id_param AND submitted_at IS NOT NULL;
$function$;

-- Handle new user (auth trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'staff')
  );
  RETURN new;
END;
$function$;

-- Update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Update attendance updated_at
CREATE OR REPLACE FUNCTION public.update_attendance_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Notify training assignment
CREATE OR REPLACE FUNCTION public.notify_training_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  employee_name TEXT;
  training_title TEXT;
  assigner_name TEXT;
BEGIN
  SELECT p.first_name || ' ' || p.last_name, t.title, a.first_name || ' ' || a.last_name
  INTO employee_name, training_title, assigner_name
  FROM profiles p, trainings t, profiles a
  WHERE p.id = NEW.employee_id AND t.id = NEW.training_id AND a.id = NEW.assigned_by;
  
  INSERT INTO notifications (user_id, type, title, message, related_employee_id)
  VALUES (NEW.employee_id, 'training_assigned', 'New Training Assigned',
    'You have been assigned the training "' || training_title || '" by ' || assigner_name || '. Due date: ' || NEW.due_date::DATE,
    NEW.employee_id);
  RETURN NEW;
END;
$function$;

-- Check quiz failures and create panel
CREATE OR REPLACE FUNCTION public.check_quiz_failures_and_create_panel()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  failure_count INTEGER;
  employee_profile profiles%ROWTYPE;
BEGIN
  SELECT COUNT(*) INTO failure_count FROM quiz_attempts WHERE assignment_id = NEW.assignment_id AND passed = false;
  
  IF failure_count >= 3 AND NOT NEW.passed THEN
    SELECT p.* INTO employee_profile FROM profiles p
    JOIN training_assignments ta ON p.id = ta.employee_id WHERE ta.id = NEW.assignment_id;
    
    UPDATE training_assignments SET status = 'disciplinary' WHERE id = NEW.assignment_id;
    
    INSERT INTO disciplinary_panels (employee_id, training_assignment_id, panel_members)
    SELECT employee_profile.id, NEW.assignment_id,
      ARRAY(SELECT id FROM profiles WHERE role IN ('hr', 'manager') AND is_active = true LIMIT 3);
    
    INSERT INTO notifications (user_id, type, title, message, related_employee_id)
    SELECT p.id, 'disciplinary_panel_required', 'Disciplinary Panel Required',
      employee_profile.first_name || ' ' || employee_profile.last_name || ' has failed training 3 times. Panel review required.',
      employee_profile.id
    FROM profiles p WHERE p.role IN ('hr', 'manager') AND p.is_active = true;
  END IF;
  RETURN NEW;
END;
$function$;

-- ============================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appraisal_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appraisal_question_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appraisal_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appraisals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appraisal_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appraisal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_appraisal_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_break_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_geofence_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authorized_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinary_panels ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: RLS POLICIES (Key ones)
-- ============================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "HR and Admin can manage all profiles" ON public.profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'admin'))
);

-- Departments policies
CREATE POLICY "All authenticated users can view departments" ON public.departments FOR SELECT USING (is_active = true);
CREATE POLICY "HR and Admin can manage departments" ON public.departments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'admin'))
);

-- Appraisal cycles policies
CREATE POLICY "All authenticated users can view active cycles" ON public.appraisal_cycles FOR SELECT USING (status IN ('active', 'completed'));
CREATE POLICY "HR and Admin can manage cycles" ON public.appraisal_cycles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'admin'))
);

-- Appraisals policies
CREATE POLICY "Users can view own appraisals" ON public.appraisals FOR SELECT USING (
  employee_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'admin')) OR
  EXISTS (SELECT 1 FROM profiles p1 JOIN profiles p2 ON p1.id = auth.uid() WHERE p2.id = appraisals.employee_id AND p2.line_manager_id = p1.id)
);
CREATE POLICY "Users can update own appraisals" ON public.appraisals FOR UPDATE USING (
  employee_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'admin')) OR
  EXISTS (SELECT 1 FROM profiles p1 JOIN profiles p2 ON p1.id = auth.uid() WHERE p2.id = appraisals.employee_id AND p2.line_manager_id = p1.id)
);
CREATE POLICY "HR and Admin can manage appraisals" ON public.appraisals FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'admin'))
);

-- Attendance logs policies
CREATE POLICY "Employees can view own attendance logs" ON public.attendance_logs FOR SELECT USING (employee_id = auth.uid());
CREATE POLICY "Employees can insert own attendance logs" ON public.attendance_logs FOR INSERT WITH CHECK (employee_id = auth.uid());
CREATE POLICY "Employees can update own attendance logs" ON public.attendance_logs FOR UPDATE USING (employee_id = auth.uid());
CREATE POLICY "HR and Admin can manage all attendance logs" ON public.attendance_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'admin'))
);
CREATE POLICY "Managers can view team attendance logs" ON public.attendance_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = attendance_logs.employee_id AND line_manager_id = auth.uid())
);

-- Attendance branches policies
CREATE POLICY "All users can view active branches" ON public.attendance_branches FOR SELECT USING (is_active = true);
CREATE POLICY "HR and Admin can manage branches" ON public.attendance_branches FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'admin'))
);

-- Candidates policies
CREATE POLICY "HR and Admin can manage all candidates" ON public.candidates FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'admin'))
);
CREATE POLICY "Recruiters can view candidates" ON public.candidates FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'recruiter')
);

-- ============================================
-- STEP 6: STORAGE BUCKETS
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('alert-sounds', 'alert-sounds', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('field-evidence', 'field-evidence', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', true);

-- ============================================
-- STEP 7: AUTH TRIGGER (run in Supabase dashboard)
-- ============================================

-- Note: Run this in the new Supabase project to auto-create profiles
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- DONE! Your schema is ready.
-- ============================================
