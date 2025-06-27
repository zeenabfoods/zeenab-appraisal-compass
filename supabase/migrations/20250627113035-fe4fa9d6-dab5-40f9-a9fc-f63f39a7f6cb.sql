
-- Add RLS policies for the profiles table to allow authenticated users to manage profiles
CREATE POLICY "Allow authenticated users to view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to update profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to insert profiles" 
ON public.profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (true);
