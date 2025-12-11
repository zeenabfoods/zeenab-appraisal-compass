-- Create storage bucket for resumes
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', true);

-- Create policies for resume uploads
CREATE POLICY "HR and Admin can upload resumes"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'resumes' AND EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid() AND profiles.role IN ('hr', 'admin')
));

CREATE POLICY "Anyone authenticated can view resumes"
ON storage.objects
FOR SELECT
USING (bucket_id = 'resumes' AND auth.role() = 'authenticated');

CREATE POLICY "HR and Admin can delete resumes"
ON storage.objects
FOR DELETE
USING (bucket_id = 'resumes' AND EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid() AND profiles.role IN ('hr', 'admin')
));