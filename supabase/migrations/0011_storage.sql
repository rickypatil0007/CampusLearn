-- ============================================================================
-- 0011: Storage buckets (private) + policies
-- All buckets are private; the app issues short-lived signed URLs after an
-- authorization check in a Server Action / Route Handler. No bucket is public.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('resources', 'resources', false, 26214400, array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png'
  ]),
  ('assignments', 'assignments', false, 26214400, array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png'
  ]),
  ('submissions', 'submissions', false, 26214400, array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'image/jpeg',
    'image/png'
  ]),
  ('avatars', 'avatars', false, 5242880, array['image/jpeg','image/png']),
  ('syllabus', 'syllabus', false, 26214400, array['application/pdf']),
  ('announcements', 'announcements', false, 10485760, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do nothing;

-- Only authenticated users can touch storage; fine-grained authorization
-- (ownership, approval status, subject enrollment) is enforced by the
-- Server Action that generates signed URLs, using the service-role client.
-- These policies stop any client from reading/writing objects directly.
create policy "storage_authenticated_read" on storage.objects
  for select to authenticated using (bucket_id in ('resources','assignments','submissions','avatars','syllabus','announcements'));

create policy "storage_authenticated_insert_own_folder" on storage.objects
  for insert to authenticated with check (
    bucket_id in ('resources','assignments','submissions','avatars','syllabus','announcements')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_authenticated_delete_own_folder" on storage.objects
  for delete to authenticated using (
    (storage.foldername(name))[1] = auth.uid()::text
  );
