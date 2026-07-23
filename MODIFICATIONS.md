# CampusLearn — Modification Plan

**Status:** Draft plan generated from the requirements spec. **`campuslearn.zip` has not yet been uploaded/inspected** — this document maps every requirement to a concrete file/migration change so implementation can start the moment the project is provided. Items marked `[VERIFY IN REPO]` must be confirmed against the actual codebase before editing, since the current file contents are unknown.

---

## 0. Prerequisites Before Implementation

- [ ] Receive and extract `campuslearn.zip`
- [ ] Run `npm install`, inspect `package.json` for actual Next.js/React/Supabase versions
- [ ] Read all files listed in the spec's "Important existing files" section
- [ ] Run existing `npm run test` / `npm run build` to capture a baseline (does it currently pass?)
- [ ] Confirm whether Supabase project is connected (env vars present) and whether migrations/seed have already run

---

## 1. Academic Structure — Seed Data

**New/updated files:**
- `scripts/seed.ts` — replace department/programme list with the 11 departments below; remove subject seeding
- `supabase/migrations/00XX_academic_structure.sql` — new migration inserting departments, programmes, academic session, years, semesters, divisions via `INSERT ... ON CONFLICT DO NOTHING` (idempotent upsert, not raw insert)

**Departments / Programmes (11, one-to-one):**

| Dept Code | Department | Programme Code | Programme |
|---|---|---|---|
| CMPN | Computer Engineering | BE-CMPN | B.E. Computer Engineering |
| IT | Information Technology | BE-IT | B.E. Information Technology |
| EXTC | Electronics & Telecommunication Engg. | BE-EXTC | B.E. Electronics & Telecommunication Engg. |
| MECH | Mechanical Engineering | BE-MECH | B.E. Mechanical Engineering |
| CIVIL | Civil Engineering | BE-CIVIL | B.E. Civil Engineering |
| ECS | Electronics & Computer Science | BE-ECS | B.E. Electronics & Computer Science |
| AIML | AI & Machine Learning | BE-AIML | B.E. AI & Machine Learning |
| AIDS | AI & Data Science | BE-AIDS | B.E. AI & Data Science |
| CYSE | Cyber Security | BE-CYSE | B.E. Cyber Security |
| IOT | Internet of Things | BE-IOT | B.E. Internet of Things |
| MTRX | Mechatronics Engineering | BE-MTRX | B.E. Mechatronics Engineering |

- Academic session: **2026–2027** (single row; no start/end date required at registration)
- Years of study: First / Second / Third / Final → Semesters 1–2 / 3–4 / 5–6 / 7–8
- Divisions: A, B, C, D (per semester)
- Subjects: **not seeded** — Administrator creates later

**Migration change:** `academic_years.start_date` / `end_date` → make nullable (`ALTER COLUMN ... DROP NOT NULL`) or drop the constraint; do not backfill/break existing rows.

---

## 2. Registration Data Loading (Public Dropdowns)

**Problem:** RLS restricts `departments`, `programmes`, `academic_years`, `semesters`, `divisions` to authenticated users → empty dropdowns on public registration.

**Fix:**
- New migration: `CREATE FUNCTION public.get_registration_academic_data() RETURNS jsonb SECURITY DEFINER SET search_path = public` — returns only active/non-deleted rows, scoped to the exact fields listed in the spec (no service-role key needed, RLS stays intact on the base tables)
- `src/app/auth/register/page.tsx` — call this RPC server-side (Server Component) instead of direct table queries
- `src/app/auth/register/register-form.tsx` — add loading / empty / error states; empty state message: *"No academic structure has been configured yet. Please contact an Administrator."*

---

## 3–6. Student Registration Form, Student ID, Roll Number, Cascading Dropdowns

**`src/lib/validation/auth.ts`:**
- `studentIdSchema`: regex `^S[0-9]{10}$`, `.toUpperCase()` transform
- `generatedEmailSchema`: derive from Student ID (`S1032250917` → `1032250917@tcetmumbai.in`), enforce match server-side — never trust client-submitted email
- `rollNumberSchema`: regex `^(0[1-9]|[1-6][0-9]|70)$` (accepts `01`–`70`, rejects `1`, `001`, `71`)
- Remove any role-selector field from the registration schema entirely (not just hidden in UI)
- Reject registration email domains that aren't the generated `@tcetmumbai.in` address (blocks Gmail, faculty-style, other-institution, or manually edited emails)

