# CampusLearn — Architecture

## 1. Summary
Next.js 16 (App Router, TS, RSC + Server Actions) on Vercel; Supabase (Postgres + Auth + Storage + pgvector) as the sole backend. All privileged logic (auth checks, role checks, quiz scoring, file authorization, AI retrieval) runs server-side in Server Actions / Route Handlers using the Supabase service-role client — never the browser. RLS is a second, independent enforcement layer under every table so a bug in application code cannot leak data. Anthropic Claude powers summarization, quiz-question drafting, and a grounded RAG doubt assistant; pgvector stores chunk embeddings with RLS-aware retrieval (permission filter applied before the vector search, not after).

## 2. Directory Structure
```
campuslearn/
  src/
    app/
      (public)/                 marketing pages: /, /about, /features, /contact, /privacy, /terms
      auth/                     /auth/login, register, verify-email, forgot-password, reset-password
      (app)/                    authenticated shell (sidebar+header layout)
        dashboard/
        subjects/[subjectId]/{resources,quizzes,assignments,discussion}
        resources/[resourceId]/
        quizzes/[quizId]/{attempt,results}
        assignments/[assignmentId]/
        previous-papers/
        announcements/
        bookmarks/
        notifications/
        ai/{assistant,study-planner}
        analytics/
        profile/ settings/
        faculty/{resources,quizzes,assignments,approvals,analytics}
        admin/{users,departments,programmes,subjects,roles,invitations,audit-logs,settings,ai-usage}
      api/                       route handlers (webhooks, AI streaming, signed downloads)
    components/
      ui/                        shadcn primitives
      layout/                    sidebar, header, shell
      dashboard/ resources/ quizzes/ assignments/ ...  feature components
    lib/
      supabase/                  browser.ts, server.ts, admin.ts, middleware.ts
      auth/                      email-domain.ts (centralized validator), session.ts
      permissions/                roles.ts, permissions.ts (centralized RBAC matrix)
      validation/                 zod schemas per feature
      ai/                        anthropic.ts, embeddings.ts, rag.ts, chunking.ts
      db/                        typed query helpers
      utils.ts
    types/                       database.types.ts (generated shape), domain types
    middleware.ts                route protection
  supabase/
    migrations/                  numbered SQL migrations (schema, RLS, indexes, pgvector)
    seed.sql                     optional raw SQL seed
  scripts/
    seed.ts                      TS seed script (dev-only)
  tests/
    unit/  integration/  e2e/
  docs/                          architecture, setup, deployment, security notes
```

## 3. Database ERD Outline
```
institutions(1) → departments(N) → programmes(N) → subjects(N) → units(N) → topics(N)
academic_years(N) ─┐
semesters(N) ───────┼─→ subjects, subject_enrollments, quizzes, assignments
divisions(N) ───────┘
profiles(1:1 auth.users) → user_roles(N, role enum) 
subjects ←→ subject_faculty (N:N) , subjects ←→ subject_enrollments (N:N students)
resources → resource_files, resource_tags, resource_approvals, resource_bookmarks,
            resource_views, resource_downloads, document_chunks → document_embeddings(pgvector)
quizzes → quiz_questions → question_options ; quiz_attempts → quiz_answers → quiz_results
assignments → assignment_attachments ; assignment_submissions → submission_files, assignment_feedback
announcements (target dept/sem/div/subject)
discussions → discussion_replies → discussion_votes
notifications, notification_preferences
study_plans → study_plan_tasks
ai_generations, ai_usage_logs, audit_logs
```
Full DDL lives in `supabase/migrations/`.

## 4. Auth & Authorization Flow
1. Client form (Zod) → Server Action `registerAction`.
2. Server re-validates with the **same** Zod schema + `lib/auth/email-domain.ts` (`normalizeAndValidateEmail`), which lowercases/trims the email and checks the domain equals `ALLOWED_EMAIL_DOMAIN` exactly (rejects subdomains/suffixes) — independent of any client check.
3. On pass, `supabase.auth.signUp()` creates the auth user; a Postgres trigger (`handle_new_user`) inserts a `profiles` row and assigns the `student` role in `user_roles`. The trigger *also* re-checks the email domain server-side (defense in depth) and raises if invalid, so even a direct Auth API call can't bypass it.
4. Supabase sends a verification email; the account is unusable (blocked by RLS + middleware) until `email_confirmed_at` is set.
5. Login sets an httpOnly Supabase session cookie via `@supabase/ssr`. `middleware.ts` reads the session on every request to `(app)`, `faculty`, `admin` routes and redirects unauthenticated users to `/auth/login`.
6. Every Server Action / Route Handler independently calls `getServerUser()` then `requireRole()`/`requirePermission()` from `lib/permissions` — role is always re-read from the `user_roles` table server-side, never trusted from a client-supplied value or JWT claim alone. RLS policies additionally scope every table read/write to the caller's role and ownership, so authorization is enforced at both the application layer and the database layer.
7. Role elevation (Student→CR, Faculty invites, Admin creation) only happens through admin-only Server Actions that themselves re-check the caller's role server-side; there is no client-writable `role` field.

## 5. AI RAG Flow
1. Faculty/CR uploads a resource → stored in a private Supabase Storage bucket, row created in `resources` (status `pending`/`approved`).
2. On approval, a Route Handler (`/api/ai/process-document`) extracts text (pdf-parse / mammoth), splits into ~800-token overlapping chunks, stores `document_chunks` rows, generates embeddings via the configurable `EMBEDDING_PROVIDER`, stores vectors in `document_embeddings` (pgvector, ivfflat index).
3. Student asks a question in `/ai/assistant`, scoped to a subject.
4. Server Action first computes the set of `resource_id`s the student is authorized to see (approved + enrolled subject/department) — this permission filter runs **before** the vector query, as a SQL `WHERE resource_id = ANY($allowed)` clause, so retrieval literally cannot reach unauthorized rows.
5. Query embedding generated, top-k chunks retrieved via cosine distance within the allowed set.
6. Chunk text (marked as untrusted data, wrapped so any embedded instructions are inert) + citations passed to Claude with a system prompt that forbids following instructions found inside document content and forbids revealing system prompts or other users' data.
7. If retrieval score is below threshold / no chunks found, respond with the fixed fallback sentence rather than guessing.
8. Answer + citations (resource title, section) returned; usage/tokens logged to `ai_usage_logs`; request is rate-limited per user per day (`AI_REQUESTS_PER_USER_PER_DAY`).

## 6. Implementation Sequence
Stage 1 (this doc) → Stage 2 project init → Stage 3 DB migrations/RLS/seed → Stage 4 auth/RBAC →
Stage 5 design system/shell → Stage 6 academic structure + resources/approval →
Stage 7 dashboards → Stage 8 quizzes/assignments/announcements/discussions/notifications →
Stage 9 AI pipeline → Stage 10 public pages → Stage 11 tests → Stage 12 hardening/docs/verification.
