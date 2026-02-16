
-- Add new configurable fields to attendance_rules
ALTER TABLE public.attendance_rules
  ADD COLUMN IF NOT EXISTS auto_clockout_deadline text DEFAULT '19:00',
  ADD COLUMN IF NOT EXISTS consecutive_auto_clockout_charge numeric DEFAULT 0;
