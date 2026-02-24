
-- Hard-delete all Q4 2025 soft-deleted assignment records for the 4 employees
-- so they can be reassigned fresh
DELETE FROM employee_appraisal_questions
WHERE employee_id IN (
  '267461c7-47f3-4e78-b4d0-617f5e696dde',  -- Miracle Emojevwe
  'd91b2d13-2bff-485c-aab7-1cd47d87ba1d',  -- James Babatunde
  '4509fb3b-ba71-40c3-80eb-8eb25bf95289',  -- Magaji Abdullahi
  '09775f0a-0fc9-4310-8065-055b5904dbb3'   -- Olusola Lawal
)
AND cycle_id = 'e3f65b30-743d-41d4-a26c-daf23dd643f3';
