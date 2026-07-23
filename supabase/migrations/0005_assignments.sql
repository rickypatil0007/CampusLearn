-- ============================================================================
-- 0005: Assignment Module
-- ============================================================================

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  instructions text,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  max_marks numeric not null default 100,
  due_at timestamptz not null,
  allow_multiple_files boolean not null default true,
  allow_resubmission boolean not null default false,
  late_submission_allowed boolean not null default false,
  late_penalty_fraction numeric default 0,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index assignments_subject_idx on public.assignments(subject_id);

create table public.assignment_attachments (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  file_path text not null,
  original_filename text not null,
  file_size_bytes bigint not null,
  created_at timestamptz not null default now()
);

create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status public.assignment_submission_status not null default 'not_started',
  submitted_at timestamptz,
  marks_obtained numeric,
  graded_by uuid references public.profiles(id),
  graded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);
create index assignment_submissions_student_idx on public.assignment_submissions(student_id);

create table public.assignment_submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.assignment_submissions(id) on delete cascade,
  file_path text not null,
  original_filename text not null,
  file_size_bytes bigint not null,
  created_at timestamptz not null default now()
);

create table public.assignment_feedback (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.assignment_submissions(id) on delete cascade,
  faculty_id uuid not null references public.profiles(id),
  comment text not null,
  created_at timestamptz not null default now()
);
