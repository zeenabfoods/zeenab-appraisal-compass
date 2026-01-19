-- Fix the RLS policy for attendance_user_roles to allow HR/Admin to view all
-- First drop and recreate policies with proper permissions

DROP POLICY IF EXISTS "HR and Admin can view attendance roles" ON public.attendance_user_roles;
DROP POLICY IF EXISTS "HR and Admin can assign roles" ON public.attendance_user_roles;
DROP POLICY IF EXISTS "HR and Admin can update roles" ON public.attendance_user_roles;
DROP POLICY IF EXISTS "HR and Admin can delete roles" ON public.attendance_user_roles;

-- Create helper function to check if user is HR or Admin (profile role based)
CREATE OR REPLACE FUNCTION public.is_hr_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role IN ('hr', 'admin')
  )
$$;

-- Policies for attendance_user_roles
-- HR/Admin can view all roles
CREATE POLICY "HR and Admin can view all attendance roles"
ON public.attendance_user_roles
FOR SELECT
TO authenticated
USING (public.is_hr_or_admin(auth.uid()));

-- Users can view their own role assignment
CREATE POLICY "Users can view own attendance role"
ON public.attendance_user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- HR/Admin can insert new roles
CREATE POLICY "HR and Admin can assign attendance roles"
ON public.attendance_user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_hr_or_admin(auth.uid()));

-- HR/Admin can update roles
CREATE POLICY "HR and Admin can update attendance roles"
ON public.attendance_user_roles
FOR UPDATE
TO authenticated
USING (public.is_hr_or_admin(auth.uid()))
WITH CHECK (public.is_hr_or_admin(auth.uid()));

-- HR/Admin can delete roles
CREATE POLICY "HR and Admin can delete attendance roles"
ON public.attendance_user_roles
FOR DELETE
TO authenticated
USING (public.is_hr_or_admin(auth.uid()));

-- Fix the attendance_audit_logs policies as well
DROP POLICY IF EXISTS "Attendance admins can view audit logs" ON public.attendance_audit_logs;
DROP POLICY IF EXISTS "Attendance admins can insert audit logs" ON public.attendance_audit_logs;

-- HR/Admin and attendance_admin can view audit logs
CREATE POLICY "Authorized users can view audit logs"
ON public.attendance_audit_logs
FOR SELECT
TO authenticated
USING (
  public.is_hr_or_admin(auth.uid()) OR public.has_attendance_role(auth.uid(), 'attendance_admin')
);

-- HR/Admin and attendance_admin can insert audit logs
CREATE POLICY "Authorized users can insert audit logs"
ON public.attendance_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_hr_or_admin(auth.uid()) OR public.has_attendance_role(auth.uid(), 'attendance_admin')
);