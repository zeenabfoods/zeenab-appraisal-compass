
-- Create a comprehensive function to delete appraisal cycle and all related data
CREATE OR REPLACE FUNCTION delete_appraisal_cycle_cascade(cycle_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete in the correct order to avoid foreign key violations
    
    -- First, delete appraisal responses
    DELETE FROM appraisal_responses 
    WHERE cycle_id = cycle_id_param;
    
    -- Delete employee appraisal questions
    DELETE FROM employee_appraisal_questions 
    WHERE cycle_id = cycle_id_param;
    
    -- Delete appraisal questions for this cycle
    DELETE FROM appraisal_questions 
    WHERE cycle_id = cycle_id_param;
    
    -- Delete performance analytics
    DELETE FROM performance_analytics 
    WHERE cycle_id = cycle_id_param;
    
    -- Delete appraisals
    DELETE FROM appraisals 
    WHERE cycle_id = cycle_id_param;
    
    -- Finally, delete the cycle itself
    DELETE FROM appraisal_cycles 
    WHERE id = cycle_id_param;
    
    -- Log the deletion
    RAISE NOTICE 'Successfully deleted appraisal cycle % and all related data', cycle_id_param;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_appraisal_cycle_cascade(UUID) TO authenticated;
