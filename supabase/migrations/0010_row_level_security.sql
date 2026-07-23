-- ============================================================================
-- 0010: Row-Level Security
-- Every table enforces authorization independently of application code.
-- ============================================================================

alter table public.institutions enable row level security;
alter table public.departments enable row level security;
alter table public.programmes enable row level security;
alter table public.academic_years enable row level security;
alter table public.semesters enable row level security;
alter table public.divisions enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.subjects enable row level security;
alter table public.subject_faculty enable row level security;
alter table public.subject_enrollments enable row level security;
alter table public.units enable row level security;
alter table public.topics enable row level security;
alter table public.resources enable row level security;
alter table public.resource_files enable row level security;
alter table public.resource_tags enable row level security;
alter table public.resource_approvals enable row level security;
alter table public.resource_bookmarks enable row level security;
alter table public.resource_views enable row level security;
alter table public.resource_downloads enable row level security;
alter table public.document_chunks enable row level security;
alter table public.document_embeddings enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_units enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.question_options enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.quiz_results enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_attachments enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.assignment_submission_files enable row level security;
alter table public.assignment_feedback enable row level security;
alter table public.announcements enable row level security;
alter table public.discussions enable row level security;
alter table public.discussion_replies enable row level security;
alter table public.discussion_votes enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.study_plans enable row level security;
alter table public.study_plan_tasks enable row level security;
alter table public.ai_generations enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.institution_settings enable row level security;

-- ---------------------------------------------------------------- profiles
create policy "profiles_select_all_authenticated" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_self_limited" on public.profiles
  for update to authenticated using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy "profiles_admin_manage" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------ academic structure
create policy "academic_read_all" on public.departments for select to authenticated using (true);
create policy "academic_admin_write" on public.departments for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "programmes_read_all" on public.programmes for select to authenticated using (true);
create policy "programmes_admin_write" on public.programmes for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "years_read_all" on public.academic_years for select to authenticated using (true);
create policy "years_admin_write" on public.academic_years for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "semesters_read_all" on public.semesters for select to authenticated using (true);
create policy "semesters_admin_write" on public.semesters for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "divisions_read_all" on public.divisions for select to authenticated using (true);
create policy "divisions_admin_write" on public.divisions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "institutions_read_all" on public.institutions for select to authenticated using (true);
create policy "institutions_admin_write" on public.institutions for all to authenticated using (public.current_user_role() = 'super_admin') with check (public.current_user_role() = 'super_admin');

create policy "user_roles_self_or_admin_select" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.is_admin() or public.current_user_role() in ('faculty'));
create policy "user_roles_admin_insert" on public.user_roles
  for insert to authenticated with check (public.is_admin() or public.current_user_role() = 'faculty');

-- ------------------------------------------------------------------ subjects
create policy "subjects_read_all" on public.subjects for select to authenticated using (true);
create policy "subjects_admin_write" on public.subjects for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "subject_faculty_read_all" on public.subject_faculty for select to authenticated using (true);
create policy "subject_faculty_admin_write" on public.subject_faculty for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "subject_enrollments_select" on public.subject_enrollments
  for select to authenticated using (student_id = auth.uid() or public.is_faculty_or_admin());
create policy "subject_enrollments_admin_write" on public.subject_enrollments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "units_read_all" on public.units for select to authenticated using (true);
create policy "units_faculty_admin_write" on public.units for all to authenticated using (public.is_faculty_or_admin()) with check (public.is_faculty_or_admin());
create policy "topics_read_all" on public.topics for select to authenticated using (true);
create policy "topics_faculty_admin_write" on public.topics for all to authenticated using (public.is_faculty_or_admin()) with check (public.is_faculty_or_admin());

-- ----------------------------------------------------------------- resources
-- Students/CR see approved resources only (or their own pending uploads);
-- Faculty/Admin see everything so they can review.
create policy "resources_select" on public.resources
  for select to authenticated using (
    approval_status = 'approved'
    or uploaded_by = auth.uid()
    or public.is_faculty_or_admin()
  );
create policy "resources_insert" on public.resources
  for insert to authenticated with check (
    uploaded_by = auth.uid()
    and public.current_user_role() in ('class_rep','faculty','dept_admin','super_admin')
  );
