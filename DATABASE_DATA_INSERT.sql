-- ============================================
-- DATABASE DATA INSERT STATEMENTS
-- Project: vedgkzikqccykuozkmxl
-- Generated: 2025-12-23
-- ============================================
-- IMPORTANT: Run DATABASE_SCHEMA_EXPORT.sql FIRST before running this file
-- Run these statements in your NEW Supabase project's SQL Editor
-- ============================================

-- ============================================
-- STEP 1: DEPARTMENTS (Run First - No Dependencies)
-- ============================================

INSERT INTO public.departments (id, name, description, line_manager_id, is_active, created_at, updated_at) VALUES
('2a3ba0d9-030f-4eb1-a943-f83467431cef', 'Human Resources', 'People operations and talent management', NULL, true, '2025-06-20 08:39:11.374161+00', '2025-09-08 13:48:40.332037+00'),
('cabd0256-d6ce-4e15-a28e-05135f2cbdc0', 'IT Department', 'Manages All Information Technology Infrastructure', NULL, true, '2025-06-20 08:39:11.374161+00', '2025-09-08 13:48:24.045511+00'),
('34e8b3fa-b550-4231-8ed7-288fdbae197b', 'Rice Mill', 'Rice Processing Unit', NULL, true, '2025-06-20 08:39:11.374161+00', '2025-09-08 13:40:56.811597+00'),
('95f938d5-d340-4d77-bb47-59f2148a751b', 'Marketing', 'Brand promotion and market development', NULL, true, '2025-06-20 08:39:11.374161+00', '2025-06-20 20:40:32.355957+00'),
('b1f35313-6cf8-4d9a-b2fb-de7a464aef7e', 'Facility Management', 'Manages All The Company''s Facility', NULL, true, '2025-06-20 09:10:29.104659+00', '2025-09-08 13:41:58.503254+00'),
('371fb4b4-e277-4b86-b990-96472fe98126', 'Export', 'Manages All Export Related Businesses', NULL, true, '2025-06-20 09:12:08.193571+00', '2025-09-08 13:47:53.567843+00'),
('632199ab-2bb4-42b6-8776-f517003ff0d8', 'Customer Service', 'Customer Service', NULL, true, '2025-06-20 09:55:42.657449+00', '2025-09-08 13:43:16.859114+00'),
('4e2e6704-f7a4-48ee-b2ad-c54be2c4582b', 'NEXHUB', '', NULL, true, '2025-06-20 09:55:53.14159+00', '2025-09-08 13:48:05.904374+00'),
('938ca26f-4200-4923-8b17-461429c0c04f', 'CNTH', '', NULL, true, '2025-06-20 09:56:09.700939+00', '2025-09-08 13:41:26.659995+00'),
('6e91a124-e557-4142-8e7a-e7415b392215', 'Legal', 'This the legal department', NULL, true, '2025-08-14 14:16:45.925814+00', '2025-09-08 13:38:31.535785+00'),
('1dfccc29-38ef-4058-a1c8-97d0b674e2a8', 'Accounts', '', NULL, true, '2025-08-15 07:21:46.319673+00', '2025-08-15 07:21:46.319673+00'),
('e2648a72-b829-4c78-9dea-c230f0fb7a51', 'Admin', '', NULL, true, '2025-09-05 11:56:49.204284+00', '2025-09-08 13:41:12.777733+00'),
('11d490de-6942-40a0-86bb-d96a74836477', 'WFP', '', NULL, true, '2025-09-08 13:04:53.12398+00', '2025-09-10 14:16:51.933301+00'),
('2d4c5c8b-6cb8-49d9-8aa8-90adc8c3d540', 'Procurement', '', NULL, true, '2025-09-08 13:05:28.286651+00', '2025-09-08 13:40:43.35657+00'),
('e9ca12ed-ff1b-4051-b056-7e39cac1384e', 'Operations', '', NULL, true, '2025-09-10 15:53:53.809065+00', '2025-09-10 15:53:53.809065+00'),
('a422f457-4d1d-40f8-ac20-1f24bebe9fbf', 'Sahel', '', NULL, true, '2025-10-09 15:38:54.855975+00', '2025-10-09 15:38:54.855975+00');

