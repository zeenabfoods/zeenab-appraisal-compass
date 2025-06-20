
-- First, let's create a departments table since HR needs to manage departments
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Update the profiles table to have proper foreign key to departments
ALTER TABLE public.profiles 
ADD COLUMN department_id UUID REFERENCES public.departments(id);

-- Create appraisal cycles table
CREATE TABLE public.appraisal_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(quarter, year)
);

-- Create appraisal question sections (for grouping questions)
CREATE TABLE public.appraisal_question_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 5,
  weight NUMERIC NOT NULL DEFAULT 1.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update appraisal_questions to reference cycles and sections
ALTER TABLE public.appraisal_questions 
ADD COLUMN cycle_id UUID REFERENCES public.appraisal_cycles(id),
ADD COLUMN question_type TEXT NOT NULL DEFAULT 'rating' CHECK (question_type IN ('rating', 'text', 'multiple_choice')),
ADD COLUMN is_required BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN applies_to_roles TEXT[] DEFAULT '{}',
ADD COLUMN applies_to_departments UUID[] DEFAULT '{}';

-- Update appraisal_responses to include workflow stages
ALTER TABLE public.appraisal_responses 
ADD COLUMN employee_id UUID REFERENCES public.profiles(id),
ADD COLUMN manager_id UUID REFERENCES public.profiles(id),
ADD COLUMN cycle_id UUID REFERENCES public.appraisal_cycles(id),
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'employee_submitted', 'manager_reviewed', 'hr_finalized')),
ADD COLUMN employee_submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN manager_reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN hr_finalized_at TIMESTAMP WITH TIME ZONE;

-- Update appraisals table to track the full appraisal workflow
ALTER TABLE public.appraisals 
ADD COLUMN cycle_id UUID REFERENCES public.appraisal_cycles(id),
ADD COLUMN manager_id UUID REFERENCES public.profiles(id),
ADD COLUMN hr_reviewer_id UUID REFERENCES public.profiles(id),
ADD COLUMN employee_submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN manager_reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN hr_finalized_at TIMESTAMP WITH TIME ZONE;

-- Create performance analytics table for tracking trends
CREATE TABLE public.performance_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.profiles(id),
  cycle_id UUID NOT NULL REFERENCES public.appraisal_cycles(id),
  overall_score NUMERIC,
  section_scores JSONB, -- Store scores by section
  performance_band TEXT,
  trends JSONB, -- Store trend analysis
  predictions JSONB, -- Store AI predictions
  recommendations JSONB, -- Store smart recommendations
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, cycle_id)
);

-- Add RLS policies for all new tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appraisal_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appraisal_question_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_analytics ENABLE ROW LEVEL SECURITY;

-- Departments policies (HR and Admin can manage, others can view)
CREATE POLICY "HR and Admin can manage departments" 
  ON public.departments 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('hr', 'admin')
    )
  );

CREATE POLICY "All authenticated users can view departments" 
  ON public.departments 
  FOR SELECT 
  TO authenticated
  USING (is_active = true);

-- Appraisal cycles policies
CREATE POLICY "HR and Admin can manage cycles" 
  ON public.appraisal_cycles 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('hr', 'admin')
    )
  );

CREATE POLICY "All authenticated users can view active cycles" 
  ON public.appraisal_cycles 
  FOR SELECT 
  TO authenticated
  USING (status IN ('active', 'completed'));

-- Question sections policies
CREATE POLICY "HR and Admin can manage question sections" 
  ON public.appraisal_question_sections 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('hr', 'admin')
    )
  );

CREATE POLICY "All authenticated users can view active sections" 
  ON public.appraisal_question_sections 
  FOR SELECT 
  TO authenticated
  USING (is_active = true);

-- Performance analytics policies
CREATE POLICY "Users can view their own analytics" 
  ON public.performance_analytics 
  FOR SELECT 
  USING (employee_id = auth.uid());

CREATE POLICY "Managers can view their team analytics" 
  ON public.performance_analytics 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = employee_id 
      AND line_manager_id = auth.uid()
    )
  );

CREATE POLICY "HR and Admin can view all analytics" 
  ON public.performance_analytics 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('hr', 'admin')
    )
  );

-- Add some default question sections
INSERT INTO public.appraisal_question_sections (name, description, sort_order, max_score, weight) VALUES
('Job Performance', 'Assessment of core job responsibilities and deliverables', 1, 5, 0.4),
('Leadership & Teamwork', 'Collaboration, communication, and leadership skills', 2, 5, 0.3),
('Innovation & Learning', 'Continuous improvement and skill development', 3, 5, 0.2),
('Goals Achievement', 'Success in meeting set objectives and targets', 4, 5, 0.1);

-- Add some default departments
INSERT INTO public.departments (name, description) VALUES
('Engineering', 'Software development and technical teams'),
('Human Resources', 'People operations and talent management'),
('Sales', 'Revenue generation and client relationships'),
('Marketing', 'Brand promotion and market development'),
('Operations', 'Business operations and process management'),
('Finance', 'Financial planning and accounting');

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cycles_updated_at BEFORE UPDATE ON public.appraisal_cycles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_analytics_updated_at BEFORE UPDATE ON public.performance_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
