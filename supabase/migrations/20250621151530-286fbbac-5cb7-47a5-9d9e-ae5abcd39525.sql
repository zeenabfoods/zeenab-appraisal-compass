
-- Create a notifications table for line manager alerts
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'question_assigned',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  related_question_ids UUID[] DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
  ON public.notifications 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "HR and admins can create notifications" 
  ON public.notifications 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('hr', 'admin')
    )
  );

-- Add a function to create line manager notifications
CREATE OR REPLACE FUNCTION public.notify_line_manager(
  employee_id_param UUID,
  question_ids_param UUID[],
  assigned_by_param UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  line_manager_id UUID;
  employee_name TEXT;
  question_count INTEGER;
BEGIN
  -- Get the line manager ID and employee name
  SELECT 
    p.line_manager_id,
    p.first_name || ' ' || p.last_name
  INTO line_manager_id, employee_name
  FROM public.profiles p
  WHERE p.id = employee_id_param;
  
  -- Only create notification if line manager exists
  IF line_manager_id IS NOT NULL THEN
    question_count := array_length(question_ids_param, 1);
    
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      related_employee_id,
      related_question_ids
    ) VALUES (
      line_manager_id,
      'questions_assigned',
      'Questions Assigned to Team Member',
      question_count || ' appraisal question(s) have been assigned to ' || employee_name || ' for completion.',
      employee_id_param,
      question_ids_param
    );
  END IF;
END;
$$;

-- Add a delete section function that handles related questions
CREATE OR REPLACE FUNCTION public.delete_section_with_questions(section_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete employee question assignments first
  DELETE FROM public.employee_appraisal_questions 
  WHERE question_id IN (
    SELECT id FROM public.appraisal_questions 
    WHERE section_id = section_id_param
  );
  
  -- Delete questions in the section
  DELETE FROM public.appraisal_questions 
  WHERE section_id = section_id_param;
  
  -- Delete the section
  DELETE FROM public.appraisal_question_sections 
  WHERE id = section_id_param;
END;
$$;