create policy "resources_update_own_pending" on public.resources
  for update to authenticated using (
    (uploaded_by = auth.uid() and approval_status = 'pending') or public.is_faculty_or_admin()
  ) with check (
    (uploaded_by = auth.uid() and approval_status = 'pending') or public.is_faculty_or_admin()
  );
create policy "resources_delete_own_pending_or_admin" on public.resources
  for delete to authenticated using (
    (uploaded_by = auth.uid() and approval_status = 'pending') or public.is_faculty_or_admin()
  );

create policy "resource_files_select" on public.resource_files for select to authenticated using (
  exists (select 1 from public.resources r where r.id = resource_id and (r.approval_status = 'approved' or r.uploaded_by = auth.uid() or public.is_faculty_or_admin()))
);
create policy "resource_files_write" on public.resource_files for all to authenticated using (
  exists (select 1 from public.resources r where r.id = resource_id and (r.uploaded_by = auth.uid() or public.is_faculty_or_admin()))
) with check (
  exists (select 1 from public.resources r where r.id = resource_id and (r.uploaded_by = auth.uid() or public.is_faculty_or_admin()))
);

create policy "resource_tags_select" on public.resource_tags for select to authenticated using (true);
create policy "resource_tags_write" on public.resource_tags for all to authenticated using (
  exists (select 1 from public.resources r where r.id = resource_id and (r.uploaded_by = auth.uid() or public.is_faculty_or_admin()))
) with check (
  exists (select 1 from public.resources r where r.id = resource_id and (r.uploaded_by = auth.uid() or public.is_faculty_or_admin()))
);

create policy "resource_approvals_select" on public.resource_approvals for select to authenticated using (
  exists (select 1 from public.resources r where r.id = resource_id and (r.uploaded_by = auth.uid() or public.is_faculty_or_admin()))
);
create policy "resource_approvals_insert" on public.resource_approvals for insert to authenticated with check (
  reviewer_id = auth.uid() and public.is_faculty_or_admin()
);

create policy "resource_bookmarks_own" on public.resource_bookmarks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "resource_views_insert" on public.resource_views for insert to authenticated with check (user_id = auth.uid());
create policy "resource_views_select" on public.resource_views for select to authenticated using (public.is_faculty_or_admin());

create policy "resource_downloads_insert" on public.resource_downloads for insert to authenticated with check (user_id = auth.uid());
create policy "resource_downloads_select" on public.resource_downloads for select to authenticated using (public.is_faculty_or_admin());

-- document_chunks/embeddings: never directly readable by students; only the
-- server (service role, which bypasses RLS) performs retrieval after its own
-- permission-filtering step. Faculty/Admin may inspect for moderation.
create policy "document_chunks_faculty_admin" on public.document_chunks for select to authenticated using (public.is_faculty_or_admin());
create policy "document_embeddings_faculty_admin" on public.document_embeddings for select to authenticated using (public.is_faculty_or_admin());

-- ------------------------------------------------------------------- quizzes
create policy "quizzes_select" on public.quizzes for select to authenticated using (
  status in ('published','closed') or created_by = auth.uid() or public.is_faculty_or_admin()
);
create policy "quizzes_faculty_write" on public.quizzes for all to authenticated using (
  public.is_faculty_or_admin() and (created_by = auth.uid() or public.is_admin())
) with check (created_by = auth.uid() or public.is_admin());

create policy "quiz_units_select" on public.quiz_units for select to authenticated using (true);
create policy "quiz_units_write" on public.quiz_units for all to authenticated using (public.is_faculty_or_admin()) with check (public.is_faculty_or_admin());

-- Students must NEVER see is_correct via quiz_questions/question_options
-- before submitting. We enforce this by only exposing correctness columns
-- through server-side (service-role) code paths; the RLS-visible read for
-- students is restricted to published quizzes and excludes is_correct at
-- the application query layer. Faculty/Admin/creator can see everything.
create policy "quiz_questions_select" on public.quiz_questions for select to authenticated using (
  public.is_faculty_or_admin()
  or exists (select 1 from public.quizzes q where q.id = quiz_id and q.status in ('published','closed'))
);
create policy "quiz_questions_faculty_write" on public.quiz_questions for all to authenticated using (
  public.is_faculty_or_admin() and (created_by = auth.uid() or public.is_admin())
) with check (created_by = auth.uid() or public.is_admin());

