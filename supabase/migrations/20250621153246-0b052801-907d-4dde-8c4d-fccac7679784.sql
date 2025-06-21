
-- Add the missing related_employee_id column to notifications table
ALTER TABLE public.notifications 
ADD COLUMN related_employee_id UUID REFERENCES public.profiles(id);

-- Add related_question_ids column for storing question IDs as an array
ALTER TABLE public.notifications 
ADD COLUMN related_question_ids UUID[];
