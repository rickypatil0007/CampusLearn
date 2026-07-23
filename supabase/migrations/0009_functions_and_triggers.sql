-- ============================================================================
-- 0009: Functions & Triggers
-- ============================================================================

-- Generic updated_at maintenance
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  for t in
    select unnest(array[
      'institutions','departments','programmes','profiles','subjects','units','topics',
      'resources','quizzes','quiz_questions','assignments','assignment_submissions',
      'announcements','discussions','discussion_replies','notification_preferences','study_plans'
    ])
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end $$;

-- Effective role helper used throughout RLS policies. SECURITY DEFINER so it
-- can read profiles regardless of the calling policy context, but it only
-- ever returns the caller's own role by construction (auth.uid()).
create or replace function public.current_user_role()
returns public.role_type
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select role in ('dept_admin','super_admin') from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_faculty_or_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select role in ('faculty','dept_admin','super_admin') from public.profiles where id = auth.uid()), false);
$$;

-- ----------------------------------------------------------------------------
-- New user provisioning. Fires on auth.users insert (i.e. every sign-up,
-- whether via the public form, invite, or the Supabase dashboard). Re-checks
-- the institutional email domain server-side as defense-in-depth even though
-- the application layer already validates it before calling signUp() — this
-- guarantees no path (including direct Admin API calls) can create a
-- profile with a disallowed domain, and always assigns the 'student' role
-- regardless of any role metadata a client might attempt to pass.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed_domain text;
  email_domain text;
  normalized_email text;
begin
  select allowed_email_domain into allowed_domain from public.institution_settings limit 1;
  if allowed_domain is null then
    allowed_domain := 'tcetmumbai.in';
  end if;

  normalized_email := lower(trim(new.email));
  email_domain := split_part(normalized_email, '@', 2);

  if email_domain is distinct from allowed_domain then
    raise exception 'CampusLearn is currently available only to users with a valid @% institutional email address.', allowed_domain;
  end if;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', normalized_email),
    normalized_email,
    'student'
  )
  on conflict (id) do nothing;

  insert into public.notification_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Role change function: the ONLY sanctioned way to change a user's role.
-- Must be called by an authenticated dept_admin/super_admin (or, for
-- class_rep grants, faculty/admin) — enforced inside the function, not just
-- by RLS, so it is safe even if exposed via RPC. Writes an audit_logs row.
-- ----------------------------------------------------------------------------
create or replace function public.assign_role(
  p_user_id uuid,
  p_role public.role_type,
  p_scope_department_id uuid default null,
  p_scope_division_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.role_type;
begin
  caller_role := public.current_user_role();

  if p_role = 'class_rep' and caller_role not in ('faculty','dept_admin','super_admin') then
    raise exception 'Only Faculty or Administrators can assign the Class Representative role.';
  elsif p_role in ('faculty','dept_admin') and caller_role not in ('dept_admin','super_admin') then
    raise exception 'Only Administrators can assign Faculty or Department Administrator roles.';
  elsif p_role = 'super_admin' and caller_role <> 'super_admin' then
    raise exception 'Only a Super Administrator can grant the Super Administrator role.';
  elsif p_role = 'student' and caller_role not in ('faculty','dept_admin','super_admin') then
    raise exception 'Not authorized to change roles.';
  end if;

  update public.profiles set role = p_role where id = p_user_id;

  insert into public.user_roles (user_id, role, scope_department_id, scope_division_id, assigned_by)
  values (p_user_id, p_role, p_scope_department_id, p_scope_division_id, auth.uid());

  insert into public.audit_logs (actor_id, action, target_table, target_id, metadata)
  values (auth.uid(), 'role_change', 'profiles', p_user_id, jsonb_build_object('new_role', p_role));
end;
$$;
