
-- Create training module tables with complete isolation from appraisal system

-- Training content master table
CREATE TABLE public.trainings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'audio', 'document')),
  content_url TEXT, -- YouTube URL for video/audio
  file_path TEXT, -- Supabase storage path for documents
  duration_minutes INTEGER, -- Expected completion time
  pass_mark INTEGER NOT NULL DEFAULT 70, -- Percentage required to pass
  max_attempts INTEGER NOT NULL DEFAULT 3,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Training categories for organization
CREATE TABLE public.training_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Link trainings to categories
ALTER TABLE public.trainings ADD COLUMN category_id UUID REFERENCES training_categories(id);

-- Committee training requests (when committee wants HR to assign training)
CREATE TABLE public.training_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES profiles(id) NOT NULL,
  requested_by UUID REFERENCES profiles(id) NOT NULL,
  category_id UUID REFERENCES training_categories(id),
  recommended_training_type TEXT,
  justification TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'assigned', 'rejected')),
  processed_by UUID REFERENCES profiles(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Individual training assignments
CREATE TABLE public.training_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES profiles(id) NOT NULL,
  training_id UUID REFERENCES trainings(id) NOT NULL,
  assigned_by UUID REFERENCES profiles(id) NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'failed', 'disciplinary')),
  request_id UUID REFERENCES training_requests(id), -- Link to original request if applicable
  UNIQUE(employee_id, training_id) -- Prevent duplicate assignments
);

-- Track employee progress through training content
CREATE TABLE public.training_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID REFERENCES training_assignments(id) NOT NULL,
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  time_spent_minutes INTEGER NOT NULL DEFAULT 0,
  last_position TEXT, -- For resuming video/audio
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quiz questions for trainings
CREATE TABLE public.training_quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id UUID REFERENCES trainings(id) NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  options JSONB, -- Store multiple choice options
  correct_answer TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Employee quiz attempts and scores
CREATE TABLE public.quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID REFERENCES training_assignments(id) NOT NULL,
  attempt_number INTEGER NOT NULL,
  score_percentage INTEGER,
  passed BOOLEAN NOT NULL DEFAULT false,
  answers JSONB, -- Store employee answers
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  time_taken_minutes INTEGER
);

-- Disciplinary panel reviews after 3 failed attempts
CREATE TABLE public.disciplinary_panels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES profiles(id) NOT NULL,
  training_assignment_id UUID REFERENCES training_assignments(id) NOT NULL,
  panel_members UUID[] NOT NULL, -- Array of profile IDs
  review_date TIMESTAMP WITH TIME ZONE,
  decision TEXT CHECK (decision IN ('retrain', 'probation', 'termination', 'no_action')),
  decision_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default training categories
INSERT INTO public.training_categories (name, description) VALUES
('Technical Skills', 'Technical and job-specific training'),
('Soft Skills', 'Communication, leadership, and interpersonal skills'),
('Compliance', 'Regulatory and company policy training'),
('Safety', 'Workplace safety and health training'),
('Professional Development', 'Career growth and development training');

-- Enable RLS on all training tables
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinary_panels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trainings table
CREATE POLICY "HR and Admin can manage trainings" ON public.trainings
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('hr', 'admin')
  ));

CREATE POLICY "Employees can view assigned trainings" ON public.trainings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM training_assignments ta 
      WHERE ta.training_id = trainings.id AND ta.employee_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('hr', 'admin', 'manager')
    )
  );

-- RLS Policies for training_categories
CREATE POLICY "All authenticated users can view categories" ON public.training_categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "HR and Admin can manage categories" ON public.training_categories
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('hr', 'admin')
  ));

-- RLS Policies for training_requests
CREATE POLICY "Committee can create training requests" ON public.training_requests
  FOR INSERT WITH CHECK (
    requested_by = auth.uid() AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY "HR can view and manage training requests" ON public.training_requests
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('hr', 'admin')
  ));

CREATE POLICY "Requesters can view their own requests" ON public.training_requests
  FOR SELECT USING (requested_by = auth.uid());

-- RLS Policies for training_assignments
CREATE POLICY "HR can manage training assignments" ON public.training_assignments
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('hr', 'admin')
  ));

CREATE POLICY "Employees can view their assignments" ON public.training_assignments
  FOR SELECT USING (employee_id = auth.uid());

CREATE POLICY "Managers can view team assignments" ON public.training_assignments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = training_assignments.employee_id 
    AND p.line_manager_id = auth.uid()
  ));

-- RLS Policies for training_progress
CREATE POLICY "Employees can manage their progress" ON public.training_progress
  FOR ALL USING (EXISTS (
    SELECT 1 FROM training_assignments ta 
    WHERE ta.id = training_progress.assignment_id AND ta.employee_id = auth.uid()
  ));

CREATE POLICY "HR and managers can view progress" ON public.training_progress
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM training_assignments ta
    JOIN profiles p ON ta.employee_id = p.id
    WHERE ta.id = training_progress.assignment_id 
    AND (p.line_manager_id = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'admin')
    ))
  ));

