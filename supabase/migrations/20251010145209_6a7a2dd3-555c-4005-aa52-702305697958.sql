-- Add ON DELETE CASCADE to notifications foreign keys to allow user deletion

-- Drop existing foreign key constraints
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_related_employee_id_fkey;

ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_related_appraisal_id_fkey;

-- Recreate the constraints with ON DELETE CASCADE
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_related_employee_id_fkey 
FOREIGN KEY (related_employee_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_related_appraisal_id_fkey 
FOREIGN KEY (related_appraisal_id) 
REFERENCES public.appraisals(id) 
ON DELETE CASCADE;