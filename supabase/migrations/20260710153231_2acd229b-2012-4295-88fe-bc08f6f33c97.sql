
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'attendance_role' AND e.enumlabel = 'security'
  ) THEN
    ALTER TYPE public.attendance_role ADD VALUE 'security';
  END IF;
END $$;