**`src/app/auth/register/register-form.tsx`:**
- Student ID input → auto-derive read-only generated email field (no manual edit handler)
- Cascading `<select>` sequence: Department → Programme → Academic Session → Year of Study → Semester → Division
  - Each level disabled until parent selected; changing a parent clears all descendant field state
  - Empty option sets render a helper message, not a silently empty dropdown
- Roll number as free-text (not number input, to preserve leading zero) with pattern validation

**`src/app/auth/actions.ts` (server action):**
- Independently re-validate: Department↔Programme relationship, Year↔Semester relationship, Semester↔Programme/session, Division↔Semester, all records `is_active = true`, roll number pattern, Student ID uniqueness, email-matches-ID
- Insert always uses `role = 'student'`, ignoring any client-sent role value

**New migration — class-scoped constraints:**
```sql
-- Roll number unique per class, not globally
ALTER TABLE profiles ADD CONSTRAINT uq_roll_per_class
  UNIQUE (academic_year_id, programme_id, year_of_study_id, semester_id, division_id, roll_number);

-- Student ID globally unique
ALTER TABLE profiles ADD CONSTRAINT uq_student_id UNIQUE (student_id);
```
`[VERIFY IN REPO]` — exact column names/table depend on existing `profiles` schema.

---

## 7. Four Login Portals

**New files:**
- `src/app/auth/login/student/page.tsx`
- `src/app/auth/login/faculty/page.tsx`
- `src/app/auth/login/cr/page.tsx`
- `src/app/auth/login/admin/page.tsx`

Each renders the existing `login-form.tsx` with a `portal` prop (`student | faculty | class_rep | admin`).

**`src/app/auth/login/page.tsx`:** replace single form with 4 role cards linking to the routes above.

**`src/app/auth/actions.ts`:**
- After Supabase auth succeeds: fetch real `role` + `status` (suspended/banned) from DB
- Portal→role check: `student`→student, `class_rep`→class_rep, `faculty`→faculty, `admin` portal accepts both `dept_admin` and `super_admin`
- Mismatch → do not redirect to a dashboard; show *"This account belongs to the \{X\} portal. Please use \{X\} Login."*
- Suspended → redirect to `/account-suspended`
- Bootstrap Gmail exception is checked against `BOOTSTRAP_SUPER_ADMIN_EMAIL` only — never a generic "allow Gmail" rule
- Selected portal never writes to the `role` column

---

## 8–11. Account Creation, Admin User Management, Class Teacher & CR Assignment

**New tables (migrations):**

```sql
CREATE TABLE class_teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id uuid REFERENCES profiles(id),
  department_id uuid REFERENCES departments(id),
  programme_id uuid REFERENCES programmes(id),
  academic_year_id uuid REFERENCES academic_years(id),
  year_of_study_id uuid REFERENCES years_of_study(id),
  semester_id uuid REFERENCES semesters(id),
  division_id uuid REFERENCES divisions(id),
  assigned_by uuid REFERENCES profiles(id),
  assigned_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  is_active boolean DEFAULT true
);
-- Partial unique index: one active class teacher per class
CREATE UNIQUE INDEX uq_active_class_teacher ON class_teacher_assignments
  (department_id, programme_id, academic_year_id, year_of_study_id, semester_id, division_id)
  WHERE is_active;

CREATE TABLE class_representative_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id),
  department_id uuid, programme_id uuid, academic_year_id uuid,
  year_of_study_id uuid, semester_id uuid, division_id uuid,
  slot_number smallint CHECK (slot_number IN (1,2)),
  assigned_by uuid REFERENCES profiles(id),
  assigned_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES profiles(id),
  revoke_reason text,
  is_active boolean DEFAULT true
);
-- One active student per slot per class
CREATE UNIQUE INDEX uq_active_cr_slot ON class_representative_assignments
  (department_id, programme_id, academic_year_id, year_of_study_id, semester_id, division_id, slot_number)
  WHERE is_active;
-- Same student can't hold both slots in one class simultaneously
CREATE UNIQUE INDEX uq_active_cr_student_per_class ON class_representative_assignments
  (student_id, department_id, programme_id, academic_year_id, year_of_study_id, semester_id, division_id)
  WHERE is_active;
```

