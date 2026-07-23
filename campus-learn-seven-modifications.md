# campus-learn-seven.vercel.app — Investigation & Modification Plan

> Investigated by fetching the live site directly (`/`, `/auth/register`, `/auth/login`, `/features`,
> `/auth/forgot-password`) on the date this document was generated. Browser-console/network inspection was not
> available in this session, so findings below are based on server-rendered HTML/content only — Phase 0 lists what
> that does and doesn't rule out.

---

## 0. What the live site currently is (findings)

**The good news: the site is up, deploys cleanly, and the marketing/static pages render correctly** — homepage,
`/features`, `/auth/forgot-password` all served real, well-formed content with no visible errors.

**The core problem: this deployment is running the *original* CampusLearn build, not the corrected/extended
version.** Concretely, comparing the live HTML against the spec:

| Observed on the live site | Spec requirement | Status |
|---|---|---|
| `/auth/register` has a single free-text **"Institutional email"** field | Student ID (`S` + 10 digits) with an auto-derived, read-only institutional email | ❌ Not deployed |
| `/auth/register` dropdowns: Department, Programme, **Academic year**, Semester, Division | Department, Programme, Academic **session**, **Year of Study**, Semester, Division | ❌ Missing Year of Study step |
| Register page shows: *"Academic structure has not been seeded yet... an administrator must add departments, programmes, semesters, and divisions"* | 11 departments/programmes + 2026–2027 session should be seeded | ❌ **Database is empty/unseeded** |
| `/auth/login` is a **single, generic login form** | Four separate portals: `/auth/login/student`, `/faculty`, `/cr`, `/admin` | ❌ Not deployed |
| `/features` copy still says *"CR-submission approval"* for announcements | CRs must never create/submit announcements at all | ❌ Old behavior description still live |
| No visible reference to 95MB uploads, Class Teacher assignment, or CR management anywhere in the public copy | Spec sections 10, 11, 13 | ❌ Not deployed |

**Root cause, in one sentence:** the Vercel project is deployed from the *original* repository state (or an
older commit), not from the corrected project that added Student ID registration, four login portals, Class
Teacher/CR management, and 95MB scoped uploads — **and** its connected Supabase project has no academic data
seeded, which is why registration shows an empty-state warning instead of working dropdowns.

**What this document does NOT rule out** (would need browser console/network access or dashboard access to confirm):
- Whether `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are even set in Vercel (an empty dropdown is
  consistent with either "no rows" or "the query silently failed") — Phase 1 covers checking this directly.
- Whether any of migrations `0001`–`0013` were ever applied to that Supabase project.
- Client-side JavaScript errors (React hydration errors, failed fetches) that wouldn't show up in server-rendered
  HTML — Phase 4 covers verifying this once the extension/dashboard is available.

---

## Phase 1 — Confirm and stabilize the current deployment's infrastructure

**Goal:** know exactly what's connected before changing anything.

1. In the Vercel project dashboard (`Settings → Environment Variables`), confirm these are set for the Production
   environment:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (marked Sensitive)
   - `NEXT_PUBLIC_APP_URL` = `https://campus-learn-seven.vercel.app`
   - `ALLOWED_EMAIL_DOMAIN=tcetmumbai.in`, `MAX_UPLOAD_SIZE_MB`, `AI_REQUESTS_PER_USER_PER_DAY`
   - `ANTHROPIC_API_KEY`, `EMBEDDING_PROVIDER`, `EMBEDDING_API_KEY` (only if AI features are wanted live)
2. In the Supabase dashboard for the linked project, open `Table Editor` and confirm whether `departments`,
   `programmes`, `academic_years`, `semesters`, `divisions` exist and have rows. Given the live registration page's
   empty-state message, the most likely finding is **zero rows**, and possibly that migrations were never run at
   all (check `supabase/migrations` history under `Database → Migrations` in the dashboard, or run
   `npx supabase migration list` locally against this project).
3. Decide, based on step 2: if migrations were never applied, this project needs the **full migration set from
   scratch** (Phase 2). If `0001`–`0013` are applied but nothing newer, it needs the **incremental Student ID/CR/
   portal migrations** (`0014`–`0018`) plus a redeploy of the corrected code (Phase 2–3).

