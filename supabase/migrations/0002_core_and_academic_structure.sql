-- ============================================================================
-- 0002: Core profiles/roles + academic structure
-- Institution -> Department -> Programme -> Academic Year -> Semester ->
-- Division -> Subject -> Unit -> Topic
-- ============================================================================

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Thakur College of Engineering and Technology',
  short_name text not null default 'TCET',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (institution_id, code)
);

create table public.programmes (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete cascade,
  name text not null,
  code text not null,
  duration_years int not null default 4 check (duration_years > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (department_id, code)
);

create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  label text not null unique, -- e.g. "2025-2026"
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_date > start_date)
);

create table public.semesters (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  number int not null check (number between 1 and 8),
  name text not null,
  created_at timestamptz not null default now(),
  unique (programme_id, academic_year_id, number)
);

create table public.divisions (
  id uuid primary key default gen_random_uuid(),
  semester_id uuid not null references public.semesters(id) on delete cascade,
  name text not null, -- e.g. "A", "B"
  created_at timestamptz not null default now(),
  unique (semester_id, name)
);

-- profiles: 1:1 with auth.users. role is the effective/current role used by
-- RLS and server-side checks. It is never writable by the authenticated
-- client role directly (see RLS policies in 0013) — only via SECURITY
-- DEFINER admin functions / service-role server actions.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role public.role_type not null default 'student',
  department_id uuid references public.departments(id),
  programme_id uuid references public.programmes(id),
  academic_year_id uuid references public.academic_years(id),
  semester_id uuid references public.semesters(id),
  division_id uuid references public.divisions(id),
  roll_number text,
  avatar_url text,
  is_suspended boolean not null default false,
  suspended_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email = lower(trim(email)))
);

create index profiles_role_idx on public.profiles(role);
create index profiles_department_idx on public.profiles(department_id);

-- Audit trail of role grants (who assigned what role, when, and any scope).
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.role_type not null,
  scope_department_id uuid references public.departments(id),
  scope_division_id uuid references public.divisions(id),
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index user_roles_user_idx on public.user_roles(user_id);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  description text,
  credits int not null default 3 check (credits > 0),
  department_id uuid not null references public.departments(id) on delete cascade,
  semester_id uuid not null references public.semesters(id) on delete cascade,
  syllabus_file_path text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (department_id, code, semester_id)
);
create index subjects_semester_idx on public.subjects(semester_id);

create table public.subject_faculty (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  faculty_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (subject_id, faculty_id)
);

create table public.subject_enrollments (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  division_id uuid references public.divisions(id),
  created_at timestamptz not null default now(),
  unique (subject_id, student_id)
);
create index subject_enrollments_student_idx on public.subject_enrollments(student_id);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  sequence int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  title text not null,
  sequence int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index units_subject_idx on public.units(subject_id);
create index topics_unit_idx on public.topics(unit_id);
