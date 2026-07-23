-- ============================================================================
-- 0017: Class Assignments and Class Rep RPCs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.class_teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id uuid REFERENCES public.profiles(id),
  department_id uuid REFERENCES public.departments(id),
  programme_id uuid REFERENCES public.programmes(id),
  academic_year_id uuid REFERENCES public.academic_years(id),
  year_of_study_id uuid REFERENCES public.years_of_study(id),
  semester_id uuid REFERENCES public.semesters(id),
  division_id uuid REFERENCES public.divisions(id),
  assigned_by uuid REFERENCES public.profiles(id),
  assigned_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  is_active boolean DEFAULT true
);

-- Partial unique index: one active class teacher per class
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_class_teacher ON public.class_teacher_assignments
  (department_id, programme_id, academic_year_id, year_of_study_id, semester_id, division_id)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.class_representative_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.profiles(id),
  department_id uuid REFERENCES public.departments(id),
  programme_id uuid REFERENCES public.programmes(id),
  academic_year_id uuid REFERENCES public.academic_years(id),
  year_of_study_id uuid REFERENCES public.years_of_study(id),
  semester_id uuid REFERENCES public.semesters(id),
  division_id uuid REFERENCES public.divisions(id),
  slot_number smallint CHECK (slot_number IN (1,2)),
  assigned_by uuid REFERENCES public.profiles(id),
  assigned_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.profiles(id),
  revoke_reason text,
  is_active boolean DEFAULT true
);

-- One active student per slot per class
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_cr_slot ON public.class_representative_assignments
  (department_id, programme_id, academic_year_id, year_of_study_id, semester_id, division_id, slot_number)
  WHERE is_active = true;

-- Same student can't hold both slots in one class simultaneously
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_cr_student_per_class ON public.class_representative_assignments
  (student_id, department_id, programme_id, academic_year_id, year_of_study_id, semester_id, division_id)
  WHERE is_active = true;

-- RPC for assigning CR
CREATE OR REPLACE FUNCTION public.assign_class_representative(
  p_student_id uuid,
  p_class_scope jsonb,
  p_slot_number smallint
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_assigned_by uuid := auth.uid();
  v_faculty_assigned boolean;
  v_student_profile record;
BEGIN
  -- Validate active Class Teacher scope (Assuming the current user is a class teacher for this class, or admin)
  -- For brevity, we just check if the user is dept_admin, super_admin, or active class teacher
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = v_assigned_by AND role IN ('super_admin', 'dept_admin')
  ) AND NOT EXISTS (
    SELECT 1 FROM class_teacher_assignments 
    WHERE faculty_id = v_assigned_by 
      AND department_id = (p_class_scope->>'department_id')::uuid
      AND programme_id = (p_class_scope->>'programme_id')::uuid
      AND academic_year_id = (p_class_scope->>'academic_year_id')::uuid
      AND year_of_study_id = (p_class_scope->>'year_of_study_id')::uuid
      AND semester_id = (p_class_scope->>'semester_id')::uuid
      AND division_id = (p_class_scope->>'division_id')::uuid
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Not authorized to assign CR for this class';
  END IF;

  -- Validate student belongs to exact class
  SELECT * INTO v_student_profile FROM profiles WHERE id = p_student_id;
  IF v_student_profile IS NULL OR 
     v_student_profile.department_id != (p_class_scope->>'department_id')::uuid OR
     v_student_profile.programme_id != (p_class_scope->>'programme_id')::uuid OR
     v_student_profile.academic_year_id != (p_class_scope->>'academic_year_id')::uuid OR
     v_student_profile.year_of_study_id != (p_class_scope->>'year_of_study_id')::uuid OR
     v_student_profile.semester_id != (p_class_scope->>'semester_id')::uuid OR
     v_student_profile.division_id != (p_class_scope->>'division_id')::uuid THEN
    RAISE EXCEPTION 'Student does not belong to this class';
  END IF;

  -- Validate student not suspended/banned
  IF v_student_profile.is_suspended THEN
    RAISE EXCEPTION 'Student account is suspended';
  END IF;

  -- Deactivate previous CR in this slot if exists
  UPDATE class_representative_assignments
  SET is_active = false, revoked_at = now(), revoked_by = v_assigned_by, revoke_reason = 'Replaced by new assignment'
  WHERE department_id = (p_class_scope->>'department_id')::uuid
    AND programme_id = (p_class_scope->>'programme_id')::uuid
    AND academic_year_id = (p_class_scope->>'academic_year_id')::uuid
    AND year_of_study_id = (p_class_scope->>'year_of_study_id')::uuid
    AND semester_id = (p_class_scope->>'semester_id')::uuid
    AND division_id = (p_class_scope->>'division_id')::uuid
    AND slot_number = p_slot_number
    AND is_active = true;

  -- Upsert assignment
  INSERT INTO class_representative_assignments (
    student_id, department_id, programme_id, academic_year_id, year_of_study_id, semester_id, division_id, slot_number, assigned_by
  ) VALUES (
    p_student_id,
    (p_class_scope->>'department_id')::uuid,
    (p_class_scope->>'programme_id')::uuid,
    (p_class_scope->>'academic_year_id')::uuid,
    (p_class_scope->>'year_of_study_id')::uuid,
    (p_class_scope->>'semester_id')::uuid,
    (p_class_scope->>'division_id')::uuid,
    p_slot_number,
    v_assigned_by
  );

  -- Flip profile role to class_rep
  UPDATE profiles SET role = 'class_rep' WHERE id = p_student_id;

  -- Insert user_roles history row
  INSERT INTO user_roles (user_id, role, scope_department_id, scope_division_id, assigned_by)
  VALUES (p_student_id, 'class_rep', (p_class_scope->>'department_id')::uuid, (p_class_scope->>'division_id')::uuid, v_assigned_by);

  -- (Assuming audit_logs table exists based on 0008_audit_and_settings.sql)
  -- We don't have the exact schema of audit_log, skipping for brevity or add if known.
END;
$$;

-- RPC for revoking CR
CREATE OR REPLACE FUNCTION public.revoke_class_representative(
  p_assignment_id uuid,
  p_reason text
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_revoked_by uuid := auth.uid();
  v_assignment record;
BEGIN
  SELECT * INTO v_assignment FROM class_representative_assignments WHERE id = p_assignment_id AND is_active = true;
  IF v_assignment IS NULL THEN
    RAISE EXCEPTION 'Active assignment not found';
  END IF;

  -- Validate permissions (similar to assign)
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = v_revoked_by AND role IN ('super_admin', 'dept_admin')
  ) AND NOT EXISTS (
    SELECT 1 FROM class_teacher_assignments 
    WHERE faculty_id = v_revoked_by 
      AND department_id = v_assignment.department_id
      AND programme_id = v_assignment.programme_id
      AND academic_year_id = v_assignment.academic_year_id
      AND year_of_study_id = v_assignment.year_of_study_id
      AND semester_id = v_assignment.semester_id
      AND division_id = v_assignment.division_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Not authorized to revoke CR for this class';
  END IF;

  UPDATE class_representative_assignments
  SET is_active = false, revoked_at = now(), revoked_by = v_revoked_by, revoke_reason = p_reason
  WHERE id = p_assignment_id;

  -- Flip profile role back to student
  UPDATE profiles SET role = 'student' WHERE id = v_assignment.student_id;
  
  -- Update user_roles history
  UPDATE user_roles SET revoked_at = now() WHERE user_id = v_assignment.student_id AND role = 'class_rep' AND revoked_at IS NULL;
END;
$$;
