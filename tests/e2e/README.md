# End-to-end tests (Playwright)

These specs require:
1. A configured Supabase project (see `docs/SUPABASE_SETUP.md`) with migrations applied.
2. `npm run seed` run against that project (creates the demo accounts referenced below).
3. `npm run dev` running, or let Playwright's `webServer` config start it for you.

Run with: `npm run test:e2e`

Demo accounts used by these specs (created by `scripts/seed.ts`, password `CampusLearn!2026` unless overridden by `SEED_SUPER_ADMIN_PASSWORD`):
- Super Admin: `admin@tcetmumbai.in`
- Faculty: `faculty.sharma@tcetmumbai.in`
- Class Rep: `cr.patel@tcetmumbai.in`
- Student: `student.desai@tcetmumbai.in`

These were not executed in the build sandbox (no live Supabase project is connected there) — run them locally or in CI against a real project.