-- ============================================
-- STEP 2: PROFILES (Run Second - References Departments)
-- Note: You need to create these users in Supabase Auth FIRST
-- with matching UUIDs, OR let the auth trigger create them
-- ============================================

-- IMPORTANT: These profiles reference auth.users IDs
-- Option 1: Create users via Auth with these specific IDs
-- Option 2: Create users via Auth, then UPDATE profiles to match this data

-- Core profiles (insert without line_manager_id first)
INSERT INTO public.profiles (id, email, first_name, last_name, role, department_id, position, is_active, created_at) VALUES
('a013689a-917d-42aa-9270-3b83c844bb5d', 'humanresource@zeenabgroup.com', 'Human', 'Resource', 'hr', '2a3ba0d9-030f-4eb1-a943-f83467431cef', '', true, '2025-06-19 08:59:45.109006+00'),
('14085962-62dd-4d01-a9ed-d4dc43cfc7e5', 'iebenezer@zeenabgroup.com', 'Ebenezer', 'Ise', 'staff', 'cabd0256-d6ce-4e15-a28e-05135f2cbdc0', 'Head of IT', true, '2025-06-19 09:04:46.795487+00'),
('34e5a895-c68b-4f2d-9579-afded77179bf', 'mfavour@zeenabgroup.com', 'Favour', 'Micheal', 'staff', '2a3ba0d9-030f-4eb1-a943-f83467431cef', 'HR Officer', true, '2025-06-20 07:56:04.223193+00'),
('6fb1189f-c85e-4672-8a60-fbe450acb293', 'appraisal@zeenabfoods.com', 'Super', 'Admin', 'staff', NULL, '', true, '2025-06-20 09:32:04.011498+00'),
('19ae112d-e0c9-4a38-aab4-e57231334f16', 'aavong@zeenabgroup.com', 'Avong', 'Abba', 'staff', 'cabd0256-d6ce-4e15-a28e-05135f2cbdc0', 'System Admin', true, '2025-06-28 09:53:06.189694+00'),
('54a77576-230d-46cf-bb46-578732fb14e0', 'eirabor@cnthlimited.com', 'Bright', 'Irabor', 'staff', '938ca26f-4200-4923-8b17-461429c0c04f', 'Logistics Officer', true, '2025-09-05 11:04:53.099383+00'),
('c523b733-e3a0-4d9a-a65b-2e5c7a87a7c5', 'adahiru@zeenabgroup.com', 'Ahmed', 'Dahiru', 'staff', '1dfccc29-38ef-4058-a1c8-97d0b674e2a8', 'Accountant', true, '2025-09-05 11:04:54.168017+00'),
('1a871ad4-a9f8-4c15-97bf-68b33febc7f8', 'nkenneth@zeenabgroup.com', 'Nzediegwu', 'Chidozie Kenneth', 'manager', '6e91a124-e557-4142-8e7a-e7415b392215', 'Head of Legal/Company Secretary', true, '2025-09-05 11:05:54.337232+00'),
('bf41a667-c29d-4d22-af84-7c63ede915ef', 'amaryam@zeenabgroup.com', 'Maryam', 'Abdulazeez', 'staff', 'e2648a72-b829-4c78-9dea-c230f0fb7a51', 'Executive Assistant', true, '2025-09-05 11:07:21.945209+00'),
('c99217ab-76c0-4c0a-b941-fb8d01a4054d', 'vigun@cnthlimited.com', 'Vincent', 'Igun', 'staff', '938ca26f-4200-4923-8b17-461429c0c04f', 'Asst General Manager', true, '2025-09-05 11:08:20.568565+00'),
('9f49c46c-ce68-4c3e-872a-248d9a9a6bb3', 'bfaleke@nigerianexportershub.com', 'Babatunde', 'Faleke', 'manager', '4e2e6704-f7a4-48ee-b2ad-c54be2c4582b', 'Managing Director', true, '2025-09-05 11:09:32.191629+00'),
('86a316f5-9b05-4067-a952-6791b4c3d0b8', 'ebassey@nigerianexportershub.com', 'Eno', 'Bassey', 'staff', '4e2e6704-f7a4-48ee-b2ad-c54be2c4582b', 'Business Dev. Executive', true, '2025-09-05 11:09:48.492459+00'),
('adae1079-72f4-44c6-8541-63a9b1c7c9d9', 'kjude@habrisfoods.com', 'Keshi Jude', 'Aondona', 'staff', '34e8b3fa-b550-4231-8ed7-288fdbae197b', 'Quality Control Officer', true, '2025-09-05 11:11:53.205101+00'),
('29cedd79-11da-471c-9bbc-80366ede53dd', 'esamuel@habrisfoods.com', 'Steven', 'Emmanuel', 'manager', 'b1f35313-6cf8-4d9a-b2fb-de7a464aef7e', 'Electrician', true, '2025-09-05 11:29:45.731908+00');

