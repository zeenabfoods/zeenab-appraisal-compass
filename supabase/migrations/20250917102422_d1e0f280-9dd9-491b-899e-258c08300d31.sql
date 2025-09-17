-- Extend existing trainings table with missing columns
ALTER TABLE public.trainings ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'video';
ALTER TABLE public.trainings ADD COLUMN IF NOT EXISTS content_url text;
ALTER TABLE public.trainings ADD COLUMN IF NOT EXISTS file_path text;

-- Update training assignments table status check
ALTER TABLE public.training_assignments DROP CONSTRAINT IF EXISTS training_assignments_status_check;
ALTER TABLE public.training_assignments ADD CONSTRAINT training_assignments_status_check 
CHECK (status IN ('assigned', 'in_progress', 'completed', 'overdue', 'disciplinary'));

-- Create training quiz questions table if not exists
CREATE TABLE IF NOT EXISTS public.training_quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  options JSONB,
  correct_answer TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on training quiz questions
ALTER TABLE public.training_quiz_questions ENABLE ROW LEVEL SECURITY;

-- RLS policies for training quiz questions
CREATE POLICY "Employees can view questions for assigned trainings" ON public.training_quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.training_assignments ta
      WHERE ta.training_id = training_quiz_questions.training_id 
      AND ta.employee_id = auth.uid()
    )
  );

CREATE POLICY "HR can manage quiz questions" ON public.training_quiz_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('hr', 'admin')
    )
  );