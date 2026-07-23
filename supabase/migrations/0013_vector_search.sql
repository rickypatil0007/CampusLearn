-- ============================================================================
-- 0013: Vector similarity search RPC for the grounded RAG assistant.
--
-- SECURITY: `p_allowed_resource_ids` is computed and passed in by the
-- server BEFORE this function runs (see src/lib/ai/rag.ts) — the permission
-- filter is applied as a SQL WHERE clause on resource_id, not as a
-- post-filter on results, so unauthorized chunks are never even scored
-- against the query vector.
-- ============================================================================

create or replace function public.match_document_chunks(
  p_query_embedding vector(1536),
  p_allowed_resource_ids uuid[],
  p_match_count int default 6,
  p_min_similarity float default 0.5
)
returns table (
  chunk_id uuid,
  resource_id uuid,
  content text,
  section_reference text,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    dc.id as chunk_id,
    dc.resource_id,
    dc.content,
    dc.section_reference,
    1 - (de.embedding <=> p_query_embedding) as similarity
  from public.document_embeddings de
  join public.document_chunks dc on dc.id = de.chunk_id
  where dc.resource_id = any(p_allowed_resource_ids)
    and 1 - (de.embedding <=> p_query_embedding) >= p_min_similarity
  order by de.embedding <=> p_query_embedding
  limit p_match_count;
$$;