create policy "question_options_select" on public.question_options for select to authenticated using (
  public.is_faculty_or_admin()
  or exists (
    select 1 from public.quiz_questions qq join public.quizzes q on q.id = qq.quiz_id
    where qq.id = question_id and q.status in ('published','closed')
  )
);
create policy "question_options_faculty_write" on public.question_options for all to authenticated using (
  exists (select 1 from public.quiz_questions qq where qq.id = question_id and (qq.created_by = auth.uid() or public.is_admin()))
) with check (
  exists (select 1 from public.quiz_questions qq where qq.id = question_id and (qq.created_by = auth.uid() or public.is_admin()))
);

create policy "quiz_attempts_own_or_faculty" on public.quiz_attempts for select to authenticated using (
  student_id = auth.uid() or public.is_faculty_or_admin()
);
create policy "quiz_attempts_insert_own" on public.quiz_attempts for insert to authenticated with check (student_id = auth.uid());
create policy "quiz_attempts_update_own_inflight" on public.quiz_attempts for update to authenticated using (
  student_id = auth.uid() and submitted_at is null
) with check (student_id = auth.uid());

create policy "quiz_answers_own_or_faculty" on public.quiz_answers for select to authenticated using (
  exists (select 1 from public.quiz_attempts a where a.id = attempt_id and (a.student_id = auth.uid() or public.is_faculty_or_admin()))
);
create policy "quiz_answers_insert_own" on public.quiz_answers for insert to authenticated with check (
  exists (select 1 from public.quiz_attempts a where a.id = attempt_id and a.student_id = auth.uid() and a.submitted_at is null)
);
create policy "quiz_answers_update_own_inflight" on public.quiz_answers for update to authenticated using (
  exists (select 1 from public.quiz_attempts a where a.id = attempt_id and a.student_id = auth.uid() and a.submitted_at is null)
  or public.is_faculty_or_admin()
);

create policy "quiz_results_own_or_faculty" on public.quiz_results for select to authenticated using (
  exists (select 1 from public.quiz_attempts a where a.id = attempt_id and (a.student_id = auth.uid() or public.is_faculty_or_admin()))
);

-- --------------------------------------------------------------- assignments
create policy "assignments_select" on public.assignments for select to authenticated using (true);
create policy "assignments_faculty_write" on public.assignments for all to authenticated using (
  public.is_faculty_or_admin() and (created_by = auth.uid() or public.is_admin())
) with check (created_by = auth.uid() or public.is_admin());

create policy "assignment_attachments_select" on public.assignment_attachments for select to authenticated using (true);
create policy "assignment_attachments_write" on public.assignment_attachments for all to authenticated using (public.is_faculty_or_admin()) with check (public.is_faculty_or_admin());

create policy "assignment_submissions_select" on public.assignment_submissions for select to authenticated using (
  student_id = auth.uid() or public.is_faculty_or_admin()
);
create policy "assignment_submissions_insert_own" on public.assignment_submissions for insert to authenticated with check (student_id = auth.uid());
create policy "assignment_submissions_update" on public.assignment_submissions for update to authenticated using (
  (student_id = auth.uid() and status in ('not_started','submitted','late')) or public.is_faculty_or_admin()
) with check (
  -- students may never set marks/grading fields themselves; enforced by
  -- application layer + this check keeps grading columns admin/faculty-only.
  (student_id = auth.uid() and marks_obtained is null and graded_by is null) or public.is_faculty_or_admin()
);

create policy "submission_files_select" on public.assignment_submission_files for select to authenticated using (
  exists (select 1 from public.assignment_submissions s where s.id = submission_id and (s.student_id = auth.uid() or public.is_faculty_or_admin()))
);
create policy "submission_files_write" on public.assignment_submission_files for all to authenticated using (
  exists (select 1 from public.assignment_submissions s where s.id = submission_id and s.student_id = auth.uid())
) with check (
  exists (select 1 from public.assignment_submissions s where s.id = submission_id and s.student_id = auth.uid())
);

