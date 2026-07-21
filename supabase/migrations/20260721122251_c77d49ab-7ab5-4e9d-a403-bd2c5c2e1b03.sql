GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_logs TO authenticated;
GRANT ALL ON public.attendance_logs TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_audit_logs TO authenticated;
GRANT ALL ON public.attendance_audit_logs TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_trusted_devices TO authenticated;
GRANT ALL ON public.employee_trusted_devices TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_violation_logs TO authenticated;
GRANT ALL ON public.device_violation_logs TO service_role;