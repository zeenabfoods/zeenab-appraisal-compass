
-- Zero out overtime_amount stored in DB for non-factory positions
-- Only Operator and Helper have configured overtime rates
UPDATE attendance_logs al
SET overtime_amount = 0
FROM profiles p
WHERE al.employee_id = p.id
  AND al.overtime_amount > 0
  AND p.position NOT IN (
    SELECT DISTINCT position_name FROM overtime_rates
  );
