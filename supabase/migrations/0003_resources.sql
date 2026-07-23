-- ============================================================================
-- 0003: Resource Library (+ AI document chunks/embeddings for RAG)
-- ============================================================================

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  resource_type public.resource_type not null,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  unit_id uuid references public.units(id),
  topic_id uuid references public.topics(id),
  academic_year_id uuid references public.academic_years(id),
  semester_id uuid references public.semesters(id),
  uploaded_by uuid not null references public.profiles(id),
  approval_status public.approval_status not null default 'pending',
  is_verified boolean not null default false, -- true only for Faculty-uploaded/approved content
  is_cr_contributed boolean not null default false,
  external_url text, -- for youtube/website links
  file_path text, -- storage object path (private bucket) when not a link
  file_size_bytes bigint,
  mime_type text,
  view_count int not null default 0,
  download_count int not null default 0,
  ai_processing_status public.ai_processing_status not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (file_path is not null or external_url is not null)
);
create index resources_subject_idx on public.resources(subject_id);
create index resources_status_idx on public.resources(approval_status);
create index resources_search_idx on public.resources using gin (to_tsvector('english', title || ' ' || coalesce(description, '')));

create table public.resource_files (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  file_path text not null,
  original_filename text not null,
  mime_type text not null,
  file_size_bytes bigint not null,
  created_at timestamptz not null default now()
);

create table public.resource_tags (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  tag text not null,
  unique (resource_id, tag)
);
create index resource_tags_tag_idx on public.resource_tags(tag);

create table public.resource_approvals (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  status public.approval_status not null,
  comment text,
  created_at timestamptz not null default now()
);

create table public.resource_bookmarks (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (resource_id, user_id)
);

create table public.resource_views (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index resource_views_resource_idx on public.resource_views(resource_id);

create table public.resource_downloads (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index resource_downloads_resource_idx on public.resource_downloads(resource_id);

-- RAG pipeline
create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  section_reference text, -- e.g. "Page 4" or "Unit 2 > Topic 1"
  token_count int,
  created_at timestamptz not null default now(),
  unique (resource_id, chunk_index)
);

create table public.document_embeddings (
  id uuid primary key default gen_random_uuid(),
  chunk_id uuid not null references public.document_chunks(id) on delete cascade,
  embedding vector(1536),
  embedding_provider text not null,
  created_at timestamptz not null default now()
);
create index document_embeddings_vector_idx on public.document_embeddings
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);
