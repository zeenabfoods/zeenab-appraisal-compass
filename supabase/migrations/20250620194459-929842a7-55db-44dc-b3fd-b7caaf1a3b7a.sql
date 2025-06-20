
-- Add line_manager_id column to departments table to track which line manager is assigned to each department
ALTER TABLE public.departments 
ADD COLUMN line_manager_id UUID REFERENCES public.profiles(id);

-- Update the RLS policy to allow viewing line manager information
CREATE POLICY "All authenticated users can view profiles for line manager selection" 
  ON public.profiles 
  FOR SELECT 
  TO authenticated
  USING (true);
