-- Add early closure tracking fields to attendance_logs
ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS early_closure boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_clocked_out boolean DEFAULT false;

-- Add early closure charge amount to attendance_rules
ALTER TABLE attendance_rules
ADD COLUMN IF NOT EXISTS early_closure_charge_amount numeric DEFAULT 750.00;

-- Create index for efficient querying of active sessions
CREATE INDEX IF NOT EXISTS idx_attendance_logs_active_sessions 
ON attendance_logs(employee_id, clock_out_time) 
WHERE clock_out_time IS NULL;