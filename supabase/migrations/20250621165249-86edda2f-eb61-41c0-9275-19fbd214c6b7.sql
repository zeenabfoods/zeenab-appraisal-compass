
-- First, identify and remove orphaned records in appraisal_questions that reference non-existent sections
DELETE FROM appraisal_questions 
WHERE section_id IS NOT NULL 
AND section_id NOT IN (SELECT id FROM appraisal_question_sections);

-- Also remove any records from employee_appraisal_questions that reference these orphaned questions
DELETE FROM employee_appraisal_questions 
WHERE question_id NOT IN (SELECT id FROM appraisal_questions);

-- Now drop the existing foreign key constraint that's causing issues
ALTER TABLE appraisal_questions DROP CONSTRAINT IF EXISTS appraisal_questions_section_id_fkey;

-- Add the correct foreign key constraint to reference appraisal_question_sections
ALTER TABLE appraisal_questions 
ADD CONSTRAINT appraisal_questions_section_id_fkey 
FOREIGN KEY (section_id) REFERENCES appraisal_question_sections(id) ON DELETE CASCADE;
