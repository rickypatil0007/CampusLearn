-- ============================================================================
-- 0012: Atomic counter helpers (avoid read-then-write races on view/download counts)
-- ============================================================================

create or replace function public.increment_resource_view_count(p_resource_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.resources set view_count = view_count + 1 where id = p_resource_id;
$$;

create or replace function public.increment_resource_download_count(p_resource_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.resources set download_count = download_count + 1 where id = p_resource_id;
$$;
