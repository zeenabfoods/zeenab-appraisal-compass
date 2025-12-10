-- Add recruiter-specific policies
CREATE POLICY "Recruiters can view active recruitment settings"
ON public.recruitment_settings FOR SELECT
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('hr', 'admin', 'recruiter')
  )
);

CREATE POLICY "Recruiters can view candidates"
ON public.candidates FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role = 'recruiter'
));

-- Add triggers for updated_at
CREATE TRIGGER update_recruitment_settings_updated_at
  BEFORE UPDATE ON public.recruitment_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_candidate_evaluations_updated_at
  BEFORE UPDATE ON public.candidate_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();