-- ============================================================================
-- 0006: Announcements + Discussion/Doubt Forum
-- ============================================================================

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  target_department_id uuid references public.departments(id),
  target_semester_id uuid references public.semesters(id),
  target_division_id uuid references public.divisions(id),
  target_subject_id uuid references public.subjects(id),
  priority public.announcement_priority not null default 'normal',
  attachment_path text,
  publish_at timestamptz not null default now(),
  expires_at timestamptz,
  approval_status public.approval_status not null default 'approved', -- CR submissions start 'pending'
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index announcements_publish_idx on public.announcements(publish_at desc);

create table public.discussions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  body text not null,
  created_by uuid not null references public.profiles(id),
  is_reported boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index discussions_subject_idx on public.discussions(subject_id);
create index discussions_search_idx on public.discussions using gin (to_tsvector('english', title || ' ' || body));

create table public.discussion_replies (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  parent_reply_id uuid references public.discussion_replies(id) on delete cascade,
  body text not null,
  created_by uuid not null references public.profiles(id),
  is_faculty_verified boolean not null default false,
  is_accepted boolean not null default false,
  is_reported boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index discussion_replies_discussion_idx on public.discussion_replies(discussion_id);

create table public.discussion_votes (
  id uuid primary key default gen_random_uuid(),
  reply_id uuid not null references public.discussion_replies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (reply_id, user_id)
);
