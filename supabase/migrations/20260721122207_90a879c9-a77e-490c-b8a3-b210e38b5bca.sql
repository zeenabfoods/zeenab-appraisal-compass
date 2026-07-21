CREATE OR REPLACE FUNCTION public.is_hr_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role IN ('hr', 'admin', 'super_admin')
  )
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_attendance(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = _user_id AND role IN ('hr', 'admin', 'super_admin')
  )
  OR public.has_attendance_role(_user_id, 'attendance_admin')
$function$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'employee_trusted_devices'
      AND policyname = 'Super Admin can manage trusted devices'
  ) THEN
    CREATE POLICY "Super Admin can manage trusted devices"
    ON public.employee_trusted_devices
    FOR ALL
    TO authenticated
    USING (public.can_manage_attendance(auth.uid()))
    WITH CHECK (public.can_manage_attendance(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'device_violation_logs'
      AND policyname = 'Super Admin can manage device violations'
  ) THEN
    CREATE POLICY "Super Admin can manage device violations"
    ON public.device_violation_logs
    FOR ALL
    TO authenticated
    USING (public.can_manage_attendance(auth.uid()))
    WITH CHECK (public.can_manage_attendance(auth.uid()));
  END IF;
END $$;