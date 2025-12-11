-- Add columns to store extracted resume data separately from applied_role
ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS candidate_current_role text,
ADD COLUMN IF NOT EXISTS years_of_experience integer,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS education text,
ADD COLUMN IF NOT EXISTS linkedin text;