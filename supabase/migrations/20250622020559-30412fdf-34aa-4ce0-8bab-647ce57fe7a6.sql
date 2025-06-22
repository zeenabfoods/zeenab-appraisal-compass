
-- Add missing related_appraisal_id column to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS related_appraisal_id UUID REFERENCES public.appraisals(id);

-- Update the notify_line_manager function to be more robust
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

-- Create function to notify line manager when employee submits appraisal
CREATE OR REPLACE FUNCTION public.notify_line_manager_submission(
  appraisal_id_param UUID,
  employee_id_param UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    line_manager_id UUID;
    employee_name TEXT;
    cycle_name TEXT;
BEGIN
    -- Get line manager, employee name, and cycle details
    SELECT 
        p.line_manager_id,
        p.first_name || ' ' || p.last_name,
        ac.name
    INTO line_manager_id, employee_name, cycle_name
    FROM public.profiles p
    JOIN public.appraisals a ON a.employee_id = p.id
    JOIN public.appraisal_cycles ac ON a.cycle_id = ac.id
    WHERE p.id = employee_id_param AND a.id = appraisal_id_param;
    
    -- Send notification to line manager if exists
    IF line_manager_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            related_employee_id,
            related_appraisal_id
        ) VALUES (
            line_manager_id,
            'appraisal_submitted',
            'Employee Appraisal Submitted',
            employee_name || ' has submitted their appraisal for ' || cycle_name || ' and it is ready for your review.',
            employee_id_param,
            appraisal_id_param
        );
    END IF;
END;
$$;