-- NOTE: There are many more profiles in your database. 
-- Due to the large volume, I recommend exporting profiles as CSV from the old project
-- and importing via the Table Editor in the new project.

-- ============================================
-- STEP 3: UPDATE DEPARTMENT LINE MANAGERS
-- (After profiles are created)
-- ============================================

UPDATE public.departments SET line_manager_id = '8cd76751-5938-492a-b961-e2e5bf3c5be5' WHERE id = '2a3ba0d9-030f-4eb1-a943-f83467431cef';
UPDATE public.departments SET line_manager_id = '14085962-62dd-4d01-a9ed-d4dc43cfc7e5' WHERE id = 'cabd0256-d6ce-4e15-a28e-05135f2cbdc0';
UPDATE public.departments SET line_manager_id = '7f1f2b6e-481a-450e-9d20-4b92114fa9a3' WHERE id = '34e8b3fa-b550-4231-8ed7-288fdbae197b';
UPDATE public.departments SET line_manager_id = '34e5a895-c68b-4f2d-9579-afded77179bf' WHERE id = '95f938d5-d340-4d77-bb47-59f2148a751b';
UPDATE public.departments SET line_manager_id = '448f6e49-845d-47ca-8092-159a00d9c0a2' WHERE id = 'b1f35313-6cf8-4d9a-b2fb-de7a464aef7e';
UPDATE public.departments SET line_manager_id = 'e2dc0e85-548e-415d-bb21-4f5cf87182af' WHERE id = '371fb4b4-e277-4b86-b990-96472fe98126';
UPDATE public.departments SET line_manager_id = '1f69d2d8-0fe2-46df-9f98-56ba912885c4' WHERE id = '632199ab-2bb4-42b6-8776-f517003ff0d8';
UPDATE public.departments SET line_manager_id = 'e2e34ebe-3a5e-489a-b4be-d5cbd0de15fb' WHERE id = '4e2e6704-f7a4-48ee-b2ad-c54be2c4582b';
UPDATE public.departments SET line_manager_id = 'c99217ab-76c0-4c0a-b941-fb8d01a4054d' WHERE id = '938ca26f-4200-4923-8b17-461429c0c04f';
UPDATE public.departments SET line_manager_id = '1a871ad4-a9f8-4c15-97bf-68b33febc7f8' WHERE id = '6e91a124-e557-4142-8e7a-e7415b392215';
UPDATE public.departments SET line_manager_id = '34e5a895-c68b-4f2d-9579-afded77179bf' WHERE id = '1dfccc29-38ef-4058-a1c8-97d0b674e2a8';
UPDATE public.departments SET line_manager_id = '8cd76751-5938-492a-b961-e2e5bf3c5be5' WHERE id = 'e2648a72-b829-4c78-9dea-c230f0fb7a51';
UPDATE public.departments SET line_manager_id = '9acbd66f-daec-4dfa-8ac2-081a46906a2f' WHERE id = '11d490de-6942-40a0-86bb-d96a74836477';
UPDATE public.departments SET line_manager_id = '9acbd66f-daec-4dfa-8ac2-081a46906a2f' WHERE id = '2d4c5c8b-6cb8-49d9-8aa8-90adc8c3d540';

