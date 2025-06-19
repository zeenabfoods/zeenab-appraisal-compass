
-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('staff', 'manager', 'hr', 'admin');

-- Create appraisal status enum  
CREATE TYPE public.appraisal_status AS ENUM ('draft', 'submitted', 'manager_review', 'hr_review', 'completed');

-- Create users/profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  department TEXT,
  position TEXT,
  line_manager_id UUID REFERENCES public.profiles(id),
  role user_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create appraisal sections table for template management
CREATE TABLE public.appraisal_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  max_marks INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create appraisal questions table
CREATE TABLE public.appraisal_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.appraisal_sections(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  weight DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create main appraisals table
CREATE TABLE public.appraisals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  quarter INTEGER CHECK (quarter >= 1 AND quarter <= 4),
  year INTEGER,
  status appraisal_status DEFAULT 'draft',
  noteworthy TEXT,
  training_needs TEXT,
  goals TEXT,
  emp_comments TEXT,
  mgr_comments TEXT,
  committee_comments TEXT,
  overall_score DECIMAL(5,2),
  performance_band TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(employee_id, quarter, year)
);

-- Create appraisal responses table
CREATE TABLE public.appraisal_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appraisal_id UUID REFERENCES public.appraisals(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.appraisal_questions(id) ON DELETE CASCADE,
  emp_rating INTEGER CHECK (emp_rating >= 1 AND emp_rating <= 5),
  emp_comment TEXT,
  mgr_rating INTEGER CHECK (mgr_rating >= 1 AND mgr_rating <= 5),
  mgr_comment TEXT,
  committee_rating INTEGER CHECK (committee_rating >= 1 AND committee_rating <= 5),
  committee_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(appraisal_id, question_id)
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  related_appraisal_id UUID REFERENCES public.appraisals(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appraisals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appraisal_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appraisal_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appraisal_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- RLS Policies for appraisals
CREATE POLICY "Users can view own appraisals" ON public.appraisals FOR SELECT TO authenticated USING (
  employee_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('hr', 'admin')) OR
  EXISTS (SELECT 1 FROM public.profiles p1 JOIN public.profiles p2 ON p1.id = auth.uid() WHERE p2.id = employee_id AND p2.line_manager_id = p1.id)
);

CREATE POLICY "Users can create own appraisals" ON public.appraisals FOR INSERT TO authenticated WITH CHECK (employee_id = auth.uid());
CREATE POLICY "Users can update own appraisals" ON public.appraisals FOR UPDATE TO authenticated USING (
  employee_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('hr', 'admin')) OR
  EXISTS (SELECT 1 FROM public.profiles p1 JOIN public.profiles p2 ON p1.id = auth.uid() WHERE p2.id = employee_id AND p2.line_manager_id = p1.id)
);

-- RLS Policies for appraisal responses
CREATE POLICY "Users can view related appraisal responses" ON public.appraisal_responses FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.appraisals a WHERE a.id = appraisal_id AND (
    a.employee_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('hr', 'admin')) OR
    EXISTS (SELECT 1 FROM public.profiles p1 JOIN public.profiles p2 ON p1.id = auth.uid() WHERE p2.id = a.employee_id AND p2.line_manager_id = p1.id)
  ))
);

CREATE POLICY "Users can manage appraisal responses" ON public.appraisal_responses FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.appraisals a WHERE a.id = appraisal_id AND (
    a.employee_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('hr', 'admin')) OR
    EXISTS (SELECT 1 FROM public.profiles p1 JOIN public.profiles p2 ON p1.id = auth.uid() WHERE p2.id = a.employee_id AND p2.line_manager_id = p1.id)
  ))
);

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- RLS Policies for sections and questions (readable by all authenticated users)
CREATE POLICY "Authenticated users can view sections" ON public.appraisal_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can view questions" ON public.appraisal_questions FOR SELECT TO authenticated USING (true);

-- Insert default appraisal sections
INSERT INTO public.appraisal_sections (name, weight, max_marks, sort_order) VALUES
('Financial Efficiency', 2.0, 50, 1),
('Operational Efficiency', 1.4, 35, 2),
('Behavioral Performance', 0.6, 15, 3);

-- Insert default questions for Financial Efficiency
INSERT INTO public.appraisal_questions (section_id, question_text, weight, sort_order) 
SELECT id, 'Cost management and budget adherence', 2.0, 1 FROM public.appraisal_sections WHERE name = 'Financial Efficiency'
UNION ALL
SELECT id, 'Revenue generation and profit optimization', 2.0, 2 FROM public.appraisal_sections WHERE name = 'Financial Efficiency'
UNION ALL
SELECT id, 'Resource allocation efficiency', 2.0, 3 FROM public.appraisal_sections WHERE name = 'Financial Efficiency'
UNION ALL
SELECT id, 'Financial reporting accuracy', 2.0, 4 FROM public.appraisal_sections WHERE name = 'Financial Efficiency'
UNION ALL
SELECT id, 'ROI on projects and initiatives', 2.0, 5 FROM public.appraisal_sections WHERE name = 'Financial Efficiency';

-- Insert default questions for Operational Efficiency
INSERT INTO public.appraisal_questions (section_id, question_text, weight, sort_order)
SELECT id, 'Process improvement and optimization', 1.4, 1 FROM public.appraisal_sections WHERE name = 'Operational Efficiency'
UNION ALL
SELECT id, 'Quality of work output', 1.4, 2 FROM public.appraisal_sections WHERE name = 'Operational Efficiency'
UNION ALL
SELECT id, 'Meeting deadlines and targets', 1.4, 3 FROM public.appraisal_sections WHERE name = 'Operational Efficiency'
UNION ALL
SELECT id, 'Innovation and problem-solving', 1.4, 4 FROM public.appraisal_sections WHERE name = 'Operational Efficiency'
UNION ALL
SELECT id, 'Technology adoption and utilization', 1.4, 5 FROM public.appraisal_sections WHERE name = 'Operational Efficiency';

-- Insert default questions for Behavioral Performance
INSERT INTO public.appraisal_questions (section_id, question_text, weight, sort_order)
SELECT id, 'Communication and collaboration', 0.6, 1 FROM public.appraisal_sections WHERE name = 'Behavioral Performance'
UNION ALL
SELECT id, 'Leadership and mentoring', 0.6, 2 FROM public.appraisal_sections WHERE name = 'Behavioral Performance'
UNION ALL
SELECT id, 'Adaptability and flexibility', 0.6, 3 FROM public.appraisal_sections WHERE name = 'Behavioral Performance'
UNION ALL
SELECT id, 'Professional development and learning', 0.6, 4 FROM public.appraisal_sections WHERE name = 'Behavioral Performance'
UNION ALL
SELECT id, 'Integrity and work ethics', 0.6, 5 FROM public.appraisal_sections WHERE name = 'Behavioral Performance';

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY definer SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'staff')
  );
  RETURN new;
END;
$$;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to calculate performance band
CREATE OR REPLACE FUNCTION public.calculate_performance_band(score DECIMAL)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  IF score >= 91 THEN
    RETURN 'Exceptional';
  ELSIF score >= 81 THEN
    RETURN 'Excellent';
  ELSIF score >= 71 THEN
    RETURN 'Very Good';
  ELSIF score >= 61 THEN
    RETURN 'Good';
  ELSIF score >= 51 THEN
    RETURN 'Fair';
  ELSE
    RETURN 'Poor';
  END IF;
END;
$$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_appraisals_updated_at
  BEFORE UPDATE ON public.appraisals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appraisal_responses_updated_at
  BEFORE UPDATE ON public.appraisal_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