**RPC (transactional, `SECURITY DEFINER`):** `assign_class_representative(student_id, class_scope, slot_number)` and `revoke_class_representative(assignment_id, reason)` — inside one transaction: validate active Class Teacher scope, validate student belongs to exact class, validate student not suspended/banned, upsert assignment, flip `profiles.role` between `student`↔`class_rep`, insert `user_roles` history row, insert `audit_log` row, insert notification row.

**New pages:**
- `src/app/(app)/faculty/class-representatives/page.tsx` — class selector, CR slot 1/2 view, student search (by roll number or institutional email), assign/remove/replace with optional reason, history view
- Admin equivalents: `src/app/(app)/admin/class-teachers/page.tsx`, extend `src/app/(app)/admin/users/` for suspend/ban/reactivate with reason + audit trail

**`src/lib/permissions/roles.ts` / `permissions.ts`:** add `class_rep` as student-superset; add Class Teacher scope check helper; add server-side suspension check used in all protected layouts/actions (not just nav hiding).

---

## 12. Role Permissions Matrix

`[VERIFY IN REPO]` — update `src/lib/permissions/permissions.ts` capability map to match the spec's Student / CR / Faculty / Admin / Super Admin action lists exactly (see spec §12). Key deltas from a typical existing implementation: CR gets note-upload scoped to own class only; Faculty notice publishing scoped to assigned classes/subjects only; only Admin/Super Admin manage role changes.

---

## 13. Notes & Resource Uploads

- Remove "pending approval" default for CR uploads; server action must check: active CR, active assignment, resource's class matches CR's class, subject belongs to CR's semester, account not suspended → then set `status = 'approved'` automatically
- Faculty uploads: approve immediately after verifying subject assignment
- Update max size constant (95 MB) in: validation schema, `.env.example`, Storage bucket config, UI copy, error messages
- Allowed types: pdf, doc/docx, ppt/pptx, xls/xlsx, txt, csv, images, audio, video, zip/archives, external + YouTube links
- Blocklist: exe, msi, bat, cmd, com, scr, apk, dll, shell scripts, server-executable scripts — validate via **both** MIME sniffing and extension, reject mismatches, sanitize filenames, randomize storage paths
- Storage: private bucket, signed URLs generated only after server-side access check; add download tracking table/column

---

## 14. Quiz & MCQ Module

- Question types: single-correct MCQ, multi-correct MCQ, True/False
- Faculty can only create quizzes for assigned subjects (server check, not just UI)
- Correct answers excluded from any payload sent to student before submission — verify current API/query doesn't leak answer fields
- Scoring, timers, deadlines, attempt limits all enforced server-side (Server Action / Route Handler, re-checked against DB time, not client clock)
- Store per-attempt randomized question/option order (e.g. `attempt_question_order jsonb`) so it's stable on reload
- Notification on publish/update

---

## 15. Notices & Announcements

- Faculty: scoped to assigned class/subject only (add scope columns + RLS filter, not "all authenticated users see all approved notices")
- Admin: institution/department/programme/session/year/semester/division scope
- CR: no create/publish capability
- Priorities: Normal / Important / Urgent → notification triggered for Important/Urgent
- Rewrite the RLS policy/query so students see only notices intersecting their own dept/programme/year/semester/division — audit current policy for over-broad `USING (true)`-style rules

---

## 16–17. Admin Academic Pages & Migrations

New/completed admin pages: academic sessions, years of study, semesters, divisions, faculty accounts, faculty-subject assignments, class teacher assignments, CR assignments — all with dependent-field validation and soft-delete (`is_active`/`deleted_at`) instead of hard delete where records are referenced elsewhere.

**Migrations:** new sequential files only — never edit already-applied migrations. Each new migration should be idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) since deployment state is unknown.

