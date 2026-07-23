-- ============================================================================
-- 0001: Extensions & Enum Types
-- ============================================================================
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
create extension if not exists "vector";

create type public.role_type as enum (
  'student', 'class_rep', 'faculty', 'dept_admin', 'super_admin'
);

create type public.approval_status as enum (
  'pending', 'approved', 'rejected', 'changes_requested'
);

create type public.resource_type as enum (
  'lecture_notes', 'presentation_slides', 'lab_manual', 'assignment_sheet',
  'question_bank', 'previous_year_paper', 'model_answer', 'formula_sheet',
  'reference_material', 'youtube_link', 'useful_website', 'syllabus', 'revision_notes'
);

create type public.ai_processing_status as enum (
  'not_started', 'processing', 'completed', 'failed'
);

create type public.quiz_status as enum ('draft', 'scheduled', 'published', 'closed');

create type public.question_type as enum (
  'mcq_single', 'mcq_multiple', 'true_false', 'fill_blank', 'short_answer', 'descriptive'
);

create type public.difficulty_level as enum ('easy', 'medium', 'hard');

create type public.assignment_submission_status as enum (
  'not_started', 'submitted', 'late', 'under_review', 'graded', 'resubmission_requested'
);

create type public.announcement_priority as enum ('normal', 'important', 'urgent');

create type public.notification_type as enum (
  'resource_new', 'resource_approved', 'resource_rejected', 'quiz_published',
  'quiz_deadline', 'assignment_published', 'assignment_deadline', 'assignment_graded',
  'announcement_posted', 'discussion_reply', 'ai_processing_completed'
);
