-- Add skill requirements to recruitment_settings
ALTER TABLE recruitment_settings
ADD COLUMN IF NOT EXISTS skill_requirements JSONB DEFAULT '{
  "technical": 80,
  "experience": 75,
  "education": 70,
  "softSkills": 80,
  "tools": 75
}'::jsonb;