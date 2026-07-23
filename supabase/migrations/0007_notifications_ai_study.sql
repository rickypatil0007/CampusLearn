-- ============================================================================
-- 0007: Notifications, Study Plans, AI generations & usage
-- ============================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, is_read);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_enabled boolean not null default true,
  resource_updates boolean not null default true,
  quiz_updates boolean not null default true,
  assignment_updates boolean not null default true,
  announcement_updates boolean not null default true,
  discussion_updates boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.study_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  exam_date date,
  daily_hours numeric,
  preferred_days text[],
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.study_plan_tasks (
  id uuid primary key default gen_random_uuid(),
  study_plan_id uuid not null references public.study_plans(id) on delete cascade,
  subject_id uuid references public.subjects(id),
  topic_id uuid references public.topics(id),
  task_type text not null default 'topic_review', -- topic_review | revision | quiz_session | assignment | mock_test
  title text not null,
  scheduled_date date not null,
  duration_minutes int not null default 60,
  is_complete boolean not null default false,
  sequence int not null default 1,
  created_at timestamptz not null default now()
);
create index study_plan_tasks_plan_idx on public.study_plan_tasks(study_plan_id);

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  generation_type text not null, -- summary | flashcards | quiz_draft | rag_answer | study_plan
  resource_id uuid references public.resources(id),
  quiz_id uuid references public.quizzes(id),
  input_params jsonb,
  output jsonb,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);
create index ai_generations_resource_idx on public.ai_generations(resource_id);
create index ai_generations_user_idx on public.ai_generations(user_id);

create table public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  feature text not null, -- summarizer | quiz_generator | rag_assistant | study_planner
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  estimated_cost_usd numeric(10,5) not null default 0,
  created_at timestamptz not null default now()
);
create index ai_usage_logs_user_idx on public.ai_usage_logs(user_id, created_at);
