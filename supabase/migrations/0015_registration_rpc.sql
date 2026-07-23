-- ============================================================================
-- 0015: Registration Data RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_registration_academic_data()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
BEGIN
  result := jsonb_build_object(
    'departments', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'code', code)), '[]'::jsonb) FROM public.departments WHERE deleted_at IS NULL),
    'programmes', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'department_id', department_id, 'name', name, 'code', code)), '[]'::jsonb) FROM public.programmes WHERE deleted_at IS NULL),
    'academic_years', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'label', label, 'is_current', is_current)), '[]'::jsonb) FROM public.academic_years),
    'years_of_study', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'level', level)), '[]'::jsonb) FROM public.years_of_study),
    'semesters', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'programme_id', programme_id, 'academic_year_id', academic_year_id, 'year_of_study_id', year_of_study_id, 'number', number, 'name', name)), '[]'::jsonb) FROM public.semesters),
    'divisions', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'semester_id', semester_id, 'name', name)), '[]'::jsonb) FROM public.divisions)
  );
  RETURN result;
END;
$$;
