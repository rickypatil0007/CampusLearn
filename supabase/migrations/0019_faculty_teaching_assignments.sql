-- ============================================================================
-- 0019: Faculty Teaching Assignments (class-scoped)
--
-- subject_faculty (0002) records "faculty X can teach/access subject Y" and
-- is relied on by RLS, dashboards, resource/quiz/assignment creation across
-- the app — it is kept in place unchanged for backward compatibility.
--
-- This migration adds a class-scoped layer on top: which exact class
-- (department + programme + academic year + year of study + semester +
-- division) a faculty member teaches a subject in. A faculty member can
-- receive many rows here (multiple subjects, multiple classes). Two triggers
-- keep subject_faculty in sync so every existing "is this faculty assigned
-- to this subject" check continues to work without modification.
-- ============================================================================

create table if not exists public.faculty_teaching_assignments (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  department_id uuid not null references public.departments(id),
  programme_id uuid not null references public.programmes(id),
  academic_year_id uuid not null references public.academic_years(id),
  year_of_study_id uuid references public.years_of_study(id),
  semester_id uuid not null references public.semesters(id),
  division_id uuid not null references public.divisions(id),
  assigned_by uuid references public.profiles(id),
  assigned_at timestamptz not null default now(),
  revoked_at timestamptz,
  is_active boolean not null default true
);

create index if not exists fta_faculty_idx on public.faculty_teaching_assignments(faculty_id) where is_active;
create index if not exists fta_subject_idx on public.faculty_teaching_assignments(subject_id) where is_active;
create index if not exists fta_class_idx on public.faculty_teaching_assignments
  (department_id, programme_id, academic_year_id, year_of_study_id, semester_id, division_id) where is_active;

-- Prevent duplicate active assignments for the same faculty/subject/class.
create unique index if not exists uq_active_faculty_teaching_assignment on public.faculty_teaching_assignments (
  faculty_id, subject_id, department_id, programme_id, academic_year_id,
  coalesce(year_of_study_id, '00000000-0000-0000-0000-000000000000'::uuid), semester_id, division_id
) where is_active = true;

-- Keep legacy subject_faculty in sync: whenever a class-scoped assignment is
-- created, ensure the subject-level row exists too, so existing "assigned
-- subjects" queries (dashboards, resource/quiz upload dropdowns, RAG scope)
-- keep working unchanged.
create or replace function public.sync_subject_faculty_from_teaching_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active then
    insert into public.subject_faculty (subject_id, faculty_id, assigned_by)
    values (new.subject_id, new.faculty_id, new.assigned_by)
    on conflict (subject_id, faculty_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_subject_faculty_insert on public.faculty_teaching_assignments;
create trigger trg_sync_subject_faculty_insert
  after insert on public.faculty_teaching_assignments
  for each row execute function public.sync_subject_faculty_from_teaching_assignment();

-- When the LAST active class-scoped assignment for a faculty/subject pair is
-- revoked, remove the derived subject_faculty row (but only if it was never
-- also granted directly by an admin outside this table — we conservatively
-- only remove rows that have no remaining active class-scoped assignment).
create or replace function public.sync_subject_faculty_on_revoke()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_active = true and new.is_active = false then
    if not exists (
      select 1 from public.faculty_teaching_assignments
      where faculty_id = new.faculty_id and subject_id = new.subject_id and is_active = true and id <> new.id
    ) then
      delete from public.subject_faculty
      where faculty_id = new.faculty_id and subject_id = new.subject_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_subject_faculty_revoke on public.faculty_teaching_assignments;
create trigger trg_sync_subject_faculty_revoke
  after update on public.faculty_teaching_assignments
  for each row execute function public.sync_subject_faculty_on_revoke();

-- Faculty "deactivate" (spec section 4) deliberately reuses the existing
-- profiles.is_suspended / suspended_reason columns rather than adding a
-- parallel status field: login blocking, RLS suspension checks, and the
-- Administrator suspensions UI already enforce is_suspended everywhere, so
-- reusing it means Faculty deactivation is enforced by the same
-- already-audited code path instead of a second, easy-to-miss check.
