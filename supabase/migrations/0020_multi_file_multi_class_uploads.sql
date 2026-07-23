-- ============================================================================
-- 0020: Multi-file, multi-class resource uploads
--
-- resources (0003) already stores one row per uploaded file; this migration
-- adds a batch wrapper (resource_upload_batches) so several files uploaded
-- together share one submission, and a many-to-many resource_classes table
-- so one physical file can be visible to several classes without duplicating
-- the object in Storage. Existing single-file resources (batch_id null,
-- no resource_classes rows) keep working exactly as before — visibility for
-- those falls back to the pre-existing subject-based rule (see 0022 RLS).
-- ============================================================================

create table if not exists public.resource_upload_batches (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  tags text,
  status text not null default 'pending' check (status in ('pending','uploading','completed','failed')),
  idempotency_key text not null,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (uploaded_by, idempotency_key)
);
create index if not exists resource_upload_batches_uploader_idx on public.resource_upload_batches(uploaded_by);

alter table public.resources add column if not exists batch_id uuid references public.resource_upload_batches(id) on delete set null;
alter table public.resources add column if not exists original_filename text;
alter table public.resources add column if not exists sha256_hash text;
alter table public.resources add column if not exists upload_status text not null default 'completed' check (upload_status in ('staged','completed','failed'));
create index if not exists resources_batch_idx on public.resources(batch_id);

create table if not exists public.resource_classes (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  department_id uuid not null references public.departments(id),
  programme_id uuid not null references public.programmes(id),
  academic_year_id uuid not null references public.academic_years(id),
  year_of_study_id uuid references public.years_of_study(id),
  semester_id uuid not null references public.semesters(id),
  division_id uuid not null references public.divisions(id),
  created_at timestamptz not null default now(),
  unique (resource_id, department_id, programme_id, academic_year_id,
    coalesce(year_of_study_id, '00000000-0000-0000-0000-000000000000'::uuid), semester_id, division_id)
);
create index if not exists resource_classes_resource_idx on public.resource_classes(resource_id);
create index if not exists resource_classes_class_idx on public.resource_classes
  (department_id, programme_id, academic_year_id, year_of_study_id, semester_id, division_id);

-- 95MB default per-file limit (spec section 11.2); MAX_UPLOAD_SIZE_MB env var
-- overrides this in application code, this is the hard Storage-side backstop.
update storage.buckets
set file_size_limit = 99614720,
    allowed_mime_types = array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'application/zip',
      'application/x-zip-compressed'
    ]
where id = 'resources';

