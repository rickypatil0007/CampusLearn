-- ============================================================================
-- 0014: Academic Updates
-- ============================================================================

-- 1. Create years_of_study table
CREATE TABLE IF NOT EXISTS public.years_of_study (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text not null unique,
  level int not null unique,
  created_at timestamptz not null default now()
);

-- Insert Years of Study
INSERT INTO public.years_of_study (name, level) VALUES
('First Year', 1),
('Second Year', 2),
('Third Year', 3),
('Final Year', 4)
ON CONFLICT (level) DO NOTHING;

-- 2. Add year_of_study_id to semesters and profiles
ALTER TABLE public.semesters ADD COLUMN IF NOT EXISTS year_of_study_id uuid REFERENCES public.years_of_study(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS year_of_study_id uuid REFERENCES public.years_of_study(id);

-- 3. Make academic_years start_date and end_date nullable
ALTER TABLE public.academic_years ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE public.academic_years ALTER COLUMN end_date DROP NOT NULL;

-- 4. Insert Academic Session 2026-2027
INSERT INTO public.academic_years (label, is_current) 
VALUES ('2026-2027', true)
ON CONFLICT (label) DO UPDATE SET is_current = true;

-- 5. Insert Departments and Programmes (if institutions exists, we need its id, but we can just use a subquery)
-- Wait, institutions name might vary. We will insert TCET if not exists.
INSERT INTO public.institutions (name, short_name) 
VALUES ('Thakur College of Engineering and Technology', 'TCET')
ON CONFLICT DO NOTHING;

-- Since institutions doesn't have a unique constraint on name or short_name by default, 
-- we will just get the first one or use seed.ts. 
-- Wait, let's add unique constraint on short_name if not exists so we can ON CONFLICT.
-- Actually, the spec says "inserting departments... via INSERT ... ON CONFLICT DO NOTHING".
-- departments has unique (institution_id, code).

DO $$
DECLARE
  inst_id uuid;
  dept_cmpn uuid;
  dept_it uuid;
  dept_extc uuid;
  dept_mech uuid;
  dept_civil uuid;
  dept_ecs uuid;
  dept_aiml uuid;
  dept_aids uuid;
  dept_cyse uuid;
  dept_iot uuid;
  dept_mtrx uuid;
BEGIN
  SELECT id INTO inst_id FROM public.institutions LIMIT 1;
  IF inst_id IS NULL THEN
    INSERT INTO public.institutions (name, short_name) VALUES ('Thakur College of Engineering and Technology', 'TCET') RETURNING id INTO inst_id;
  END IF;

  -- Insert Departments
  INSERT INTO public.departments (institution_id, name, code) VALUES
  (inst_id, 'Computer Engineering', 'CMPN'),
  (inst_id, 'Information Technology', 'IT'),
  (inst_id, 'Electronics & Telecommunication Engg.', 'EXTC'),
  (inst_id, 'Mechanical Engineering', 'MECH'),
  (inst_id, 'Civil Engineering', 'CIVIL'),
  (inst_id, 'Electronics & Computer Science', 'ECS'),
  (inst_id, 'AI & Machine Learning', 'AIML'),
  (inst_id, 'AI & Data Science', 'AIDS'),
  (inst_id, 'Cyber Security', 'CYSE'),
  (inst_id, 'Internet of Things', 'IOT'),
  (inst_id, 'Mechatronics Engineering', 'MTRX')
  ON CONFLICT (institution_id, code) DO NOTHING;

  -- Get department IDs
  SELECT id INTO dept_cmpn FROM public.departments WHERE code = 'CMPN';
  SELECT id INTO dept_it FROM public.departments WHERE code = 'IT';
  SELECT id INTO dept_extc FROM public.departments WHERE code = 'EXTC';
  SELECT id INTO dept_mech FROM public.departments WHERE code = 'MECH';
  SELECT id INTO dept_civil FROM public.departments WHERE code = 'CIVIL';
  SELECT id INTO dept_ecs FROM public.departments WHERE code = 'ECS';
  SELECT id INTO dept_aiml FROM public.departments WHERE code = 'AIML';
  SELECT id INTO dept_aids FROM public.departments WHERE code = 'AIDS';
  SELECT id INTO dept_cyse FROM public.departments WHERE code = 'CYSE';
  SELECT id INTO dept_iot FROM public.departments WHERE code = 'IOT';
  SELECT id INTO dept_mtrx FROM public.departments WHERE code = 'MTRX';

  -- Insert Programmes
  INSERT INTO public.programmes (department_id, name, code, duration_years) VALUES
  (dept_cmpn, 'B.E. Computer Engineering', 'BE-CMPN', 4),
  (dept_it, 'B.E. Information Technology', 'BE-IT', 4),
  (dept_extc, 'B.E. Electronics & Telecommunication Engg.', 'BE-EXTC', 4),
  (dept_mech, 'B.E. Mechanical Engineering', 'BE-MECH', 4),
  (dept_civil, 'B.E. Civil Engineering', 'BE-CIVIL', 4),
  (dept_ecs, 'B.E. Electronics & Computer Science', 'BE-ECS', 4),
  (dept_aiml, 'B.E. AI & Machine Learning', 'BE-AIML', 4),
  (dept_aids, 'B.E. AI & Data Science', 'BE-AIDS', 4),
  (dept_cyse, 'B.E. Cyber Security', 'BE-CYSE', 4),
  (dept_iot, 'B.E. Internet of Things', 'BE-IOT', 4),
  (dept_mtrx, 'B.E. Mechatronics Engineering', 'BE-MTRX', 4)
  ON CONFLICT (department_id, code) DO NOTHING;
END $$;
