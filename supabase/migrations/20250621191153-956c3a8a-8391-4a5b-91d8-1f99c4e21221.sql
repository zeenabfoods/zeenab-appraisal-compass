
-- Add manager review functionality to appraisals table
ALTER TABLE public.appraisals 
ADD COLUMN IF NOT EXISTS manager_reviewed_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS committee_reviewed_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS committee_reviewed_at TIMESTAMP WITH TIME ZONE;

-- Update the appraisal_status enum to include all workflow states
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appraisal_status') THEN
        CREATE TYPE appraisal_status AS ENUM ('draft', 'submitted', 'manager_review', 'committee_review', 'completed');
    ELSE
        -- Add new values if they don't exist
        BEGIN
            ALTER TYPE appraisal_status ADD VALUE IF NOT EXISTS 'committee_review';
        EXCEPTION WHEN duplicate_object THEN
            -- Value already exists, continue
        END;
    END IF;
END $$;

-- Create a function to get team members for a line manager
CREATE OR REPLACE FUNCTION public.get_team_members(manager_id_param UUID)
RETURNS TABLE (
    id UUID,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    "position" TEXT,
    department_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.email,
        p."position",
        d.name as department_name
    FROM public.profiles p
    LEFT JOIN public.departments d ON p.department_id = d.id
    WHERE p.line_manager_id = manager_id_param
    AND p.is_active = true;
$$;

-- Create a function to get appraisals for manager review
CREATE OR REPLACE FUNCTION public.get_manager_appraisals(manager_id_param UUID)
RETURNS TABLE (
    appraisal_id UUID,
    employee_id UUID,
    employee_name TEXT,
    cycle_name TEXT,
    status appraisal_status,
    submitted_at TIMESTAMP WITH TIME ZONE,
    cycle_id UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        a.id as appraisal_id,
        a.employee_id,
        p.first_name || ' ' || p.last_name as employee_name,
        ac.name as cycle_name,
        a.status,
        a.employee_submitted_at as submitted_at,
        a.cycle_id
    FROM public.appraisals a
    JOIN public.profiles p ON a.employee_id = p.id
    JOIN public.appraisal_cycles ac ON a.cycle_id = ac.id
    WHERE p.line_manager_id = manager_id_param
    AND a.status IN ('submitted', 'manager_review')
    ORDER BY a.employee_submitted_at DESC;
$$;

-- Create a function to notify HR when manager completes appraisal
CREATE OR REPLACE FUNCTION public.notify_hr_manager_review(
    appraisal_id_param UUID,
    manager_id_param UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    employee_name TEXT;
    manager_name TEXT;
    cycle_name TEXT;
    hr_user RECORD;
BEGIN
    -- Get employee, manager, and cycle details
    SELECT 
        emp.first_name || ' ' || emp.last_name,
        mgr.first_name || ' ' || mgr.last_name,
        ac.name
    INTO employee_name, manager_name, cycle_name
    FROM public.appraisals a
    JOIN public.profiles emp ON a.employee_id = emp.id
    JOIN public.profiles mgr ON mgr.id = manager_id_param
    JOIN public.appraisal_cycles ac ON a.cycle_id = ac.id
    WHERE a.id = appraisal_id_param;
    
    -- Send notification to all HR users
    FOR hr_user IN 
        SELECT id FROM public.profiles 
        WHERE role = 'hr' AND is_active = true
    LOOP
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            message,
            related_employee_id,
            related_appraisal_id
        ) VALUES (
            hr_user.id,
            'manager_review_completed',
            'Manager Review Completed',
            manager_name || ' has completed the appraisal review for ' || employee_name || ' (' || cycle_name || '). The appraisal is now ready for committee review.',
            (SELECT employee_id FROM public.appraisals WHERE id = appraisal_id_param),
            appraisal_id_param
        );
    END LOOP;
END;
$$;

-- Add related_appraisal_id column to notifications if it doesn't exist
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS related_appraisal_id UUID REFERENCES public.appraisals(id);
