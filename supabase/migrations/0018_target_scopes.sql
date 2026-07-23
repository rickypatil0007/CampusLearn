-- ============================================================================
-- 0018: Target Scopes for Quizzes, Announcements, and Resources
-- ============================================================================

-- 1. Add target columns to quizzes
alter table public.quizzes
  add column target_department_id uuid references public.departments(id),
  add column target_programme_id uuid references public.programmes(id),
  add column target_academic_year_id uuid references public.academic_years(id),
  add column target_year_of_study_id uuid references public.years_of_study(id),
  add column target_semester_id uuid references public.semesters(id),
  add column target_division_id uuid references public.divisions(id);

-- 2. Add target columns to announcements to complete the hierarchy
alter table public.announcements
  add column target_programme_id uuid references public.programmes(id),
  add column target_academic_year_id uuid references public.academic_years(id),
  add column target_year_of_study_id uuid references public.years_of_study(id);

-- 3. We will enforce these to be provided together using a check constraint
-- if a division is targeted, all parent targets should ideally be present,
-- but since this is an application-level enforcement, we just leave them nullable.
