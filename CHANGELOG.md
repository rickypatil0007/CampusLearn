# Changelog

## Unreleased — Faculty Management, multi-class uploads, email verification hardening, RBAC/RLS audit

This pass implements the requirements in `CampusLearn_Professional_Repository_Update_Prompt_FINAL.md`
against the repository as it existed on `fix/faculty-management-email-verification-multi-upload-rbac`
(commit `fd6733c`). No existing migration was edited; all schema changes are new, additive, sequential
migrations (`0019`–`0022`). No code was pushed to the remote — this is a local update, packaged as a zip.

### Added

- **Faculty Management** (`/admin/faculty`, `/admin/faculty/new`, `/admin/faculty/[facultyId]`,
  `/admin/faculty-assignments`): invite Faculty (with a generated temporary password, since no SMTP/email
  provider is configured in this environment — see Limitations), search/list all Faculty with active
  assignment counts, per-Faculty class-scoped teaching assignments (subject + division, with department/
  programme/academic year/semester derived from the subject), deactivate/reactivate (reuses the existing
  `is_suspended` suspension mechanism so it's enforced by the same already-audited login/RLS checks).
- **`faculty_teaching_assignments` table** (migration `0019`): class-scoped "Faculty X teaches Subject Y in
  Division Z" rows, replacing the previous subject-only granularity. The pre-existing `subject_faculty`
  table (relied on by ~8 other call sites: dashboards, resource/quiz upload subject dropdowns, RAG
  retrieval scope, RLS) is kept unchanged and is now kept automatically in sync by database triggers, so
  nothing that reads `subject_faculty` needed to change.
- **Multi-file, multi-class resource uploads** (`/faculty/resources/new`): Faculty and Class Representatives
  can now select several files and one or more assigned classes in a single submission. Architecture:
  `resource_upload_batches` (submission metadata) → signed Storage upload URLs issued after a server-side
  authorization check → browser uploads directly to Storage → `finalizeUploadBatchAction` re-verifies
  authorization and that every staged object actually exists, then a single `SECURITY DEFINER` Postgres
  function (`finalize_resource_upload_batch`) atomically inserts one `resources` row per file and maps each
  to every selected class via the new `resource_classes` table (migration `0020`). One physical file
  assigned to three classes is stored once, not duplicated. If any file fails to upload, every staged
  object for the batch is removed and no resource row is ever created (`abortUploadBatchAction`).
- **Expanded upload type whitelist and size limit**: PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, JPG/JPEG/PNG, ZIP
  (previously PDF/DOCX/PPTX only); default per-file limit raised from 20MB to 95MB (`MAX_UPLOAD_SIZE_MB`),
  with a matching Storage bucket `file_size_limit` backstop. Both file extension and MIME type must match
  an expected pairing (rejects a renamed executable or a mismatched extension/content-type).
- **Durable email verification resend cooldown** (`email_verification_requests` table, migration `0021`):
  the 60-second resend cooldown is now enforced in Postgres via the service-role client, not in-memory —
  it holds across serverless cold starts and concurrent instances. Also rate-limited by IP, and the same
  generic response is returned whether or not the email is registered, so resend cannot be used to enumerate
  accounts. The UI shows a live countdown driven by the server-provided `next_allowed_at`.
- **`registerAction` no longer scans the full user list** to find the account it just created — it now uses
  the user id returned directly by `supabase.auth.signUp()`.
- **CR announcements publish immediately, scoped to exactly their own class** — no approval step, and no
  client-supplied target fields for the CR path (the scope is derived server-side from the CR's active
  `class_representative_assignments` row and independently re-checked by a new RLS `WITH CHECK` clause).
  Faculty/Admin announcement creation is unchanged (already published immediately with a chosen scope).
- Unit tests for the new pure logic: `tests/unit/batch-rules.test.ts` (class-scope authorization),
  `tests/unit/verification-cooldown.test.ts` (cooldown math). 79 tests total, up from 61.
- `.env.example` (did not exist in the repository before this pass).

### Fixed

- **`class_teacher_assignments` and `class_representative_assignments` had no Row-Level Security enabled at
  all** since they were introduced (migration `0017`) — any authenticated client could read or write them
  directly, bypassing the `assign_class_representative`/`revoke_class_representative` RPCs and the
  admin-only Server Actions entirely. RLS is now enabled on both (migration `0022`): broad `SELECT` (matching
  the existing `profiles_select_all_authenticated` philosophy already used elsewhere in this codebase),
  writes restricted to admins (the CR assign/revoke RPCs are `SECURITY DEFINER` and are unaffected).
- **Resources had no class-scoped visibility at all** — the RLS policy showed every approved resource to
  every authenticated user regardless of subject enrollment or division. Resources uploaded through the new
  batch flow (which have `resource_classes` rows) are now filtered to students whose own class matches;
  resources without `resource_classes` rows (everything uploaded before this migration) keep the previous
  broader visibility so nothing existing breaks.
- **Announcements had no scope filtering at all** — every approved announcement was visible to every
  authenticated user regardless of its `target_*` columns. The RLS policy now requires every non-null
  target column to match the viewer's own profile (a null target column means "not restricted at that
  level"), and subject-targeted announcements check `subject_enrollments`.
- **`/admin/divisions`, `/admin/semesters`, `/admin/academic-sessions`, `/admin/years-of-study` were broken**
  — each filtered on `.is("deleted_at", null)` against tables (`divisions`, `semesters`, `academic_years`,
  `years_of_study`) that have no `deleted_at` column, which errors against a real Postgres connection. Found
  while reviewing the admin CRUD pages added in an earlier session; fixed by removing the invalid filter
  (and guarding nullable `start_date`/`end_date` rendering on the academic sessions page).
- **`scripts/gen-types.mjs`** only matched `create table public.x (...)` and had no handling for
  `ALTER TABLE ... ADD COLUMN` at all — meaning `years_of_study`, `class_teacher_assignments`, and
  `class_representative_assignments` (all added via `IF NOT EXISTS`/later migrations) were silently missing
  from `database.types.ts` entirely, and columns added after a table's initial migration (`year_of_study_id`,
  `student_id`, the `target_*` announcement/quiz columns, etc.) were missing from tables that WERE present.
  The generator now handles both; `database.types.ts` grew from 46 to 53 tables with materially more
  complete columns, and `tsc --noEmit` was re-verified clean against the corrected types.
- Pre-existing `eslint` errors (`@typescript-eslint/no-explicit-any` in `assignments-manager.tsx`,
  `divisions/page.tsx`, `semesters/page.tsx`) fixed with real types instead of `any`.
- Login no longer surfaces raw Supabase error text (`"Supabase Error: " + error.message`) to the user;
  unconfirmed-email now shows the exact spec-required message, everything else shows a generic
  incorrect-credentials message.

### Changed

- `PERMISSIONS` matrix: added `faculty.manage`, `resource.upload_batch`, split `announcement.publish` from
  a new `announcement.create` (see Fixed/Added above for why).
- `RATE_LIMITS`: added `resendVerification` preset.

See `MIGRATION_NOTES.md` for exact commands to apply this against a live Supabase project, and
`docs/LIMITATIONS.md` for what remains (email delivery via real SMTP, a scheduled cleanup job for orphaned
staged uploads, byte-level upload progress, and a few smaller items).
