
-- First, let's ensure the foreign key constraint exists for line_manager_id in profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_line_manager_id_fkey'
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_line_manager_id_fkey 
        FOREIGN KEY (line_manager_id) REFERENCES public.profiles(id);
    END IF;
END $$;

-- Create a table to link questions to specific employees for appraisals
CREATE TABLE IF NOT EXISTS public.employee_appraisal_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.appraisal_questions(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.appraisal_cycles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(employee_id, question_id, cycle_id)
);

-- Enable RLS on the new table
ALTER TABLE public.employee_appraisal_questions ENABLE ROW LEVEL SECURITY;

-- Create policies for the new table
CREATE POLICY "HR and admins can manage employee appraisal questions" 
  ON public.employee_appraisal_questions 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('hr', 'admin')
    )
  );

CREATE POLICY "Employees can view their own appraisal questions" 
  ON public.employee_appraisal_questions 
  FOR SELECT 
  USING (employee_id = auth.uid());

CREATE POLICY "Managers can view their team's appraisal questions" 
  ON public.employee_appraisal_questions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = employee_id 
      AND line_manager_id = auth.uid()
    )
  );

-- Add RLS policies for appraisal_question_sections (only if they don't exist)
DO $$ 
BEGIN
    -- Enable RLS first
    ALTER TABLE public.appraisal_question_sections ENABLE ROW LEVEL SECURITY;
    
    -- Check and create policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'appraisal_question_sections' 
        AND policyname = 'HR and admins can manage question sections'
    ) THEN
        CREATE POLICY "HR and admins can manage question sections" 
          ON public.appraisal_question_sections 
          FOR ALL 
          USING (
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE id = auth.uid() 
              AND role IN ('hr', 'admin')
            )
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'appraisal_question_sections' 
        AND policyname = 'All authenticated users can view question sections'
    ) THEN
        CREATE POLICY "All authenticated users can view question sections" 
          ON public.appraisal_question_sections 
          FOR SELECT 
          USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Add RLS policies for appraisal_questions (only if they don't exist)
DO $$ 
BEGIN
    -- Enable RLS first
    ALTER TABLE public.appraisal_questions ENABLE ROW LEVEL SECURITY;
    
    -- Check and create policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'appraisal_questions' 
        AND policyname = 'HR and admins can manage questions'
    ) THEN
        CREATE POLICY "HR and admins can manage questions" 
          ON public.appraisal_questions 
          FOR ALL 
          USING (
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE id = auth.uid() 
              AND role IN ('hr', 'admin')
            )
          );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'appraisal_questions' 
        AND policyname = 'All authenticated users can view questions'
    ) THEN
        CREATE POLICY "All authenticated users can view questions" 
          ON public.appraisal_questions 
          FOR SELECT 
          USING (auth.role() = 'authenticated');
    END IF;
END $$;
