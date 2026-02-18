
-- STEP 3 (final fix): Use CTE to pre-compute day_type, then join
WITH log_daytypes AS (
  SELECT 
    id,
    overtime_hours,
    employee_id,
    CASE 
      WHEN EXTRACT(DOW FROM clock_in_time AT TIME ZONE 'Africa/Lagos') = 0 THEN 'sunday'
      WHEN EXTRACT(DOW FROM clock_in_time AT TIME ZONE 'Africa/Lagos') = 6 THEN 'saturday'
      ELSE 'weekday'
    END AS day_type
  FROM attendance_logs
  WHERE overtime_approved = true
    AND overtime_hours > 0
    AND overtime_amount = 0
),
correct_amounts AS (
  SELECT 
    l.id,
    ROUND(l.overtime_hours * orr.rate_amount, 2) AS correct_amount
  FROM log_daytypes l
  JOIN profiles p ON p.id = l.employee_id
  JOIN overtime_rates orr ON 
    LOWER(orr.position_name) = LOWER(p.position)
    AND orr.day_type = l.day_type
  WHERE orr.rate_amount IS NOT NULL
)
UPDATE attendance_logs
SET overtime_amount = ca.correct_amount
FROM correct_amounts ca
WHERE attendance_logs.id = ca.id;
