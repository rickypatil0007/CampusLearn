# Security Notes

This document maps the spec's security requirements to where they're implemented.

## Institutional email restriction
Enforced in three independent layers (`src/lib/auth/email-domain.ts` is the single source of truth for the rule
itself):
1. Client-side form validation (`registerSchema` in `src/lib/validation/auth.ts`)
2. Server Action (`registerAction` in `src/app/auth/actions.ts`) — re-validates independently of the client
3. Postgres trigger `handle_new_user` (`supabase/migrations/0009_functions_and_triggers.sql`) — re-validates again
   and raises an exception if bypassed, so even a direct Supabase Admin API call can't create an invalid account

## Authorization
- Every Server Action and Route Handler calls `requireUser()` / `requirePermission()` / `requireRoleOrRedirect()`
  (`src/lib/auth/session.ts`), which **always re-reads the caller's role from the `profiles` table** — never from a
  client-supplied value, cookie, or JWT custom claim.
- The centralized permission matrix lives in `src/lib/permissions/permissions.ts` — one file defines who can do
  what; nothing re-implements role checks ad hoc.
- Row-Level Security policies (`supabase/migrations/0010_row_level_security.sql`) enforce the same rules
  independently at the database layer, so a bug in application code cannot leak or corrupt data.
- Role changes only happen through the `assign_role` Postgres function, which re-checks the **caller's** current
  role (not anything client-supplied) before allowing a change, and blocks self-role-changes at the Server Action
  layer (`assignRoleAction` in `src/app/(app)/admin/_actions/academic.ts`).

## Quiz integrity
- `quiz_questions`/`question_options` RLS policies restrict students to published quizzes and never expose
  `is_correct` through the student-facing query path (`src/app/(app)/quizzes/[quizId]/attempt/page.tsx` selects only
  `option_text`, never `is_correct`).
- Scoring happens exclusively server-side (`submitAttemptAction` → `scoreQuizAttempt`,
  `src/lib/quiz/scoring.ts`) using option correctness fetched fresh from the database at submission time.
- Attempt eligibility (published status, deadline, max attempts) is re-checked server-side on every attempt start
  (`checkAttemptEligibility`, `src/lib/quiz/rules.ts`) — a client cannot start an extra attempt by replaying a
  request.

## File security
- All storage buckets are private (`supabase/migrations/0011_storage.sql`); files are served only via short-lived
  signed URLs generated server-side after an authorization check (`getResourceDownloadUrlAction`,
  `getSubmissionFileUrlAction`).
- Uploads are validated server-side on MIME type, extension, and size (`isAllowedUploadFile`,
  `src/lib/validation/resources.ts`), and filenames are sanitized (`sanitizeFilename`) before storage.
- Executable-style extensions are explicitly rejected.

## AI / prompt-injection defenses
- Retrieval permission-filtering happens **before** the vector search (`getAllowedResourceIds` computes the allowed
  `resource_id` set, then `match_document_chunks` takes it as a SQL `WHERE ... = ANY($allowed)` parameter — not a
  post-filter), so the assistant cannot even retrieve chunks from unauthorized resources.
- Document text is explicitly framed as untrusted data in the system prompt (`src/lib/ai/rag.ts`), with instructions
  to never follow embedded commands, never reveal the system prompt, API keys, or other users' data.
- A fixed fallback message is used when retrieval confidence is insufficient, rather than letting the model guess.
- AI requests are rate-limited per user (`src/lib/rate-limit/index.ts`) and usage/token counts are logged
  (`ai_usage_logs`) for the admin AI-usage dashboard. Administrators can disable AI features institution-wide via
  Settings.
- The AI quiz-question generator produces **drafts only** — nothing is written to `quiz_questions` until Faculty
  explicitly reviews and adds each question through the normal (non-AI) `addQuestionAction` path.

## General web security
- CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and a restrictive
  `Permissions-Policy` are set in `next.config.ts`.
- All mutating Server Actions validate input with Zod schemas centralized in `src/lib/validation/`.
- Rate limiting is applied to login, registration, and password-reset requests
  (`src/lib/rate-limit/index.ts`, `RATE_LIMITS`).
- Sensitive actions (role changes, suspensions, resource approvals/deletions, grade changes, quiz publication,
  settings changes) are written to `audit_logs`.
- Error messages returned to the client are generic/safe; detailed errors are not leaked (Supabase/Postgres error
  messages are currently passed through in a few Server Action error paths for developer convenience during this
  build — see `docs/LIMITATIONS.md` for the note on hardening this further before production use).

## Faculty Management / multi-class upload / RLS audit pass (this update)
- `class_teacher_assignments` and `class_representative_assignments` had **no Row-Level Security enabled at
  all** since they were introduced — closed in migration `0022`. See `CHANGELOG.md` for detail.
- `resources` and `announcements` had **no class/target-scope filtering** in their `SELECT` RLS policies —
  every approved row was visible to every authenticated user regardless of subject/division/department.
  Both are now scoped (with a documented fallback for pre-existing rows that predate scoping) in `0022`.
- CR announcement creation now has a database-level `WITH CHECK` (not just the Server Action) verifying the
  submitted target scope exactly matches the CR's own active `class_representative_assignments` row, so even
  a compromised/bypassed Server Action cannot insert an announcement targeting another class.
- Multi-file uploads are re-authorized twice server-side: once when signed upload URLs are issued
  (`createUploadBatchAction`), and again at finalize time (`finalizeUploadBatchAction`), since an assignment
  could theoretically be revoked in between. The `finalize_resource_upload_batch` Postgres function performs
  a third, independent authorization check as the actual write path, per the "recheck at finalization time"
  requirement.
- `MAX_UPLOAD_SIZE_MB` default raised from 20MB to 95MB; both file extension and MIME type must independently
  pass the whitelist AND match each other's expected pairing (`isAllowedUploadFile` in
  `src/lib/validation/resources.ts`), rejecting a renamed executable or a spoofed content-type.

## What this does NOT include (see `docs/LIMITATIONS.md` for the full list)
CSRF tokens beyond Next.js's built-in Server Action origin checks and a Web Application Firewall are out of
scope. Rate limiting now supports a distributed Upstash Redis backend (set `UPSTASH_REDIS_REST_URL` /
`UPSTASH_REDIS_REST_TOKEN`) with an in-memory fallback if unset — see `docs/LIMITATIONS.md` for what that
fallback does and doesn't protect against.
