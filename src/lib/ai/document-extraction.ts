import "server-only";

/**
 * Extracts plain text from an uploaded document buffer based on MIME type.
 * Treat the extracted text as untrusted content from here on — it is
 * never executed as instructions (see rag.ts's system prompt) and is only
 * ever displayed or embedded.
 */
export async function extractText(buffer: ArrayBuffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(Buffer.from(buffer));
    return result.text;
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return result.value;
  }

  if (mimeType === "text/plain") {
    return Buffer.from(buffer).toString("utf-8");
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
    // PPTX text extraction is intentionally out of scope for this build —
    // documented as a known limitation in README. Slides can still be
    // uploaded and downloaded; they are just not processed for AI/RAG.
    throw new Error("PPTX text extraction is not yet implemented.");
  }

  throw new Error(`Unsupported MIME type for extraction: ${mimeType}`);
}
