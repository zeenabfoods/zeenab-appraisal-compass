
-- Fix Ebenezer's incorrectly calculated overtime on the Feb 17 night shift session
-- overtime_hours was 9.21 despite no overtime_approved and no overtime_start_time
UPDATE attendance_logs
SET 
  overtime_hours = 0,
  overtime_amount = 0
WHERE id = '603d59c4-0044-42b3-8991-59cf87bfdbcb'
  AND overtime_approved = false
  AND overtime_start_time IS NULL;
