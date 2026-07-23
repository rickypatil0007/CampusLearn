# Testing

## Unit & integration tests (Vitest)
No database or network required — these test pure business logic (email domain validation, the permission matrix,
quiz scoring, quiz/assignment eligibility rules, resource-approval rules, document chunking) and the validation
schemas exactly as the app calls them.

```bash
npm run test          # run once
npm run test:watch    # watch mode
```

61 tests across `tests/unit/` and `tests/integration/`, all passing as of this build. See the module docstrings in
`src/lib/quiz/`, `src/lib/assignments/`, `src/lib/resources/` for why the scoring/eligibility/approval logic was
extracted into pure functions — it's the same code the real Server Actions call, not a reimplementation.

**Honest scope note:** `tests/integration/` tests combinations of business-logic modules together (e.g. permission
check → eligibility check → scoring), not live database round-trips. True DB-backed integration testing (actually
calling Supabase Auth, hitting RLS policies, etc.) requires a real or local Supabase project and is intentionally
left to the E2E suite below rather than duplicated here with a mocked client.

## End-to-end tests (Playwright)
Require a running app and a seeded database — **not executed during this build** (no live Supabase project is
connected in this environment). To run them yourself:

```bash
npm run seed           # against your Supabase project, with .env.local configured
npm run test:e2e       # starts `next dev` automatically per playwright.config.ts
```

Specs in `tests/e2e/`:
- `registration.spec.ts` — rejects non-institutional email; registers successfully with `@tcetmumbai.in`
- `login.spec.ts` — successful login, invalid credentials, student blocked from `/admin/*`
- `subject-and-quiz.spec.ts` — viewing an enrolled subject; full quiz attempt → submit → results flow
- `faculty-resources.spec.ts` — Faculty resource upload (auto-approved); Faculty approving a pending CR submission
- `admin-roles.spec.ts` — Administrator changing a user's role

## Critical email-domain test matrix
Covered in `tests/unit/email-domain.test.ts`:

| Input | Expected |
|---|---|
| `student@tcetmumbai.in` | allow |
| `STUDENT@TCETMUMBAI.IN` | normalize + allow |
| `student@gmail.com` | reject |
| `student@sub.tcetmumbai.in` | reject |
| `student@tcetmumbai.in.fake.com` | reject |
| `studenttcetmumbai.in` | reject |
| (blank) | reject |

## Manual verification performed during this build
Since no live Supabase/Anthropic credentials were available, the following were verified directly instead of via
live E2E runs:
- `npm run build` (Next.js production build, Turbopack) — compiles all 54 routes successfully, zero TypeScript
  errors, zero ESLint errors
- All SQL migrations reviewed for balanced syntax and logical ordering (extensions → schema → functions → RLS →
  storage → vector search)
- Every Server Action manually traced against the permission matrix and RLS policies for a matching, non-contradictory
  authorization story
