
-- Trusted devices table
CREATE TABLE public.employee_trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_fingerprint_hash TEXT NOT NULL,
  device_label TEXT,
  registered_ip TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_ip TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  reset_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.employee_trusted_devices TO authenticated;
GRANT ALL ON public.employee_trusted_devices TO service_role;

ALTER TABLE public.employee_trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own trusted device"
  ON public.employee_trusted_devices FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_hr_or_admin(auth.uid()));

CREATE POLICY "HR manages trusted devices"
  ON public.employee_trusted_devices FOR ALL
  TO authenticated
  USING (public.is_hr_or_admin(auth.uid()))
  WITH CHECK (public.is_hr_or_admin(auth.uid()));

CREATE TRIGGER trg_trusted_devices_updated_at
  BEFORE UPDATE ON public.employee_trusted_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Violation logs
CREATE TABLE public.device_violation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempted_fingerprint_hash TEXT NOT NULL,
  attempted_ip TEXT,
  user_agent TEXT,
  action_blocked TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.device_violation_logs TO authenticated;
GRANT ALL ON public.device_violation_logs TO service_role;

ALTER TABLE public.device_violation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own violations"
  ON public.device_violation_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_hr_or_admin(auth.uid()));

CREATE POLICY "HR manages violations"
  ON public.device_violation_logs FOR ALL
  TO authenticated
  USING (public.is_hr_or_admin(auth.uid()))
  WITH CHECK (public.is_hr_or_admin(auth.uid()));

CREATE INDEX idx_device_violations_user ON public.device_violation_logs(user_id, attempted_at DESC);
