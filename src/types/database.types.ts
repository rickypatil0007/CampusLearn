// AUTO-GENERATED (best-effort) from supabase/migrations/*.sql by scripts/gen-types.mjs.
// Regenerate with the Supabase CLI (`supabase gen types typescript`) once a
// live project is connected -- this file is a development stand-in.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface InstitutionsRow {
  id: string;
  name: string;
  short_name: string;
  created_at: string;
  updated_at: string;
}

export interface DepartmentsRow {
  id: string;
  institution_id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProgrammesRow {
  id: string;
  department_id: string;
  name: string;
  code: string;
  duration_years: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AcademicYearsRow {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export interface SemestersRow {
  id: string;
  programme_id: string;
  academic_year_id: string;
  number: number;
  name: string;
  created_at: string;
  year_of_study_id: string | null;
}

export interface DivisionsRow {
  id: string;
  semester_id: string;
  name: string;
  created_at: string;
}

export interface ProfilesRow {
  id: string;
  full_name: string;
  email: string;
  role: "student" | "class_rep" | "faculty" | "dept_admin" | "super_admin";
  department_id: string | null;
  programme_id: string | null;
  academic_year_id: string | null;
  semester_id: string | null;
  division_id: string | null;
  roll_number: string | null;
  avatar_url: string | null;
  is_suspended: boolean;
  suspended_reason: string | null;
  created_at: string;
  updated_at: string;
  year_of_study_id: string | null;
  student_id: string | null;
}

export interface UserRolesRow {
  id: string;
  user_id: string;
  role: "student" | "class_rep" | "faculty" | "dept_admin" | "super_admin";
  scope_department_id: string | null;
  scope_division_id: string | null;
  assigned_by: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface SubjectsRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  credits: number;
  department_id: string;
  semester_id: string;
  syllabus_file_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SubjectFacultyRow {
  id: string;
  subject_id: string;
  faculty_id: string;
  assigned_by: string | null;
  created_at: string;
}

export interface SubjectEnrollmentsRow {
  id: string;
  subject_id: string;
  student_id: string;
  division_id: string | null;
  created_at: string;
}

export interface UnitsRow {
  id: string;
  subject_id: string;
  title: string;
  sequence: number;
  created_at: string;
  updated_at: string;
}

export interface TopicsRow {
  id: string;
  unit_id: string;
  title: string;
  sequence: number;
  created_at: string;
  updated_at: string;
}

export interface ResourcesRow {
  id: string;
  title: string;
  description: string | null;
  resource_type: "lecture_notes" | "presentation_slides" | "lab_manual" | "assignment_sheet" | "question_bank" | "previous_year_paper" | "model_answer" | "formula_sheet" | "reference_material" | "youtube_link" | "useful_website" | "syllabus" | "revision_notes";
  subject_id: string;
  unit_id: string | null;
  topic_id: string | null;
  academic_year_id: string | null;
  semester_id: string | null;
  uploaded_by: string;
  approval_status: "pending" | "approved" | "rejected" | "changes_requested";
  is_verified: boolean;
  is_cr_contributed: boolean;
  external_url: string | null;
  file_path: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  view_count: number;
  download_count: number;
  ai_processing_status: "not_started" | "processing" | "completed" | "failed";
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  batch_id: string | null;
  original_filename: string | null;
  sha256_hash: string | null;
  upload_status: string;
}

export interface ResourceFilesRow {
  id: string;
  resource_id: string;
  file_path: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
}

export interface ResourceTagsRow {
  id: string;
  resource_id: string;
  tag: string;
}

export interface ResourceApprovalsRow {
  id: string;
  resource_id: string;
  reviewer_id: string;
  status: "pending" | "approved" | "rejected" | "changes_requested";
  comment: string | null;
  created_at: string;
}

export interface ResourceBookmarksRow {
  id: string;
  resource_id: string;
  user_id: string;
  created_at: string;
}

export interface ResourceViewsRow {
  id: string;
  resource_id: string;
  user_id: string | null;
  created_at: string;
}

export interface ResourceDownloadsRow {
  id: string;
  resource_id: string;
  user_id: string | null;
  created_at: string;
}

export interface DocumentChunksRow {
  id: string;
  resource_id: string;
  chunk_index: number;
  content: string;
  section_reference: string | null;
  token_count: number | null;
  created_at: string;
}

export interface DocumentEmbeddingsRow {
  id: string;
  chunk_id: string;
  embedding: number[] | null;
  embedding_provider: string;
  created_at: string;
}

export interface QuizzesRow {
  id: string;
  title: string;
  description: string | null;
  subject_id: string;
  instructions: string | null;
  status: "draft" | "scheduled" | "published" | "closed";
  start_at: string | null;
  due_at: string | null;
  time_limit_minutes: number | null;
  max_attempts: number;
  passing_marks: number | null;
  randomize_questions: boolean;
  randomize_options: boolean;
  immediate_results: boolean;
  negative_marking: boolean;
  negative_marking_fraction: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  target_department_id: string | null;
  target_programme_id: string | null;
  target_academic_year_id: string | null;
  target_year_of_study_id: string | null;
  target_semester_id: string | null;
  target_division_id: string | null;
}

export interface QuizUnitsRow {
  quiz_id: string;
  unit_id: string;
}

export interface QuizQuestionsRow {
  id: string;
  quiz_id: string | null;
  subject_id: string;
  topic_id: string | null;
  question_type: "mcq_single" | "mcq_multiple" | "true_false" | "fill_blank" | "short_answer" | "descriptive";
  prompt: string;
  explanation: string | null;
  marks: number;
  difficulty: "easy" | "medium" | "hard";
  sequence: number;
  is_ai_generated: boolean;
  ai_generation_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface QuestionOptionsRow {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  sequence: number;
  created_at: string;
}

export interface QuizAttemptsRow {
  id: string;
  quiz_id: string;
  student_id: string;
  attempt_number: number;
  started_at: string;
  submitted_at: string | null;
  auto_submitted: boolean;
  time_taken_seconds: number | null;
  created_at: string;
}

export interface QuizAnswersRow {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_ids: string[] | null;
  free_text_answer: string | null;
  is_correct: boolean | null;
  marks_awarded: number | null;
  reviewed_by: string | null;
  reviewer_comment: string | null;
  updated_at: string;
}

export interface QuizResultsRow {
  id: string;
  attempt_id: string;
  total_marks: number;
  marks_obtained: number;
  accuracy: number | null;
  passed: boolean | null;
  weak_topic_ids: string[] | null;
  strong_topic_ids: string[] | null;
  created_at: string;
}

export interface AssignmentsRow {
  id: string;
  title: string;
  instructions: string | null;
  subject_id: string;
  max_marks: number;
  due_at: string;
  allow_multiple_files: boolean;
  allow_resubmission: boolean;
  late_submission_allowed: boolean;
  late_penalty_fraction: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AssignmentAttachmentsRow {
  id: string;
  assignment_id: string;
  file_path: string;
  original_filename: string;
  file_size_bytes: number;
  created_at: string;
}

export interface AssignmentSubmissionsRow {
  id: string;
  assignment_id: string;
  student_id: string;
  status: "not_started" | "submitted" | "late" | "under_review" | "graded" | "resubmission_requested";
  submitted_at: string | null;
  marks_obtained: number | null;
  graded_by: string | null;
  graded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssignmentSubmissionFilesRow {
  id: string;
  submission_id: string;
  file_path: string;
  original_filename: string;
  file_size_bytes: number;
  created_at: string;
}

export interface AssignmentFeedbackRow {
  id: string;
  submission_id: string;
  faculty_id: string;
  comment: string;
  created_at: string;
}

export interface AnnouncementsRow {
  id: string;
  title: string;
  message: string;
  target_department_id: string | null;
  target_semester_id: string | null;
  target_division_id: string | null;
  target_subject_id: string | null;
  priority: "normal" | "important" | "urgent";
  attachment_path: string | null;
  publish_at: string;
  expires_at: string | null;
  approval_status: "pending" | "approved" | "rejected" | "changes_requested";
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  target_programme_id: string | null;
  target_academic_year_id: string | null;
  target_year_of_study_id: string | null;
}

export interface DiscussionsRow {
  id: string;
  subject_id: string;
  title: string;
  body: string;
  created_by: string;
  is_reported: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DiscussionRepliesRow {
  id: string;
  discussion_id: string;
  parent_reply_id: string | null;
  body: string;
  created_by: string;
  is_faculty_verified: boolean;
  is_accepted: boolean;
  is_reported: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DiscussionVotesRow {
  id: string;
  reply_id: string;
  user_id: string;
  created_at: string;
}

export interface NotificationsRow {
  id: string;
  user_id: string;
  type: "resource_new" | "resource_approved" | "resource_rejected" | "quiz_published" | "quiz_deadline" | "assignment_published" | "assignment_deadline" | "assignment_graded" | "announcement_posted" | "discussion_reply" | "ai_processing_completed";
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPreferencesRow {
  user_id: string;
  email_enabled: boolean;
  resource_updates: boolean;
  quiz_updates: boolean;
  assignment_updates: boolean;
  announcement_updates: boolean;
  discussion_updates: boolean;
  updated_at: string;
}

export interface StudyPlansRow {
  id: string;
  student_id: string;
  title: string;
  exam_date: string | null;
  daily_hours: number | null;
  preferred_days: string[] | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface StudyPlanTasksRow {
  id: string;
  study_plan_id: string;
  subject_id: string | null;
  topic_id: string | null;
  task_type: string;
  title: string;
  scheduled_date: string;
  duration_minutes: number;
  is_complete: boolean;
  sequence: number;
  created_at: string;
}

export interface AiGenerationsRow {
  id: string;
  user_id: string;
  generation_type: string;
  resource_id: string | null;
  quiz_id: string | null;
  input_params: Json | null;
  output: Json | null;
  status: string;
  created_at: string;
}

export interface AiUsageLogsRow {
  id: string;
  user_id: string;
  feature: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  created_at: string;
}

export interface AuditLogsRow {
  id: string;
  actor_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  metadata: Json | null;
  created_at: string;
}

export interface InstitutionSettingsRow {
  id: string;
  ai_features_enabled: boolean;
  max_upload_size_mb: number;
  ai_requests_per_user_per_day: number;
  allowed_email_domain: string;
  updated_by: string | null;
  updated_at: string;
}

export interface YearsOfStudyRow {
  id: string;
  name: string;
  level: number;
  created_at: string;
}

export interface ClassTeacherAssignmentsRow {
  id: string;
  faculty_id: string | null;
  department_id: string | null;
  programme_id: string | null;
  academic_year_id: string | null;
  year_of_study_id: string | null;
  semester_id: string | null;
  division_id: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  revoked_at: string | null;
  is_active: boolean | null;
}

export interface ClassRepresentativeAssignmentsRow {
  id: string;
  student_id: string | null;
  department_id: string | null;
  programme_id: string | null;
  academic_year_id: string | null;
  year_of_study_id: string | null;
  semester_id: string | null;
  division_id: string | null;
  slot_number: number | null;
  assigned_by: string | null;
  assigned_at: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  revoke_reason: string | null;
  is_active: boolean | null;
}

export interface FacultyTeachingAssignmentsRow {
  id: string;
  faculty_id: string;
  subject_id: string;
  department_id: string;
  programme_id: string;
  academic_year_id: string;
  year_of_study_id: string | null;
  semester_id: string;
  division_id: string;
  assigned_by: string | null;
  assigned_at: string;
  revoked_at: string | null;
  is_active: boolean;
}

export interface ResourceUploadBatchesRow {
  id: string;
  title: string;
  description: string | null;
  subject_id: string;
  uploaded_by: string;
  tags: string | null;
  status: string;
  idempotency_key: string;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResourceClassesRow {
  id: string;
  resource_id: string;
  department_id: string;
  programme_id: string;
  academic_year_id: string;
  year_of_study_id: string | null;
  semester_id: string;
  division_id: string;
  created_at: string;
}

export interface EmailVerificationRequestsRow {
  id: string;
  email: string;
  last_requested_at: string;
  next_allowed_at: string;
  request_count: number;
  last_status: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      institutions: { Row: InstitutionsRow; Insert: Partial<InstitutionsRow>; Update: Partial<InstitutionsRow>; Relationships: [] };
      departments: { Row: DepartmentsRow; Insert: Partial<DepartmentsRow>; Update: Partial<DepartmentsRow>; Relationships: [] };
      programmes: { Row: ProgrammesRow; Insert: Partial<ProgrammesRow>; Update: Partial<ProgrammesRow>; Relationships: [] };
      academic_years: { Row: AcademicYearsRow; Insert: Partial<AcademicYearsRow>; Update: Partial<AcademicYearsRow>; Relationships: [] };
      semesters: { Row: SemestersRow; Insert: Partial<SemestersRow>; Update: Partial<SemestersRow>; Relationships: [] };
      divisions: { Row: DivisionsRow; Insert: Partial<DivisionsRow>; Update: Partial<DivisionsRow>; Relationships: [] };
      profiles: { Row: ProfilesRow; Insert: Partial<ProfilesRow>; Update: Partial<ProfilesRow>; Relationships: [] };
      user_roles: { Row: UserRolesRow; Insert: Partial<UserRolesRow>; Update: Partial<UserRolesRow>; Relationships: [] };
      subjects: { Row: SubjectsRow; Insert: Partial<SubjectsRow>; Update: Partial<SubjectsRow>; Relationships: [] };
      subject_faculty: { Row: SubjectFacultyRow; Insert: Partial<SubjectFacultyRow>; Update: Partial<SubjectFacultyRow>; Relationships: [] };
      subject_enrollments: { Row: SubjectEnrollmentsRow; Insert: Partial<SubjectEnrollmentsRow>; Update: Partial<SubjectEnrollmentsRow>; Relationships: [] };
      units: { Row: UnitsRow; Insert: Partial<UnitsRow>; Update: Partial<UnitsRow>; Relationships: [] };
      topics: { Row: TopicsRow; Insert: Partial<TopicsRow>; Update: Partial<TopicsRow>; Relationships: [] };
      resources: { Row: ResourcesRow; Insert: Partial<ResourcesRow>; Update: Partial<ResourcesRow>; Relationships: [] };
      resource_files: { Row: ResourceFilesRow; Insert: Partial<ResourceFilesRow>; Update: Partial<ResourceFilesRow>; Relationships: [] };
      resource_tags: { Row: ResourceTagsRow; Insert: Partial<ResourceTagsRow>; Update: Partial<ResourceTagsRow>; Relationships: [] };
      resource_approvals: { Row: ResourceApprovalsRow; Insert: Partial<ResourceApprovalsRow>; Update: Partial<ResourceApprovalsRow>; Relationships: [] };
      resource_bookmarks: { Row: ResourceBookmarksRow; Insert: Partial<ResourceBookmarksRow>; Update: Partial<ResourceBookmarksRow>; Relationships: [] };
      resource_views: { Row: ResourceViewsRow; Insert: Partial<ResourceViewsRow>; Update: Partial<ResourceViewsRow>; Relationships: [] };
      resource_downloads: { Row: ResourceDownloadsRow; Insert: Partial<ResourceDownloadsRow>; Update: Partial<ResourceDownloadsRow>; Relationships: [] };
      document_chunks: { Row: DocumentChunksRow; Insert: Partial<DocumentChunksRow>; Update: Partial<DocumentChunksRow>; Relationships: [] };
      document_embeddings: { Row: DocumentEmbeddingsRow; Insert: Partial<DocumentEmbeddingsRow>; Update: Partial<DocumentEmbeddingsRow>; Relationships: [] };
      quizzes: { Row: QuizzesRow; Insert: Partial<QuizzesRow>; Update: Partial<QuizzesRow>; Relationships: [] };
      quiz_units: { Row: QuizUnitsRow; Insert: Partial<QuizUnitsRow>; Update: Partial<QuizUnitsRow>; Relationships: [] };
      quiz_questions: { Row: QuizQuestionsRow; Insert: Partial<QuizQuestionsRow>; Update: Partial<QuizQuestionsRow>; Relationships: [] };
      question_options: { Row: QuestionOptionsRow; Insert: Partial<QuestionOptionsRow>; Update: Partial<QuestionOptionsRow>; Relationships: [] };
      quiz_attempts: { Row: QuizAttemptsRow; Insert: Partial<QuizAttemptsRow>; Update: Partial<QuizAttemptsRow>; Relationships: [] };
      quiz_answers: { Row: QuizAnswersRow; Insert: Partial<QuizAnswersRow>; Update: Partial<QuizAnswersRow>; Relationships: [] };
      quiz_results: { Row: QuizResultsRow; Insert: Partial<QuizResultsRow>; Update: Partial<QuizResultsRow>; Relationships: [] };
      assignments: { Row: AssignmentsRow; Insert: Partial<AssignmentsRow>; Update: Partial<AssignmentsRow>; Relationships: [] };
      assignment_attachments: { Row: AssignmentAttachmentsRow; Insert: Partial<AssignmentAttachmentsRow>; Update: Partial<AssignmentAttachmentsRow>; Relationships: [] };
      assignment_submissions: { Row: AssignmentSubmissionsRow; Insert: Partial<AssignmentSubmissionsRow>; Update: Partial<AssignmentSubmissionsRow>; Relationships: [] };
      assignment_submission_files: { Row: AssignmentSubmissionFilesRow; Insert: Partial<AssignmentSubmissionFilesRow>; Update: Partial<AssignmentSubmissionFilesRow>; Relationships: [] };
      assignment_feedback: { Row: AssignmentFeedbackRow; Insert: Partial<AssignmentFeedbackRow>; Update: Partial<AssignmentFeedbackRow>; Relationships: [] };
      announcements: { Row: AnnouncementsRow; Insert: Partial<AnnouncementsRow>; Update: Partial<AnnouncementsRow>; Relationships: [] };
      discussions: { Row: DiscussionsRow; Insert: Partial<DiscussionsRow>; Update: Partial<DiscussionsRow>; Relationships: [] };
      discussion_replies: { Row: DiscussionRepliesRow; Insert: Partial<DiscussionRepliesRow>; Update: Partial<DiscussionRepliesRow>; Relationships: [] };
      discussion_votes: { Row: DiscussionVotesRow; Insert: Partial<DiscussionVotesRow>; Update: Partial<DiscussionVotesRow>; Relationships: [] };
      notifications: { Row: NotificationsRow; Insert: Partial<NotificationsRow>; Update: Partial<NotificationsRow>; Relationships: [] };
      notification_preferences: { Row: NotificationPreferencesRow; Insert: Partial<NotificationPreferencesRow>; Update: Partial<NotificationPreferencesRow>; Relationships: [] };
      study_plans: { Row: StudyPlansRow; Insert: Partial<StudyPlansRow>; Update: Partial<StudyPlansRow>; Relationships: [] };
      study_plan_tasks: { Row: StudyPlanTasksRow; Insert: Partial<StudyPlanTasksRow>; Update: Partial<StudyPlanTasksRow>; Relationships: [] };
      ai_generations: { Row: AiGenerationsRow; Insert: Partial<AiGenerationsRow>; Update: Partial<AiGenerationsRow>; Relationships: [] };
      ai_usage_logs: { Row: AiUsageLogsRow; Insert: Partial<AiUsageLogsRow>; Update: Partial<AiUsageLogsRow>; Relationships: [] };
      audit_logs: { Row: AuditLogsRow; Insert: Partial<AuditLogsRow>; Update: Partial<AuditLogsRow>; Relationships: [] };
      institution_settings: { Row: InstitutionSettingsRow; Insert: Partial<InstitutionSettingsRow>; Update: Partial<InstitutionSettingsRow>; Relationships: [] };
      years_of_study: { Row: YearsOfStudyRow; Insert: Partial<YearsOfStudyRow>; Update: Partial<YearsOfStudyRow>; Relationships: [] };
      class_teacher_assignments: { Row: ClassTeacherAssignmentsRow; Insert: Partial<ClassTeacherAssignmentsRow>; Update: Partial<ClassTeacherAssignmentsRow>; Relationships: [] };
      class_representative_assignments: { Row: ClassRepresentativeAssignmentsRow; Insert: Partial<ClassRepresentativeAssignmentsRow>; Update: Partial<ClassRepresentativeAssignmentsRow>; Relationships: [] };
      faculty_teaching_assignments: { Row: FacultyTeachingAssignmentsRow; Insert: Partial<FacultyTeachingAssignmentsRow>; Update: Partial<FacultyTeachingAssignmentsRow>; Relationships: [] };
      resource_upload_batches: { Row: ResourceUploadBatchesRow; Insert: Partial<ResourceUploadBatchesRow>; Update: Partial<ResourceUploadBatchesRow>; Relationships: [] };
      resource_classes: { Row: ResourceClassesRow; Insert: Partial<ResourceClassesRow>; Update: Partial<ResourceClassesRow>; Relationships: [] };
      email_verification_requests: { Row: EmailVerificationRequestsRow; Insert: Partial<EmailVerificationRequestsRow>; Update: Partial<EmailVerificationRequestsRow>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      assign_role: {
        Args: { p_user_id: string; p_role: string; p_scope_department_id?: string | null; p_scope_division_id?: string | null };
        Returns: void;
      };
      increment_resource_view_count: { Args: { p_resource_id: string }; Returns: void };
      increment_resource_download_count: { Args: { p_resource_id: string }; Returns: void };
      match_document_chunks: {
        Args: { p_query_embedding: number[]; p_allowed_resource_ids: string[]; p_match_count?: number; p_min_similarity?: number };
        Returns: { chunk_id: string; resource_id: string; content: string; section_reference: string | null; similarity: number }[];
      };
      current_user_role: { Args: Record<string, never>; Returns: string };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_faculty_or_admin: { Args: Record<string, never>; Returns: boolean };
      assign_class_representative: {
        Args: { p_student_id: string; p_class_scope: Json; p_slot_number: number };
        Returns: void;
      };
      revoke_class_representative: {
        Args: { p_assignment_id: string; p_reason: string };
        Returns: void;
      };
      finalize_resource_upload_batch: {
        Args: { p_batch_id: string; p_files: Json; p_class_scopes: Json };
        Returns: string[];
      };
    };
    Enums: Record<string, never>;
  };
}
