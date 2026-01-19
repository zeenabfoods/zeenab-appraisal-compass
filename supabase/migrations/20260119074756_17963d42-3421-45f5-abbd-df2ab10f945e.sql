-- Create attendance-specific role enum
CREATE TYPE public.attendance_role AS ENUM ('attendance_admin');

-- Create attendance user roles table (separate from profile roles for security)
CREATE TABLE public.attendance_user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role attendance_role NOT NULL,
    assigned_by UUID REFERENCES public.profiles(id),
    assigned_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.attendance_user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check attendance roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_attendance_role(_user_id UUID, _role attendance_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.attendance_user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = true
  )
$$;

-- Function to check if user can manage attendance (HR, admin, or attendance_admin)
CREATE OR REPLACE FUNCTION public.can_manage_attendance(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = _user_id AND role IN ('hr', 'admin')
  )
  OR public.has_attendance_role(_user_id, 'attendance_admin')
$$;

-- Create attendance audit logs table
CREATE TABLE public.attendance_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL,
    action_category TEXT NOT NULL,
    performed_by UUID REFERENCES public.profiles(id) NOT NULL,
    target_employee_id UUID REFERENCES public.profiles(id),
    target_record_id UUID,
    target_table TEXT,
    old_values JSONB,
    new_values JSONB,
    reason TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.attendance_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_audit_logs_performed_by ON public.attendance_audit_logs(performed_by);
CREATE INDEX idx_audit_logs_target_employee ON public.attendance_audit_logs(target_employee_id);
CREATE INDEX idx_audit_logs_created_at ON public.attendance_audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action_type ON public.attendance_audit_logs(action_type);

-- RLS Policies for attendance_user_roles
CREATE POLICY "HR and admin can view all attendance roles"
ON public.attendance_user_roles FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('hr', 'admin'))
);

CREATE POLICY "Only HR and admin can assign attendance roles"
ON public.attendance_user_roles FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('hr', 'admin'))
);

CREATE POLICY "Only HR and admin can update attendance roles"
ON public.attendance_user_roles FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('hr', 'admin'))
);

-- RLS Policies for attendance_audit_logs
CREATE POLICY "Attendance managers can view audit logs"
ON public.attendance_audit_logs FOR SELECT
TO authenticated
USING (public.can_manage_attendance(auth.uid()));

CREATE POLICY "Attendance managers can insert audit logs"
ON public.attendance_audit_logs FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_attendance(auth.uid()));