import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractText } from "@/lib/ai/document-extraction";
import { chunkText } from "@/lib/ai/chunking";
import { getEmbeddings } from "@/lib/ai/embeddings";

/**
 * Triggered by Faculty/Admin after approving a resource (or manually via
 * the resource detail page). Extracts text, chunks it, generates
 * embeddings, and stores them for the RAG assistant. Idempotent — clears
 * any prior chunks for the resource before reprocessing.
 */
export async function POST(request: Request) {
  try {
    await requirePermission("resource.approve");
    const { resourceId } = (await request.json()) as { resourceId: string };
    if (!resourceId) return NextResponse.json({ error: "resourceId is required." }, { status: 400 });

    const supabase = await createClient();
    const { data: resource } = await supabase
      .from("resources")
      .select("id, file_path, mime_type, approval_status")
      .eq("id", resourceId)
      .single();

    if (!resource || !resource.file_path) return NextResponse.json({ error: "Resource has no file to process." }, { status: 404 });
    if (resource.approval_status !== "approved") return NextResponse.json({ error: "Only approved resources can be processed." }, { status: 400 });

    await supabase.from("resources").update({ ai_processing_status: "processing" }).eq("id", resourceId);

    const admin = createAdminClient();
    const { data: file, error: downloadError } = await admin.storage.from("resources").download(resource.file_path);
    if (downloadError || !file) throw new Error(downloadError?.message ?? "Could not download file.");

    const buffer = await file.arrayBuffer();
    const text = await extractText(buffer, resource.mime_type ?? "");
    const chunks = chunkText(text);
    if (chunks.length === 0) throw new Error("No extractable text found in this document.");

    await supabase.from("document_chunks").delete().eq("resource_id", resourceId);

    const { data: insertedChunks, error: chunkError } = await supabase
      .from("document_chunks")
      .insert(chunks.map((c) => ({ resource_id: resourceId, chunk_index: c.index, content: c.content, section_reference: c.sectionReference ?? `Chunk ${c.index + 1}` })))
      .select("id, content");
    if (chunkError || !insertedChunks) throw new Error(chunkError?.message ?? "Could not store chunks.");

    const embeddings = await getEmbeddings(insertedChunks.map((c) => c.content));
    await supabase.from("document_embeddings").insert(
      insertedChunks.map((c, i) => ({ chunk_id: c.id, embedding: embeddings[i], embedding_provider: process.env.EMBEDDING_PROVIDER || "openai" }))
    );

    await supabase.from("resources").update({ ai_processing_status: "completed" }).eq("id", resourceId);
    await supabase.from("notifications").insert({
      user_id: (await supabase.from("resources").select("uploaded_by").eq("id", resourceId).single()).data?.uploaded_by,
      type: "ai_processing_completed", title: "AI processing complete", body: "This resource is now searchable by the AI assistant.", link: `/resources/${resourceId}`,
    });

    return NextResponse.json({ ok: true, chunks: insertedChunks.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed.";
    try {
      const { resourceId } = (await request.clone().json()) as { resourceId?: string };
      if (resourceId) {
        const supabase = await createClient();
        await supabase.from("resources").update({ ai_processing_status: "failed" }).eq("id", resourceId);
      }
    } catch {
      // best-effort status update only
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
