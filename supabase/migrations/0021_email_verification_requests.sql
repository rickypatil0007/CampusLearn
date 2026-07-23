-- ============================================================================
-- 0021: Durable email verification / resend cooldown state
--
-- Replaces any in-memory or browser-only resend throttling with a row in
-- Postgres keyed by normalized email, so the 60-second cooldown holds across
-- serverless cold starts and concurrent Vercel function instances (spec
-- section 6.5). RLS is intentionally NOT granted to the authenticated role —
-- this table is only ever touched by the server via the service-role
-- client, since resend must work for a not-yet-authenticated user.
-- ============================================================================

create table if not exists public.email_verification_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  last_requested_at timestamptz not null default now(),
  next_allowed_at timestamptz not null default now(),
  request_count int not null default 1,
  last_status text not null default 'sent' check (last_status in ('sent','rate_limited','provider_error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email = lower(trim(email)))
);
create index if not exists email_verification_requests_next_allowed_idx on public.email_verification_requests(next_allowed_at);

alter table public.email_verification_requests enable row level security;
-- No policies for authenticated/anon: only the service-role client (which
-- bypasses RLS) reads/writes this table, from resendVerificationAction and
-- registerAction. This intentionally prevents any client from ever reading
-- another user's cooldown/status directly, avoiding email enumeration.

comment on table public.email_verification_requests is
  'Durable server-side state for the 60s resend cooldown (spec 6.5). Never exposed to the browser directly.';
