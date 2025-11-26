-- Enable RLS on attendance_branches (if not already enabled)
ALTER TABLE attendance_branches ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read branches (needed to see office locations)
CREATE POLICY "Anyone can view active branches"
  ON attendance_branches
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Allow HR and Admin to insert branches
CREATE POLICY "HR and Admin can create branches"
  ON attendance_branches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'admin')
    )
  );

-- Allow HR and Admin to update branches
CREATE POLICY "HR and Admin can update branches"
  ON attendance_branches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'admin')
    )
  );

-- Allow HR and Admin to delete branches
CREATE POLICY "HR and Admin can delete branches"
  ON attendance_branches
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'admin')
    )
  );