**Exit criteria:** you know which of the two situations above you're in, and have Supabase dashboard + Vercel
dashboard access confirmed working.

---

## Phase 2 — Deploy the corrected codebase

**Goal:** replace whatever is currently deployed with the corrected project (Student ID registration, four login
portals, Class Teacher/CR management, 95MB scoped uploads, suspend/ban RPCs, notice scoping).

1. Push the corrected project (delivered separately as `campuslearn.zip` / its change log) to the GitHub repository
   that Vercel is building from — either as a new commit on the existing branch, or by pointing the Vercel project
   at a new repository/branch if you want a clean cutover.
2. Apply the database migrations against the **same Supabase project** this Vercel deployment uses:
   ```bash
   npx supabase login
   npx supabase link --project-ref <this-project's-ref>
   npx supabase db push
   ```
   This applies `0001`–`0018` in order; it's additive and safe whether `0001`–`0013` already exist or not.
3. Regenerate and commit `src/types/database.types.ts` against the real project (optional but recommended so the
   deployed build's types match the live schema exactly):
   ```bash
   npx supabase gen types typescript --project-id <project-ref> > src/types/database.types.ts
   ```
4. Trigger a redeploy in Vercel (push to the connected branch, or **Deployments → Redeploy** with "Use existing
   Build Cache" turned **off** so the new code and env vars are picked up cleanly).

**Exit criteria:** `campus-learn-seven.vercel.app/auth/register` shows Student ID + read-only generated email, and
`/auth/login` shows the four-portal picker (with `/auth/login/student`, `/faculty`, `/cr`, `/admin` all resolving).

---

## Phase 3 — Bootstrap and seed the academic structure

**Goal:** make the empty-dropdown problem disappear by populating real data, and get a working Super Administrator
account.

1. **Bootstrap the Super Administrator** (run locally or in CI, pointed at the production Supabase project —
   never commit the password):
   ```bash
   BOOTSTRAP_SUPER_ADMIN_EMAIL=alipatel5034@gmail.com \
   BOOTSTRAP_SUPER_ADMIN_PASSWORD='choose-a-strong-password' \
   npm run bootstrap:super-admin
   ```
2. **Seed the academic structure** (11 departments/programmes, 2026–2027 session, years of study, 8 semesters × 4
   divisions per programme) — this is what fills in the dropdowns the live site currently shows as empty:
   ```bash
   npm run seed
   ```
   ⚠️ `npm run seed` also creates several demo Faculty/Student/CR accounts with a shared dev password
   (`CampusLearn!2026`). If this Supabase project is meant to go live for real TCET users, either run the seed
   against a **staging** project instead and manually insert just the academic structure into production, or run
   the seed once and immediately delete/reassign the demo accounts afterward.
3. Log in as the Super Administrator (`/auth/login/admin`) and, from the Administrator Dashboard, add real subjects
   for at least one department/semester (subjects are intentionally not auto-seeded).

**Exit criteria:** `/auth/register` shows populated Department → Programme → Academic Session → Year of Study →
Semester → Division dropdowns with no empty-state warning; the Super Administrator can log in at `/auth/login/admin`.

---

## Phase 4 — Functional verification (smoke test every role)

**Goal:** confirm the live deployment actually works end-to-end, not just that it builds.

1. **Registration:** register a real Student ID (e.g. `S1032250999`) → confirm the generated email preview is
   read-only and correct → confirm the verification email arrives (requires Supabase Auth email delivery to be
   configured — see Phase 5) → confirm login works afterward at `/auth/login/student`.
2. **Wrong-portal rejection:** attempt to log the same Student account in at `/auth/login/faculty` → confirm it's
   rejected with a message naming the correct portal, not silently allowed through.
3. **Faculty/Class Teacher flow:** as Super Administrator, create a Faculty account, assign them as Class Teacher
   for one class (`/admin/class-teachers`), log in as that Faculty, and confirm `/faculty/class-representatives`
   shows the assigned class.
4. **CR assignment:** as that Faculty/Class Teacher, search a Student in the class by roll number, assign them to
   CR Slot 1, and confirm their role becomes Class Representative and they can upload a resource that appears
   immediately (no pending-approval step).
5. **Upload limits:** attempt a 95MB+ file upload and confirm it's rejected with a clear size message; attempt an
   `.exe` and confirm it's rejected regardless of its reported content type.
6. **Suspend/ban:** as an Administrator, suspend a test Student account and confirm they're redirected to a
   suspended-account page on next login attempt, not let through.
7. Once available, connect the Claude-in-Chrome extension (or open browser DevTools manually) and check the
   Console and Network tabs on `/auth/register` and `/auth/login` for any client-side errors this document's
   server-rendered-only investigation couldn't detect.

**Exit criteria:** all seven checks above pass against the live URL.

---

## Phase 5 — Production hardening before real users rely on it

**Goal:** everything from Phase 4 works for you personally; this phase makes it safe for real students/faculty.

1. **Email delivery:** confirm Supabase Auth's email provider is configured (Supabase's default email sending has
   low rate limits and is not meant for production) — connect a real SMTP provider (e.g. Resend, Postmark) under
   `Authentication → Email Templates / SMTP Settings` in the Supabase dashboard, or verification/reset emails will
   fail or land in spam at any real scale.
2. **Auth redirect URLs:** confirm `Authentication → URL Configuration` in Supabase includes
   `https://campus-learn-seven.vercel.app/**` as an allowed redirect, or email verification/reset links will
   redirect incorrectly.
3. **Remove/rotate demo data:** if `npm run seed`'s demo accounts (shared password `CampusLearn!2026`) were ever
   created against this production project, delete them or force a password reset before go-live.
4. **Rate limiting:** the in-memory rate limiter (`src/lib/rate-limit/`) resets on every serverless cold start and
   doesn't share state across Vercel's multiple concurrent function instances — acceptable for a pilot, but swap in
   a Redis/Upstash-backed limiter before wide rollout to make login/registration throttling actually hold under
   concurrent load.
5. **Custom domain:** `campus-learn-seven.vercel.app` is a Vercel preview-style domain; if this is meant to be the
   long-term production URL, consider moving to a real domain (e.g. `campuslearn.tcetmumbai.in` or similar) both
   for trust/branding and because `NEXT_PUBLIC_APP_URL` and Supabase redirect URLs will need to match whatever
   you land on anyway — better to decide once.
6. **Monitoring:** enable Vercel's built-in error/log monitoring (or wire up Sentry) so future regressions surface
   immediately instead of being discovered by a user reporting an empty dropdown, as happened here.
7. **Storage bucket check:** confirm the `resources`/`assignments`/`submissions` Supabase Storage buckets exist and
   are set to **private** (not public) with the 95MB limit applied — this is set by migration `0018`, but worth a
   one-time manual confirmation in the Supabase dashboard since bucket settings aren't always visible from
   migration history alone.

**Exit criteria:** a real student or faculty member could use this site today without hitting a dev-only rough edge.

---

## Phase 6 — Remaining feature gaps (carry forward, not blocking a working deployment)

These don't stop the site from *working*, but are incomplete relative to the full spec and should be scheduled
next:
- Administrator CRUD pages for Academic Sessions / Years of Study / Semesters / Divisions individually (currently
  only Departments, Programmes, Subjects, and Class Teacher Assignments have dedicated admin pages — anything else
  requires the seed script or direct SQL).
- Faculty invitation flow still accepts any `@tcetmumbai.in` address rather than enforcing the
  `namelastname@tcetmumbai.in` convention.
- Playwright end-to-end tests haven't been updated for the Student ID/four-portal flows — worth doing once Phase 4
  is manually verified, so future deploys catch regressions automatically instead of needing another manual audit
  like this one.

---

## Summary: fastest path to "working"

If you want the shortest path from today's state to a genuinely working site:
**Phase 2 (deploy corrected code + migrations) → Phase 3 (bootstrap + seed) → Phase 4 (smoke test) →** you have a
working application. Phase 5 is what makes it *production-safe* for real users rather than just functional, and
Phase 6 is polish that can follow afterward.
