-- ============================================================================
-- 0016: Class Constraints and Student ID
-- ============================================================================

-- Add student_id to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_id text;

-- Add constraints
DO $$
BEGIN
  -- Roll number unique per class, not globally
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_roll_per_class') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT uq_roll_per_class 
      UNIQUE (academic_year_id, programme_id, year_of_study_id, semester_id, division_id, roll_number);
  END IF;

  -- Student ID globally unique
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_student_id') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT uq_student_id UNIQUE (student_id);
  END IF;
END $$;
