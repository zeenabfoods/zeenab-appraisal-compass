-- Add manager_submission_locked column to appraisal_settings
ALTER TABLE public.appraisal_settings 
ADD COLUMN IF NOT EXISTS manager_submission_locked boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS manager_locked_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS manager_locked_at timestamp with time zone;