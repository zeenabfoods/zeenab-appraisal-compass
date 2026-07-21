
DROP POLICY IF EXISTS "HR and Admin can manage all attendance logs" ON public.attendance_logs;
CREATE POLICY "HR Admin and SuperAdmin can manage all attendance logs"
  ON public.attendance_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['hr'::user_role, 'admin'::user_role, 'super_admin'::user_role])));

-- Extend similar HR/Admin policies on related admin tables
DO $$
DECLARE
  r record;
  new_qual text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, qual::text AS qual_text, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND qual::text LIKE '%''hr''::user_role%'
      AND qual::text LIKE '%''admin''::user_role%'
      AND qual::text NOT LIKE '%super_admin%'
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    new_qual := replace(r.qual_text, 'ARRAY[''hr''::user_role, ''admin''::user_role]', 'ARRAY[''hr''::user_role, ''admin''::user_role, ''super_admin''::user_role]');
    EXECUTE format('CREATE POLICY %I ON %I.%I FOR %s USING (%s)', r.policyname, r.schemaname, r.tablename, r.cmd, new_qual);
  END LOOP;
END $$;
