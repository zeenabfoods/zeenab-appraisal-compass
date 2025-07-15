
-- Add RLS policy to prevent updating submitted appraisals
CREATE POLICY "Prevent editing submitted appraisals" 
ON public.appraisals 
FOR UPDATE 
USING (
  NOT (status IN ('submitted', 'manager_review', 'committee_review', 'completed'))
  OR 
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('hr', 'admin')
  ))
);

-- Add RLS policy to prevent updating responses for submitted appraisals
CREATE POLICY "Prevent editing responses for submitted appraisals" 
ON public.appraisal_responses 
FOR UPDATE 
USING (
  NOT EXISTS (
    SELECT 1 FROM appraisals a 
    WHERE a.id = appraisal_responses.appraisal_id 
    AND a.status IN ('submitted', 'manager_review', 'committee_review', 'completed')
  )
  OR 
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('hr', 'admin')
  ))
);

-- Add RLS policy to prevent inserting new responses for submitted appraisals
CREATE POLICY "Prevent adding responses to submitted appraisals" 
ON public.appraisal_responses 
FOR INSERT 
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM appraisals a 
    WHERE a.id = appraisal_responses.appraisal_id 
    AND a.status IN ('submitted', 'manager_review', 'committee_review', 'completed')
  )
  OR 
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('hr', 'admin')
  ))
);
