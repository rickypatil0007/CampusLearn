-- ============================================================================
-- 0022: RLS audit pass — close gaps found while implementing the Faculty
-- Management / multi-class-upload update, and add class-scoped visibility
-- for resources and announcements (spec sections 15, 18).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. class_teacher_assignments / class_representative_assignments (0017)
-- had NO RLS enabled at all — any authenticated (and possibly anon,
-- depending on default grants) client could read or write these tables
-- directly, bypassing every check in assign_class_representative /
-- revoke_class_representative and the admin-only Server Actions. Closing
-- this gap: SELECT stays broad (consistent with profiles_select_all_
-- authenticated, already broad for the same small-institution reasons),
-- direct writes are restricted to admins; the CR assign/revoke RPCs are
-- SECURITY DEFINER and are unaffected by this since they bypass RLS.
-- ---------------------------------------------------------------------------
alter table public.class_teacher_assignments enable row level security;
create policy "cta_select_authenticated" on public.class_teacher_assignments for select to authenticated using (true);
create policy "cta_write_admin" on public.class_teacher_assignments for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.class_representative_assignments enable row level security;
create policy "cra_select_authenticated" on public.class_representative_assignments for select to authenticated using (true);
create policy "cra_write_admin" on public.class_representative_assignments for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. New tables from this update
-- ---------------------------------------------------------------------------
alter table public.faculty_teaching_assignments enable row level security;
create policy "fta_select_authenticated" on public.faculty_teaching_assignments for select to authenticated using (true);
create policy "fta_write_admin" on public.faculty_teaching_assignments for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.resource_upload_batches enable row level security;
create policy "rub_select" on public.resource_upload_batches for select to authenticated using (
  uploaded_by = auth.uid() or public.is_faculty_or_admin()
);
create policy "rub_insert" on public.resource_upload_batches for insert to authenticated with check (
  uploaded_by = auth.uid() and public.current_user_role() in ('class_rep','faculty','dept_admin','super_admin')
);
create policy "rub_update_own" on public.resource_upload_batches for update to authenticated using (
  uploaded_by = auth.uid() or public.is_admin()
) with check (
  uploaded_by = auth.uid() or public.is_admin()
);

alter table public.resource_classes enable row level security;
create policy "resource_classes_select" on public.resource_classes for select to authenticated using (
  exists (select 1 from public.resources r where r.id = resource_id and (r.approval_status = 'approved' or r.uploaded_by = auth.uid() or public.is_faculty_or_admin()))
);
create policy "resource_classes_write" on public.resource_classes for all to authenticated using (
  exists (select 1 from public.resources r where r.id = resource_id and (r.uploaded_by = auth.uid() or public.is_faculty_or_admin()))
) with check (
  exists (select 1 from public.resources r where r.id = resource_id and (r.uploaded_by = auth.uid() or public.is_faculty_or_admin()))
);

-- ---------------------------------------------------------------------------
-- 3. Resources: class-scoped visibility. A resource with resource_classes
-- rows is only visible to students/CRs whose own class matches one of the
-- mapped classes. A resource with NO resource_classes rows (every resource
-- created before this migration, and any future single-file upload that
-- doesn't go through the batch flow) keeps the previous subject-wide
-- visibility rule so nothing that worked before this migration breaks.
-- ---------------------------------------------------------------------------
drop policy if exists "resources_select" on public.resources;
create policy "resources_select_scoped" on public.resources for select to authenticated using (
  uploaded_by = auth.uid()
  or public.is_faculty_or_admin()
  or (
    approval_status = 'approved'
    and (
      not exists (select 1 from public.resource_classes rc where rc.resource_id = resources.id)
      or exists (
        select 1 from public.resource_classes rc
        join public.profiles p on p.id = auth.uid()
        where rc.resource_id = resources.id
          and rc.department_id = p.department_id
          and rc.programme_id = p.programme_id
          and rc.academic_year_id = p.academic_year_id
          and rc.semester_id = p.semester_id
          and rc.division_id = p.division_id
      )
    )
  )
);

-- ---------------------------------------------------------------------------
-- 4. Announcements: the previous policy showed every approved announcement
-- to every authenticated user regardless of target_* scope. Restrict to
-- announcements whose non-null target columns match the viewer's own
-- profile (a null target column means "not restricted at that level").
-- ---------------------------------------------------------------------------
drop policy if exists "announcements_select" on public.announcements;
create policy "announcements_select_scoped" on public.announcements for select to authenticated using (
  public.is_faculty_or_admin()
  or created_by = auth.uid()
  or (
    approval_status = 'approved'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (announcements.target_department_id is null or announcements.target_department_id = p.department_id)
        and (announcements.target_programme_id is null or announcements.target_programme_id = p.programme_id)
        and (announcements.target_academic_year_id is null or announcements.target_academic_year_id = p.academic_year_id)
        and (announcements.target_year_of_study_id is null or announcements.target_year_of_study_id = p.year_of_study_id)
        and (announcements.target_semester_id is null or announcements.target_semester_id = p.semester_id)
        and (announcements.target_division_id is null or announcements.target_division_id = p.division_id)
        and (
          announcements.target_subject_id is null
          or exists (
            select 1 from public.subject_enrollments se
            where se.subject_id = announcements.target_subject_id and se.student_id = p.id
          )
        )
    )
  )
);

-- ---------------------------------------------------------------------------
-- 5. CR announcements publish immediately for their own class (spec
-- sections 1, 8, 12) — no approval step, and the insert must carry the
-- CR's own class scope, never an institution-wide or other-class target.
-- The Server Action (announcements/_actions.ts) derives the scope from the
-- CR's active class_representative_assignment server-side; this policy is
-- the defense-in-depth backstop that rejects it at the database layer too
-- if that ever drifts.
-- ---------------------------------------------------------------------------
drop policy if exists "announcements_insert" on public.announcements;
create policy "announcements_insert_scoped" on public.announcements for insert to authenticated with check (
  created_by = auth.uid()
  and (
    public.is_faculty_or_admin()
    or (
      public.current_user_role() = 'class_rep'
      and target_subject_id is null
      and exists (
        select 1 from public.class_representative_assignments cra
        where cra.student_id = auth.uid() and cra.is_active = true
          and cra.department_id = announcements.target_department_id
          and cra.programme_id = announcements.target_programme_id
          and cra.academic_year_id = announcements.target_academic_year_id
          and cra.semester_id = announcements.target_semester_id
          and cra.division_id = announcements.target_division_id
      )
    )
  )
);
