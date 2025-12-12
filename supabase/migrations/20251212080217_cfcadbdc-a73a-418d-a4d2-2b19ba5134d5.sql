-- Drop and recreate the upload policy with proper WITH CHECK clause
DROP POLICY IF EXISTS "HR and Admin can upload resumes" ON storage.objects;

CREATE POLICY "HR and Admin can upload resumes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'resumes' AND 
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('hr', 'admin')
  )
);