-- ============================================
-- STEP 4: APPRAISAL CYCLES
-- ============================================

INSERT INTO public.appraisal_cycles (id, name, year, quarter, start_date, end_date, status, created_by, created_at, updated_at) VALUES
('6e98d594-0f62-4a0b-ab29-0acf34064e4f', 'Q3 Zeenab Group Appraisal', 2025, 3, '2025-10-08', '2025-10-24', 'active', 'a013689a-917d-42aa-9270-3b83c844bb5d', '2025-09-16 09:38:45.176419+00', '2025-10-08 11:09:35.71684+00');

-- ============================================
-- STEP 5: ATTENDANCE BRANCHES
-- ============================================

INSERT INTO public.attendance_branches (id, name, address, latitude, longitude, geofence_radius, geofence_color, is_active, created_at, updated_at) VALUES
('42c0626a-f9a2-4fce-a0be-02e9f3bdc458', 'Abuja HQ', 'Zeenab Foods Limited, Victor Ayemere St, Idu Industrial District, Abuja 900106, Federal Capital Territory', 9.04896647, 7.36367897, 50, '#FF6B35', true, '2025-11-26 11:35:33.149013+00', '2025-11-28 14:24:16.531264+00'),
('28e5b8f4-2293-4075-8253-2c6078cb1728', 'Lagos Branch', '3 Aromire Ave, Ikeja, 101233, Lagos', 6.60736308, 3.34855491, 50, '#0ba80d', true, '2025-11-27 09:06:42.484178+00', '2025-12-05 14:14:28.734312+00'),
('9b8d3ccb-6369-4bda-a4a6-55488a9628fb', 'Kano Branch', 'Zeenab Foods Limited, KM 10 KATSINA ROAD ,AFTER MILITARA ROUND ABOUT ,DAWANAU MARKET ,KANO STATE .', 12.08236663, 8.44511880, 100, '#f901cb', true, '2025-12-02 08:29:47.471399+00', '2025-12-03 11:17:50.729164+00'),
('7f124db7-49cf-4fee-80f5-2e625717f265', 'Igwuebe Branch', 'Azenabor Oil Polms, Igwube, Edu, Benin', 6.58132578, 6.26650095, 100, '#7adf16', true, '2025-12-04 09:40:42.384351+00', '2025-12-04 09:40:42.384351+00'),
('893a9a3d-72e8-44b2-bc7e-5ed06aa5ad3c', 'Ogun Branch', 'Ladgroup Limited Ikenne,Benin-Sagamu Expy, Ikenne II 121103, Ogun State', 6.88221752, 3.68819707, 50, '#ff0000', true, '2025-12-05 13:46:16.737488+00', '2025-12-05 13:46:16.737488+00');

-- ============================================
-- STEP 6: ATTENDANCE RULES
-- ============================================

INSERT INTO public.attendance_rules (id, rule_name, work_start_time, work_end_time, grace_period_minutes, late_threshold_minutes, late_charge_amount, absence_charge_amount, early_closure_charge_amount, overtime_rate, night_shift_start_time, night_shift_end_time, night_shift_rate, mandatory_break_duration_minutes, max_break_duration_minutes, allow_multiple_sessions_per_day, is_active, created_at, updated_at) VALUES
('1f329044-a297-4d14-9169-d476404e8823', 'Default Company Policy', '08:00:00', '17:00:00', 5, 15, 1000.00, 10000.00, 5000, 1.5, '08:00:00', '07:00:00', 1.2, 30, 60, true, true, '2025-11-26 11:24:58.559375+00', '2025-12-05 10:29:43.057476+00');

