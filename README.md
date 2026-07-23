# CampusLearn

**One campus. One learning platform.**

CampusLearn is the centralized academic learning portal for Thakur College of Engineering and Technology (TCET) —
notes, assignments, quizzes, previous-year papers, announcements, discussion forums, AI-assisted study tools, and
performance analytics, with role-based access for Students, Class Representatives, Faculty, Department
Administrators, and Super Administrators.

This is a full-stack, database-backed application — not a static mockup. Every dashboard, workflow, and permission
check described below is implemented against a real Postgres schema with Row-Level Security, real Server Actions,
and real authentication.

> **This repository has gone through several update passes** since the original build (Student ID registration,
> four login portals, Class Teacher/CR management, and — most recently — Faculty Management, multi-file/multi-class
> uploads, a durable email verification cooldown, and an RLS audit). See [`CHANGELOG.md`](CHANGELOG.md) for the
> latest pass specifically, [`MIGRATION_NOTES.md`](MIGRATION_NOTES.md) for exact commands to bring a Supabase
> project up to date, and [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) for what remains unverified against live
> infrastructure in whichever session produced the code you're looking at.

## Tech stack

- **Framework**: Next.js 16 (App Router, TypeScript, React Server Components, Server Actions)
- **Styling**: Tailwind CSS v4 + shadcn/ui-style components, dark/lime academic theme
- **Backend**: Supabase (Postgres, Auth, Storage, pgvector)
- **Forms/validation**: React Hook Form + Zod (schemas centralized in `src/lib/validation/`)
- **AI**: Anthropic Claude (summarization, quiz drafting, grounded RAG assistant) + a configurable embedding provider
- **Charts**: Recharts (analytics)
- **Tests**: Vitest (unit/integration), Playwright (E2E)

## What's implemented

**Fully implemented, end-to-end, against the real schema:**
- Authentication (sign up, email verification, login, logout, forgot/reset password, rate limiting, "remember me")
- Server-enforced `@tcetmumbai.in` registration restriction (client + Server Action + database trigger — three
  independent layers)
- Role-based access control (5 roles) enforced in Server Actions, Route Handlers, and Postgres RLS policies
- Academic structure management (departments, programmes, academic years, semesters, divisions, subjects, units,
  topics)
- Resource Library with upload, CR-submission → Faculty-approval workflow, tags, bookmarks, view/download tracking,
  signed private-storage downloads
- Quizzes: Faculty question builder (MCQ single/multiple, true/false), publish workflow, student attempt flow with
  timer + autosave + confirm-to-submit, **server-side scoring** (answers are never sent to the client before
  submission), attempt-limit and deadline enforcement, results view
- Assignments: Faculty creation, student multi-file submission with late/resubmission rules, Faculty grading with
  feedback (students cannot write their own marks — enforced by RLS)
- Announcements (Faculty/Admin publish directly; CR submissions require approval), Discussion forum (post, reply,
  upvote, Faculty-verified/accepted answers, report), Notifications, Bookmarks, Previous-Year Papers
- Role-specific dashboards (Student, Class Rep, Faculty, Admin) pulling live counts/aggregates from the database,
  with empty states when there's no data — never hard-coded numbers
- Admin console: users, role assignment (server-validated, self-elevation blocked), departments, programmes,
  subjects, staff invitations, audit log, institution settings, AI usage
- AI pipeline (code-complete): document text extraction (PDF/DOCX/TXT), chunking, embeddings, pgvector storage and
  retrieval with **permission filtering applied before the vector search** (not after), a grounded assistant with
  citations and a fixed low-confidence fallback message, an AI note summarizer with caching, and a Faculty-only
  AI quiz-draft generator (drafts only — Faculty must explicitly add each question; the AI never publishes)
- Public marketing site (landing, features, about, contact, privacy, terms) in the same dark/lime visual language
- Security headers, CSP, rate limiting, audit logging, signed file URLs, input validation everywhere

**Requires your own credentials to actually run/verify** (code is complete, but untestable without them here):
AI features need `ANTHROPIC_API_KEY` and `EMBEDDING_API_KEY`; everything needs a real `NEXT_PUBLIC_SUPABASE_URL` /
keys. See [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) for the full, honest list of what was not (and could not be)
exercised in this environment.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in your Supabase + Anthropic + embedding keys
```

Then follow, in order:
1. [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) — create the project, run migrations, configure storage/auth
2. [`docs/SETUP.md`](docs/SETUP.md) — local development
3. [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — deploying to Vercel
4. [`docs/TESTING.md`](docs/TESTING.md) — running the test suites
5. [`docs/SECURITY.md`](docs/SECURITY.md) — security measures implemented
6. [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) — known limitations, read this before demoing

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` / `npm start` | Production build / start |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest unit + integration tests |
| `npm run test:e2e` | Playwright E2E tests (needs a running app + seeded DB) |
| `npm run seed` | **Development-only** demo data seed — see the warning in `scripts/seed.ts` |

## Project structure

```
src/
  app/
    (public)/        marketing site — /, /about, /features, /contact, /privacy, /terms
    auth/             /auth/login, register, verify-email, forgot-password, reset-password
    (app)/            authenticated app shell (sidebar + header)
      dashboard, subjects, resources, quizzes, assignments, previous-papers,
      announcements, bookmarks, notifications, discussions, ai, analytics,
      profile, settings, faculty/*, admin/*
    api/ai/           AI route handlers (process-document, summarize, assistant, quiz-draft, study-plan)
  components/         ui/ (design system), layout/, dashboard/, resources/, quizzes/, assignments/, discussions/, marketing/
  lib/
    supabase/         browser/server/admin clients + middleware session refresh
    auth/             email-domain validator (the single source of truth), session helpers
    permissions/      centralized role + permission matrix
    validation/       all Zod schemas
    ai/               Anthropic client, embeddings, chunking, document extraction, RAG retrieval
    quiz/, assignments/, resources/   pure, unit-tested business rules
supabase/migrations/  numbered SQL migrations: schema, RLS, functions/triggers, storage, vector search
scripts/seed.ts        development-only demo data
tests/                 unit/, integration/, e2e/
docs/                  architecture, setup, deployment, security, testing, limitations
```

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full architecture summary, directory structure rationale,
database ERD outline, authentication/authorization flow, and the AI RAG pipeline flow — written before
implementation began (Stage 1 of this build).
