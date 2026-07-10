
-- gate_pass_status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gate_pass_status') THEN
    CREATE TYPE public.gate_pass_status AS ENUM (
      'pending_manager', 'pending_hr', 'approved', 'rejected',
      'exited', 'returned', 'overdue', 'cancelled'
    );
  END IF;
END $$;

-- gate_pass_security_assignments (created first — referenced by requests policy)
CREATE TABLE IF NOT EXISTS public.gate_pass_security_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.attendance_branches(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, branch_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gate_pass_security_assignments TO authenticated;
GRANT ALL ON public.gate_pass_security_assignments TO service_role;

ALTER TABLE public.gate_pass_security_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own assignments or HR view all"
ON public.gate_pass_security_assignments FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_hr_or_admin(auth.uid()));

CREATE POLICY "HR manages security assignments"
ON public.gate_pass_security_assignments FOR ALL TO authenticated
USING (public.is_hr_or_admin(auth.uid()))
WITH CHECK (public.is_hr_or_admin(auth.uid()));

CREATE TRIGGER trg_gpsa_updated_at
BEFORE UPDATE ON public.gate_pass_security_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_attendance_updated_at();

-- gate_pass_requests
CREATE TABLE IF NOT EXISTS public.gate_pass_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.attendance_branches(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  destination TEXT,
  expected_out_at TIMESTAMPTZ NOT NULL,
  expected_return_at TIMESTAMPTZ NOT NULL,
  status public.gate_pass_status NOT NULL DEFAULT 'pending_manager',
  manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  manager_decision_at TIMESTAMPTZ,
  manager_notes TEXT,
  hr_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  hr_decision_at TIMESTAMPTZ,
  hr_notes TEXT,
  pass_code TEXT UNIQUE,
  pass_code_used_at TIMESTAMPTZ,
  actual_exit_at TIMESTAMPTZ,
  actual_return_at TIMESTAMPTZ,
  exit_recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  return_recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  overdue_charge_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gate_pass_requests TO authenticated;
GRANT ALL ON public.gate_pass_requests TO service_role;

ALTER TABLE public.gate_pass_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gate pass view access"
ON public.gate_pass_requests FOR SELECT TO authenticated
USING (
  employee_id = auth.uid()
  OR manager_id = auth.uid()
  OR public.is_hr_or_admin(auth.uid())
  OR public.has_attendance_role(auth.uid(), 'attendance_admin')
  OR (
    public.has_attendance_role(auth.uid(), 'security')
    AND status IN ('approved','exited','returned','overdue')
    AND EXISTS (
      SELECT 1 FROM public.gate_pass_security_assignments a
      WHERE a.user_id = auth.uid()
        AND a.branch_id = gate_pass_requests.branch_id
        AND a.is_active = true
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = gate_pass_requests.employee_id
      AND p.line_manager_id = auth.uid()
  )
);

CREATE POLICY "Employees create own requests"
ON public.gate_pass_requests FOR INSERT TO authenticated
WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Approvers and security can update"
ON public.gate_pass_requests FOR UPDATE TO authenticated
USING (
  employee_id = auth.uid()
  OR manager_id = auth.uid()
  OR public.is_hr_or_admin(auth.uid())
  OR public.has_attendance_role(auth.uid(), 'security')
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = gate_pass_requests.employee_id
      AND p.line_manager_id = auth.uid()
  )
);

CREATE POLICY "HR can delete requests"
ON public.gate_pass_requests FOR DELETE TO authenticated
USING (public.is_hr_or_admin(auth.uid()));

CREATE INDEX idx_gate_pass_employee ON public.gate_pass_requests(employee_id);
CREATE INDEX idx_gate_pass_status ON public.gate_pass_requests(status);
CREATE INDEX idx_gate_pass_branch ON public.gate_pass_requests(branch_id);
CREATE INDEX idx_gate_pass_code ON public.gate_pass_requests(pass_code) WHERE pass_code IS NOT NULL;

CREATE TRIGGER trg_gate_pass_updated_at
BEFORE UPDATE ON public.gate_pass_requests
FOR EACH ROW EXECUTE FUNCTION public.update_attendance_updated_at();

-- gate_pass_settings
CREATE TABLE IF NOT EXISTS public.gate_pass_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  require_manager_approval BOOLEAN NOT NULL DEFAULT true,
  overdue_grace_minutes INT NOT NULL DEFAULT 30,
  charge_on_overdue BOOLEAN NOT NULL DEFAULT true,
  overdue_charge_amount NUMERIC NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gate_pass_settings TO authenticated;
GRANT ALL ON public.gate_pass_settings TO service_role;

ALTER TABLE public.gate_pass_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can read settings"
ON public.gate_pass_settings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "HR can manage settings"
ON public.gate_pass_settings FOR ALL TO authenticated
USING (public.is_hr_or_admin(auth.uid()))
WITH CHECK (public.is_hr_or_admin(auth.uid()));

CREATE TRIGGER trg_gate_pass_settings_updated_at
BEFORE UPDATE ON public.gate_pass_settings
FOR EACH ROW EXECUTE FUNCTION public.update_attendance_updated_at();

INSERT INTO public.gate_pass_settings (require_manager_approval, overdue_grace_minutes, charge_on_overdue)
VALUES (true, 30, true);