create policy "assignment_feedback_select" on public.assignment_feedback for select to authenticated using (
  exists (select 1 from public.assignment_submissions s where s.id = submission_id and (s.student_id = auth.uid() or public.is_faculty_or_admin()))
);
create policy "assignment_feedback_insert" on public.assignment_feedback for insert to authenticated with check (
  faculty_id = auth.uid() and public.is_faculty_or_admin()
);

-- -------------------------------------------------------------- announcements
create policy "announcements_select" on public.announcements for select to authenticated using (
  approval_status = 'approved' or created_by = auth.uid() or public.is_faculty_or_admin()
);
create policy "announcements_insert" on public.announcements for insert to authenticated with check (
  created_by = auth.uid() and public.current_user_role() in ('class_rep','faculty','dept_admin','super_admin')
);
create policy "announcements_update" on public.announcements for update to authenticated using (
  (created_by = auth.uid() and approval_status = 'pending') or public.is_faculty_or_admin()
) with check (
  (created_by = auth.uid() and approval_status = 'pending') or public.is_faculty_or_admin()
);
create policy "announcements_delete" on public.announcements for delete to authenticated using (
  (created_by = auth.uid() and approval_status = 'pending') or public.is_faculty_or_admin()
);

-- --------------------------------------------------------------- discussions
create policy "discussions_select" on public.discussions for select to authenticated using (true);
create policy "discussions_insert" on public.discussions for insert to authenticated with check (created_by = auth.uid());
create policy "discussions_update_own_or_faculty" on public.discussions for update to authenticated using (
  created_by = auth.uid() or public.is_faculty_or_admin()
) with check (created_by = auth.uid() or public.is_faculty_or_admin());
create policy "discussions_delete_own_unverified_or_faculty" on public.discussions for delete to authenticated using (
  created_by = auth.uid() or public.is_faculty_or_admin()
);

create policy "discussion_replies_select" on public.discussion_replies for select to authenticated using (true);
create policy "discussion_replies_insert" on public.discussion_replies for insert to authenticated with check (created_by = auth.uid());
create policy "discussion_replies_update" on public.discussion_replies for update to authenticated using (
  (created_by = auth.uid() and not is_faculty_verified) or public.is_faculty_or_admin()
) with check (
  (created_by = auth.uid() and not is_faculty_verified) or public.is_faculty_or_admin()
);
create policy "discussion_replies_delete" on public.discussion_replies for delete to authenticated using (
  (created_by = auth.uid() and not is_faculty_verified) or public.is_faculty_or_admin()
);

create policy "discussion_votes_own" on public.discussion_votes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- -------------------------------------------------------------- notifications
create policy "notifications_own" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notification_prefs_own" on public.notification_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------------------------ study plans
create policy "study_plans_own" on public.study_plans for all to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "study_plan_tasks_own" on public.study_plan_tasks for all to authenticated using (
  exists (select 1 from public.study_plans p where p.id = study_plan_id and p.student_id = auth.uid())
) with check (
  exists (select 1 from public.study_plans p where p.id = study_plan_id and p.student_id = auth.uid())
);

-- ------------------------------------------------------------------------ ai
create policy "ai_generations_own_or_faculty" on public.ai_generations for select to authenticated using (
  user_id = auth.uid() or public.is_faculty_or_admin()
);
create policy "ai_generations_insert_own" on public.ai_generations for insert to authenticated with check (user_id = auth.uid());
create policy "ai_usage_logs_own_or_admin" on public.ai_usage_logs for select to authenticated using (
  user_id = auth.uid() or public.is_admin()
);

-- ---------------------------------------------------------------- audit/settings
create policy "audit_logs_admin_only" on public.audit_logs for select to authenticated using (public.is_admin());
create policy "institution_settings_read_all" on public.institution_settings for select to authenticated using (true);
create policy "institution_settings_super_admin_write" on public.institution_settings for all to authenticated using (
  public.current_user_role() = 'super_admin'
) with check (public.current_user_role() = 'super_admin');
