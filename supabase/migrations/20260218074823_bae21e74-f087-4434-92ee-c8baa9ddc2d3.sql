
-- Final cleanup: Zero out ALL remaining records that have overtime_hours > 0 
-- but no overtime_start_time (these are definitively invalid - overtime requires a start time)
UPDATE attendance_logs
SET 
  overtime_hours = 0,
  overtime_amount = 0
WHERE 
  overtime_start_time IS NULL 
  AND (overtime_hours > 0 OR overtime_amount > 0);