-- RLS Policies for quiz questions
CREATE POLICY "HR can manage quiz questions" ON public.training_quiz_questions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('hr', 'admin')
  ));

CREATE POLICY "Employees can view questions for assigned trainings" ON public.training_quiz_questions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM training_assignments ta 
    WHERE ta.training_id = training_quiz_questions.training_id 
    AND ta.employee_id = auth.uid()
  ));

-- RLS Policies for quiz attempts
CREATE POLICY "Employees can manage their quiz attempts" ON public.quiz_attempts
  FOR ALL USING (EXISTS (
    SELECT 1 FROM training_assignments ta 
    WHERE ta.id = quiz_attempts.assignment_id AND ta.employee_id = auth.uid()
  ));

CREATE POLICY "HR and managers can view quiz attempts" ON public.quiz_attempts
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM training_assignments ta
    JOIN profiles p ON ta.employee_id = p.id
    WHERE ta.id = quiz_attempts.assignment_id 
    AND (p.line_manager_id = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'admin')
    ))
  ));

-- RLS Policies for disciplinary panels
CREATE POLICY "HR and panel members can manage disciplinary panels" ON public.disciplinary_panels
  FOR ALL USING (
    auth.uid() = ANY(panel_members) OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('hr', 'admin')
    )
  );

-- Create updated_at trigger for tables
CREATE OR REPLACE FUNCTION update_training_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trainings_updated_at BEFORE UPDATE ON public.trainings
  FOR EACH ROW EXECUTE FUNCTION update_training_updated_at_column();

CREATE TRIGGER update_disciplinary_panels_updated_at BEFORE UPDATE ON public.disciplinary_panels
  FOR EACH ROW EXECUTE FUNCTION update_training_updated_at_column();

-- Function to auto-create disciplinary panel after 3 failed attempts
CREATE OR REPLACE FUNCTION check_quiz_failures_and_create_panel()
RETURNS TRIGGER AS $$
DECLARE
  failure_count INTEGER;
  employee_profile profiles%ROWTYPE;
BEGIN
  -- Count failed attempts for this assignment
  SELECT COUNT(*) INTO failure_count
  FROM quiz_attempts 
  WHERE assignment_id = NEW.assignment_id AND passed = false;
  
  -- If this is the 3rd failure, create disciplinary panel
  IF failure_count >= 3 AND NOT NEW.passed THEN
    -- Get employee info
    SELECT p.* INTO employee_profile
    FROM profiles p
    JOIN training_assignments ta ON p.id = ta.employee_id
    WHERE ta.id = NEW.assignment_id;
    
    -- Update assignment status to disciplinary
    UPDATE training_assignments 
    SET status = 'disciplinary' 
    WHERE id = NEW.assignment_id;
    
    -- Create disciplinary panel with HR and committee members
    INSERT INTO disciplinary_panels (
      employee_id, 
      training_assignment_id, 
      panel_members
    ) 
    SELECT 
      employee_profile.id,
      NEW.assignment_id,
      ARRAY(SELECT id FROM profiles WHERE role IN ('hr', 'manager') AND is_active = true LIMIT 3);
    
    -- Notify HR and panel members
    INSERT INTO notifications (user_id, type, title, message, related_employee_id)
    SELECT 
      p.id,
      'disciplinary_panel_required',
      'Disciplinary Panel Required',
      employee_profile.first_name || ' ' || employee_profile.last_name || ' has failed training 3 times. Panel review required.',
      employee_profile.id
    FROM profiles p 
    WHERE p.role IN ('hr', 'manager') AND p.is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_quiz_failures 
  AFTER INSERT ON quiz_attempts 
  FOR EACH ROW EXECUTE FUNCTION check_quiz_failures_and_create_panel();

-- Function to notify employee when training is assigned
CREATE OR REPLACE FUNCTION notify_training_assignment()
RETURNS TRIGGER AS $$
DECLARE
  employee_name TEXT;
  training_title TEXT;
  assigner_name TEXT;
BEGIN
  -- Get employee, training, and assigner info
  SELECT 
    p.first_name || ' ' || p.last_name,
    t.title,
    a.first_name || ' ' || a.last_name
  INTO employee_name, training_title, assigner_name
  FROM profiles p, trainings t, profiles a
  WHERE p.id = NEW.employee_id 
    AND t.id = NEW.training_id 
    AND a.id = NEW.assigned_by;
  
  -- Send notification to employee
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    related_employee_id
  ) VALUES (
    NEW.employee_id,
    'training_assigned',
    'New Training Assigned',
    'You have been assigned the training "' || training_title || '" by ' || assigner_name || '. Due date: ' || NEW.due_date::DATE,
    NEW.employee_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_training_assignment 
  AFTER INSERT ON training_assignments 
  FOR EACH ROW EXECUTE FUNCTION notify_training_assignment();