---

## 18. Row-Level Security Audit

Tables to review/tighten: `profiles`, academic lookup tables, `subjects`, `subject_faculty`, `subject_enrollments`, `class_teacher_assignments`, `class_representative_assignments`, `resources` (+ files), `quizzes`/`questions`/`options`/`attempts`/`answers`/`results`, `announcements`, `notifications`, `user_roles`, `audit_logs`.

Principles to enforce in every policy: no client-writable role column, no service-role key in browser bundle, suspended/banned users blocked at the RLS layer (not just UI), scope checks mirror the Server Action checks (defense in depth), quiz answer tables never selectable by student role before submission recorded.

---

## 19. Dashboards & Navigation

`src/components/layout/nav-items.ts` — nav items driven by DB role fetched server-side; keep existing dark/lime theme. Add: CR dashboard (Student view + Upload Notes + My Uploaded Notes + active class info), Faculty dashboard additions (Class Teacher assignments, Manage CRs), Admin dashboard additions (Faculty invitations, CR/Class Teacher assignment views, audit logs). All protected routes re-check role server-side on direct URL access.

---

## 20. Super Admin Bootstrap

**New file:** `scripts/bootstrap-super-admin.ts` (server-only, not run in browser build)
- Reads `BOOTSTRAP_SUPER_ADMIN_EMAIL` / `BOOTSTRAP_SUPER_ADMIN_PASSWORD` from env
- Creates the Supabase auth user if missing (via service-role key, server-side only), upserts `profiles.role = 'super_admin'`
- Idempotent — safe to re-run
- Never logs the password
- `.env.example` gets placeholder-only entries for both vars

---

## 21. Seed Script

Update `scripts/seed.ts`: 11 departments, 11 programmes, one academic session (no dates required), 4 years × 8 semesters total mapping, 4 divisions, **no subjects**. Use upsert-by-natural-key so reruns don't duplicate. Mark clearly as dev-only; no prod credentials.

---

## 22. Validation & Error Handling

Centralize in `src/lib/validation/` (Zod). Field-level error messages required for every case listed in spec §22. Wrap all raw Supabase/Postgres errors before returning to the client; log full error server-side only.

---

## 23. Testing Plan

- **Unit/integration (Vitest):** ID/email/roll-number validation, cascading dropdown logic, permission matrix functions
- **DB tests:** constraint checks (duplicate student ID, duplicate roll-in-class, CR slot limits, third-CR rejection, same-student-both-slots rejection)
- **E2E (Playwright):** all four login portals incl. wrong-portal redirect and suspended-account redirect; registration happy-path + rejections; CR assignment/removal flow; upload size/type rejection; quiz timer/deadline/attempt-limit enforcement; notice scoping
- Run in order: `npm install` → `npm run lint` → `npm run typecheck` → `npm run test` → `npm run build` → `npm run test:e2e`
- Report only actually-executed results — no claimed passes without a real run

---

## 24. Documentation to Update

`README.md`, `.env.example`, `docs/SETUP.md`, `docs/SUPABASE_SETUP.md`, `docs/DEPLOYMENT.md`, `docs/SECURITY.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/LIMITATIONS.md` — each gets the relevant section from spec §24.

---

## 25. Final Deliverables Checklist

- [ ] Modified project ZIP
- [ ] New migration files (sequential, non-destructive to existing ones)
- [ ] Updated `src/types/database.types.ts`
- [ ] Updated `scripts/seed.ts`
- [ ] `scripts/bootstrap-super-admin.ts`
- [ ] Updated `.env.example`
- [ ] Updated docs (list above)
- [ ] Change log
- [ ] Exact migration commands to run
- [ ] Exact bootstrap command to run
- [ ] List of tests executed + actual results
- [ ] Lint/typecheck/test/build actual output
- [ ] Known limitations / manual Supabase steps remaining
- [ ] Files added/changed/removed list

---

### Next step
Upload `campuslearn.zip` and I'll extract it, cross-check every `[VERIFY IN REPO]` item against the real code, and start implementing section by section (recommend starting with §1–2 academic data + registration, since §7–11 depend on the schema those introduce).
