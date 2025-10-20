-- Create appraisal settings table for global submission control
CREATE TABLE public.appraisal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_locked BOOLEAN NOT NULL DEFAULT false,
  locked_by UUID REFERENCES public.profiles(id),
  locked_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appraisal_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view settings (to check lock status)
CREATE POLICY "All authenticated users can view appraisal settings"
ON public.appraisal_settings
FOR SELECT
TO authenticated
USING (true);

-- Only HR and Admin can manage settings
CREATE POLICY "HR and Admin can manage appraisal settings"
ON public.appraisal_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('hr', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('hr', 'admin')
  )
);

-- Insert default settings row
INSERT INTO public.appraisal_settings (submission_locked) 
VALUES (false);

-- Add trigger for updated_at
CREATE TRIGGER update_appraisal_settings_updated_at
BEFORE UPDATE ON public.appraisal_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.appraisal_settings IS 'Global settings for appraisal system, including submission lock control';