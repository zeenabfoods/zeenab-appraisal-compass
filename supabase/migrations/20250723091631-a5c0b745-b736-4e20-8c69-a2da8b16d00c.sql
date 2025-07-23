
-- Add the missing multiple_choice_options column to appraisal_questions table
ALTER TABLE public.appraisal_questions 
ADD COLUMN multiple_choice_options text[] DEFAULT '{}';

-- Update the column to be not null with a default empty array
ALTER TABLE public.appraisal_questions 
ALTER COLUMN multiple_choice_options SET NOT NULL;
