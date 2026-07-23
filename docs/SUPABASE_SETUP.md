# Supabase Setup

## 1. Create a project
Create a new project at https://supabase.com/dashboard. Note the project URL and API keys
(`Project Settings → API`) for your `.env.local`.

## 2. Enable required extensions
The first migration (`0001_extensions_and_enums.sql`) enables these, but if running manually, ensure your project
has:
- `pgcrypto` (UUID generation)
- `pg_trgm` (search)
- `vector` (pgvector, for AI document embeddings)

## 3. Apply migrations
Run every file in `supabase/migrations/` **in numeric order** — either via `npx supabase db push` (after
`supabase link`) or by pasting each into the SQL Editor. They are idempotent-ish but not designed to be re-run out
of order; apply them once, in sequence.

The migrations create:
- The full schema (46 tables) — academic structure, resources, quizzes, assignments, announcements, discussions,
  notifications, study plans, AI generation/usage logs, audit logs
- Row-Level Security policies on every table
- The `handle_new_user` trigger (provisions a `profiles` row + `student` role on every `auth.users` insert, and
  independently re-validates the `@tcetmumbai.in` domain server-side)
- The `assign_role` function (the only sanctioned path for role changes)
- Storage buckets (all private) and their access policies
- The `match_document_chunks` pgvector similarity-search function used by the RAG assistant

## 4. Configure Auth
In `Authentication → Settings`:
- Enable **Email** provider with **Confirm email** turned on (required — accounts must verify before use)
- Set the **Site URL** to your deployed app URL (or `http://localhost:3000` for local dev)
- Add your production and preview URLs to **Redirect URLs** (needed for the email-verification and
  password-reset links to return to the right place — see `emailRedirectTo` / `redirectTo` in
  `src/app/auth/actions.ts`)
- (Recommended) Customize the confirmation and reset-password email templates with CampusLearn branding

## 5. Storage buckets
Created automatically by `0011_storage.sql`: `resources`, `assignments`, `submissions`, `avatars`, `syllabus`,
`announcements` — all **private**. The app issues short-lived signed URLs after an authorization check; nothing is
served from a public bucket URL.

## 6. Create the Super Administrator
Public registration always creates a `student` account. To get your first Super Administrator:
- **Option A (recommended for a fresh project):** run `npm run seed` (development only — creates a full demo
  dataset including a Super Admin using `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD` from `.env.local`).
- **Option B (production):** register normally with your `@tcetmumbai.in` email, then in the Supabase SQL Editor:
  ```sql
  update public.profiles set role = 'super_admin' where email = 'you@tcetmumbai.in';
  insert into public.user_roles (user_id, role) select id, 'super_admin' from public.profiles where email = 'you@tcetmumbai.in';
  ```
  This is the one deliberate manual/dashboard step the spec calls for — every other role change goes through the
  `assign_role` function from the app.

## 7. Institution settings row
Insert one row so the admin Settings page and AI rate limiting have defaults to read/write:
```sql
insert into public.institution_settings (ai_features_enabled, max_upload_size_mb, ai_requests_per_user_per_day, allowed_email_domain)
values (true, 95, 30, 'tcetmumbai.in');
```
(`npm run seed` does this for you.)

## 8. Migrations 0019–0022 (Faculty Management / multi-class uploads / email verification)
If this project already has `0001`–`0018` applied, running `npx supabase db push` applies only the four new
migrations. See `MIGRATION_NOTES.md` for the exact commands and the manual dashboard steps that go with
them (SMTP configuration, verification link expiry, confirming the `resources` bucket's raised size limit).

## 9. Optional: Upstash Redis for distributed rate limiting
Create a free Redis database at [upstash.com](https://upstash.com), then set `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN` in your environment. Without these, `src/lib/rate-limit/index.ts` falls back to
an in-memory limiter that does not share state across concurrent Vercel serverless instances.