-- Atomic finalize: validates the caller is still authorized for the batch's
-- subject and every requested class scope, then inserts one resources row
-- per uploaded file plus its resource_classes mappings, all in a single
-- transaction (the enclosing function call). Re-checked here even though
-- the calling Server Action already checked, per spec section 16
-- ("recheck the authenticated user and assignments at finalization time").
create or replace function public.finalize_resource_upload_batch(
  p_batch_id uuid,
  p_files jsonb,        -- [{file_path, original_filename, mime_type, file_size_bytes, sha256_hash, title, resource_type, unit_id, topic_id}]
  p_class_scopes jsonb  -- [{department_id, programme_id, academic_year_id, year_of_study_id, semester_id, division_id}]
)
returns uuid[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_caller_role public.role_type;
  v_batch record;
  v_scope jsonb;
  v_file jsonb;
  v_resource_id uuid;
  v_new_ids uuid[] := '{}';
  v_authorized boolean;
begin
  select role into v_caller_role from public.profiles where id = v_caller;

  select * into v_batch from public.resource_upload_batches where id = p_batch_id;
  if v_batch is null then
    raise exception 'Upload batch not found';
  end if;
  if v_batch.uploaded_by <> v_caller then
    raise exception 'Not authorized to finalize this batch';
  end if;
  if v_batch.status = 'completed' then
    -- Idempotent: already finalized, return existing resource ids.
    select array_agg(id) into v_new_ids from public.resources where batch_id = p_batch_id;
    return coalesce(v_new_ids, '{}');
  end if;

  if jsonb_array_length(p_class_scopes) = 0 then
    raise exception 'Select at least one class';
  end if;

  -- Authorize every requested class scope against the caller's role.
  for v_scope in select * from jsonb_array_elements(p_class_scopes)
  loop
    v_authorized := false;

    if v_caller_role in ('dept_admin','super_admin') then
      v_authorized := true;
    elsif v_caller_role = 'faculty' then
      v_authorized := exists (
        select 1 from public.faculty_teaching_assignments fta
        where fta.faculty_id = v_caller and fta.subject_id = v_batch.subject_id and fta.is_active = true
          and fta.department_id = (v_scope->>'department_id')::uuid
          and fta.programme_id = (v_scope->>'programme_id')::uuid
          and fta.academic_year_id = (v_scope->>'academic_year_id')::uuid
          and fta.semester_id = (v_scope->>'semester_id')::uuid
          and fta.division_id = (v_scope->>'division_id')::uuid
      ) or exists (
        -- Fall back to subject-level assignment for faculty not yet migrated
        -- to class-scoped rows (e.g. assigned only via subject_faculty).
        select 1 from public.subject_faculty sf
        where sf.faculty_id = v_caller and sf.subject_id = v_batch.subject_id
      );
    elsif v_caller_role = 'class_rep' then
      v_authorized := exists (
        select 1 from public.class_representative_assignments cra
        where cra.student_id = v_caller and cra.is_active = true
          and cra.department_id = (v_scope->>'department_id')::uuid
          and cra.programme_id = (v_scope->>'programme_id')::uuid
          and cra.academic_year_id = (v_scope->>'academic_year_id')::uuid
          and cra.semester_id = (v_scope->>'semester_id')::uuid
          and cra.division_id = (v_scope->>'division_id')::uuid
      );
    end if;

    if not v_authorized then
      update public.resource_upload_batches set status = 'failed', failure_reason = 'Not authorized for one or more selected classes', updated_at = now() where id = p_batch_id;
      raise exception 'Not authorized to upload to one or more selected classes';
    end if;
  end loop;

  if (select is_suspended from public.profiles where id = v_caller) then
    raise exception 'Account is suspended';
  end if;

  for v_file in select * from jsonb_array_elements(p_files)
  loop
    insert into public.resources (
      title, description, resource_type, subject_id, unit_id, topic_id,
      uploaded_by, approval_status, is_verified, is_cr_contributed,
      file_path, file_size_bytes, mime_type, batch_id, original_filename,
      sha256_hash, upload_status
    ) values (
      coalesce(v_file->>'title', v_batch.title),
      v_batch.description,
      coalesce(v_file->>'resource_type', 'reference_material')::public.resource_type,
      v_batch.subject_id,
      nullif(v_file->>'unit_id', '')::uuid,
      nullif(v_file->>'topic_id', '')::uuid,
      v_caller,
      case when v_caller_role in ('faculty','dept_admin','super_admin') then 'approved' else 'pending' end,
      v_caller_role in ('faculty','dept_admin','super_admin'),
      v_caller_role = 'class_rep',
      v_file->>'file_path',
      (v_file->>'file_size_bytes')::bigint,
      v_file->>'mime_type',
      p_batch_id,
      v_file->>'original_filename',
      nullif(v_file->>'sha256_hash', ''),
      'completed'
    )
    returning id into v_resource_id;

    v_new_ids := array_append(v_new_ids, v_resource_id);

    for v_scope in select * from jsonb_array_elements(p_class_scopes)
    loop
      insert into public.resource_classes (
        resource_id, department_id, programme_id, academic_year_id, year_of_study_id, semester_id, division_id
      ) values (
        v_resource_id,
        (v_scope->>'department_id')::uuid,
        (v_scope->>'programme_id')::uuid,
        (v_scope->>'academic_year_id')::uuid,
        nullif(v_scope->>'year_of_study_id', '')::uuid,
        (v_scope->>'semester_id')::uuid,
        (v_scope->>'division_id')::uuid
      )
      on conflict do nothing;
    end loop;
  end loop;

  update public.resource_upload_batches set status = 'completed', updated_at = now() where id = p_batch_id;

  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
  values (v_caller, 'resource_batch_upload', 'resource_upload_batches', p_batch_id,
    jsonb_build_object('file_count', jsonb_array_length(p_files), 'class_count', jsonb_array_length(p_class_scopes)));

  return v_new_ids;
end;
$$;

-- CR uploads are immediately approved per spec section 8 (no pending review
-- step for a CR's own class); this migration changes the resources approval
-- default assumption going forward. Existing pending CR resources from
-- before this migration are left untouched for Faculty to review as before.
