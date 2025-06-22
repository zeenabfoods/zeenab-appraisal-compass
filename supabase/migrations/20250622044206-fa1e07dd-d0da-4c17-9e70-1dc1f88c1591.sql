
-- First, let's check if the foreign key constraint exists and drop it if it's broken
DO $$ 
BEGIN
    -- Drop the constraint if it exists (it might be broken)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_line_manager_id_fkey'
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_line_manager_id_fkey;
    END IF;
END $$;

-- Now add the correct foreign key constraint
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_line_manager_id_fkey 
FOREIGN KEY (line_manager_id) REFERENCES public.profiles(id);

-- Also make sure we have the constraint for department_id if it's missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_department_id_fkey'
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_department_id_fkey 
        FOREIGN KEY (department_id) REFERENCES public.departments(id);
    END IF;
END $$;
