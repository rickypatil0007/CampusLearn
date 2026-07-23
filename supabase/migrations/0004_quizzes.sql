-- ============================================================================
-- 0004: Quiz & Assessment Module
-- ============================================================================

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  instructions text,
  status public.quiz_status not null default 'draft',
  start_at timestamptz,
  due_at timestamptz,
  time_limit_minutes int,
  max_attempts int not null default 1 check (max_attempts > 0),
  passing_marks numeric,
  randomize_questions boolean not null default false,
  randomize_options boolean not null default false,
  immediate_results boolean not null default true,
  negative_marking boolean not null default false,
  negative_marking_fraction numeric default 0.25,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (due_at is null or start_at is null or due_at > start_at)
);
create index quizzes_subject_idx on public.quizzes(subject_id);
create index quizzes_status_idx on public.quizzes(status);

create table public.quiz_units (
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  primary key (quiz_id, unit_id)
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes(id) on delete cascade, -- null when part of a reusable question bank only
  subject_id uuid not null references public.subjects(id) on delete cascade,
  topic_id uuid references public.topics(id),
  question_type public.question_type not null,
  prompt text not null,
  explanation text,
  marks numeric not null default 1,
  difficulty public.difficulty_level not null default 'medium',
  sequence int not null default 1,
  is_ai_generated boolean not null default false,
  ai_generation_id uuid,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quiz_questions_quiz_idx on public.quiz_questions(quiz_id);
create index quiz_questions_bank_idx on public.quiz_questions(subject_id, topic_id) where quiz_id is null;

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  sequence int not null default 1,
  created_at timestamptz not null default now()
);
create index question_options_question_idx on public.question_options(question_id);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  attempt_number int not null default 1,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  auto_submitted boolean not null default false,
  time_taken_seconds int,
  created_at timestamptz not null default now(),
  unique (quiz_id, student_id, attempt_number)
);
create index quiz_attempts_student_idx on public.quiz_attempts(student_id);

create table public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  selected_option_ids uuid[], -- for mcq_single/mcq_multiple/true_false
  free_text_answer text, -- for fill_blank/short_answer/descriptive
  is_correct boolean, -- computed server-side on submit; null until graded
  marks_awarded numeric,
  reviewed_by uuid references public.profiles(id), -- descriptive answers need manual review
  reviewer_comment text,
  updated_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create table public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade unique,
  total_marks numeric not null,
  marks_obtained numeric not null,
  accuracy numeric, -- percentage
  passed boolean,
  weak_topic_ids uuid[],
  strong_topic_ids uuid[],
  created_at timestamptz not null default now()
);
