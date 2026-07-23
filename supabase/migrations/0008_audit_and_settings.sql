-- ============================================================================
-- 0008: Audit logs + institution settings
-- ============================================================================

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null, -- e.g. 'role_change', 'resource_approve', 'quiz_publish'
  target_table text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_actor_idx on public.audit_logs(actor_id);
create index audit_logs_action_idx on public.audit_logs(action);

create table public.institution_settings (
  id uuid primary key default gen_random_uuid(),
  ai_features_enabled boolean not null default true,
  max_upload_size_mb int not null default 25,
  ai_requests_per_user_per_day int not null default 30,
  allowed_email_domain text not null default 'tcetmumbai.in',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
