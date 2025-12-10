-- Create recruitment_settings table for HR to configure thresholds
CREATE TABLE IF NOT EXISTS public.recruitment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_name text NOT NULL,
  passing_threshold integer NOT NULL DEFAULT 70,
  is_active boolean NOT NULL DEFAULT true,
  required_keywords text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create candidates table
CREATE TABLE IF NOT EXISTS public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  applied_role text,
  resume_url text,
  resume_text text,
  skills text[] DEFAULT '{}',
  match_score integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'selected', 'rejected', 'hired')),
  cycle_id uuid REFERENCES public.recruitment_settings(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create candidate_evaluations table for individual board member scores
CREATE TABLE IF NOT EXISTS public.candidate_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  evaluator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  technical_proficiency integer NOT NULL DEFAULT 0 CHECK (technical_proficiency >= 0 AND technical_proficiency <= 10),
  relevant_experience integer NOT NULL DEFAULT 0 CHECK (relevant_experience >= 0 AND relevant_experience <= 10),
  cultural_fit integer NOT NULL DEFAULT 0 CHECK (cultural_fit >= 0 AND cultural_fit <= 10),
  problem_solving integer NOT NULL DEFAULT 0 CHECK (problem_solving >= 0 AND problem_solving <= 10),
  leadership integer NOT NULL DEFAULT 0 CHECK (leadership >= 0 AND leadership <= 10),
  total_score integer GENERATED ALWAYS AS (technical_proficiency + relevant_experience + cultural_fit + problem_solving + leadership) STORED,
  comments text,
  submitted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, evaluator_id)
);

-- Enable RLS on all tables
ALTER TABLE public.recruitment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS policies for recruitment_settings (HR/Admin only for now)
CREATE POLICY "HR and Admin can manage recruitment settings"
ON public.recruitment_settings FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('hr', 'admin')
));

-- RLS policies for candidates (HR/Admin only for now)
CREATE POLICY "HR and Admin can manage all candidates"
ON public.candidates FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('hr', 'admin')
));

-- RLS policies for candidate_evaluations
CREATE POLICY "Evaluators can manage their own evaluations"
ON public.candidate_evaluations FOR ALL
USING (evaluator_id = auth.uid());

CREATE POLICY "HR and Admin can view all evaluations"
ON public.candidate_evaluations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('hr', 'admin')
));

CREATE POLICY "HR and Admin can manage all evaluations"
ON public.candidate_evaluations FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('hr', 'admin')
));

-- Function to calculate aggregated score for a candidate
CREATE OR REPLACE FUNCTION public.get_candidate_aggregated_score(candidate_id_param uuid)
RETURNS TABLE (
  avg_technical numeric,
  avg_experience numeric,
  avg_cultural_fit numeric,
  avg_problem_solving numeric,
  avg_leadership numeric,
  avg_total numeric,
  evaluator_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    COALESCE(AVG(technical_proficiency), 0) as avg_technical,
    COALESCE(AVG(relevant_experience), 0) as avg_experience,
    COALESCE(AVG(cultural_fit), 0) as avg_cultural_fit,
    COALESCE(AVG(problem_solving), 0) as avg_problem_solving,
    COALESCE(AVG(leadership), 0) as avg_leadership,
    COALESCE(AVG(total_score), 0) as avg_total,
    COUNT(*)::integer as evaluator_count
  FROM public.candidate_evaluations
  WHERE candidate_id = candidate_id_param
  AND submitted_at IS NOT NULL;
$$;