-- ============================================
-- STEP 7: ATTENDANCE SETTINGS
-- ============================================

INSERT INTO public.attendance_settings (id, onesignal_app_id, alert_sound_url, alert_volume, api_demo_mode, created_at, updated_at) VALUES
('bae39322-0bba-4c49-b208-abd54a0c67a6', '383b4cfa-ffd4-44d7-bd99-f2297f3e0269', 'alert-1764232417658-notification-bell-sound-1-376885.mp3', 0, false, '2025-11-27 08:27:17.294358+00', '2025-12-08 08:55:36.633+00');

-- ============================================
-- STEP 8: OVERTIME RATES
-- ============================================

INSERT INTO public.overtime_rates (id, position_name, day_type, rate_amount, created_at, updated_at) VALUES
('b322246f-0a2f-413f-af70-0001de6e39e6', 'Operator', 'weekday', 1000, '2025-12-09 14:27:54.824725+00', '2025-12-09 14:27:54.824725+00'),
('276db772-8774-48e8-a565-3d87b28629bd', 'Operator', 'saturday', 1500, '2025-12-09 14:27:54.824725+00', '2025-12-09 14:27:54.824725+00'),
('1293aa81-ce14-433b-ac3f-8a204af1b14e', 'Operator', 'sunday', 2000, '2025-12-09 14:27:54.824725+00', '2025-12-09 14:27:54.824725+00'),
('fb63d75b-6ead-4440-9043-9edcd9cf5e1e', 'Helper', 'weekday', 800, '2025-12-09 14:27:54.824725+00', '2025-12-09 14:27:54.824725+00'),
('c7c06001-0f55-43f7-b9a6-be2bb6209310', 'Helper', 'saturday', 1200, '2025-12-09 14:27:54.824725+00', '2025-12-09 14:27:54.824725+00'),
('591b40e1-0d5d-4f71-bfd5-42e898553cc5', 'Helper', 'sunday', 1500, '2025-12-09 14:27:54.824725+00', '2025-12-09 14:27:54.824725+00');

-- ============================================
-- LARGE DATA TABLES - USE CSV EXPORT/IMPORT
-- ============================================
-- The following tables have too much data for SQL INSERT:
-- 
-- 1. profiles (100+ employees) - Export as CSV
-- 2. appraisal_question_sections (50+ sections) - Export as CSV
-- 3. appraisal_questions (177+ questions) - Export as CSV
-- 4. appraisals (237+ records) - Export as CSV  
-- 5. appraisal_responses (115+ records) - Export as CSV
-- 6. employee_appraisal_questions (1000+ assignments) - Export as CSV
-- 7. attendance_logs (500+ records) - Export as CSV
-- 8. notifications (200+ records) - Export as CSV
--
-- For these tables, go to:
-- https://supabase.com/dashboard/project/vedgkzikqccykuozkmxl/editor
-- Click each table → Export → Download as CSV
-- Then import in your NEW project's Table Editor

-- ============================================
-- FINAL NOTES
-- ============================================
-- 
-- IMPORT ORDER for CSVs:
-- 1. departments (done above)
-- 2. profiles 
-- 3. appraisal_cycles (done above)
-- 4. appraisal_question_sections
-- 5. appraisal_questions
-- 6. appraisals
-- 7. appraisal_responses
-- 8. employee_appraisal_questions
-- 9. attendance_branches (done above)
-- 10. attendance_rules (done above)
-- 11. attendance_logs
-- 12. attendance_breaks
-- 13. attendance_charges
-- 14. notifications
--
-- AFTER IMPORT:
-- 1. Add secrets in new project:
--    - GOOGLE_MAPS_API_KEY
--    - ONESIGNAL_REST_API_KEY  
--    - ONESIGNAL_APP_ID
--
-- 2. Create auth trigger:
--    CREATE TRIGGER on_auth_user_created
--      AFTER INSERT ON auth.users
--      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
--
-- ============================================
