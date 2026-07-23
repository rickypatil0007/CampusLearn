/**
 * Splits document text into overlapping chunks suitable for embedding.
 * Pure function, no I/O — kept separate from extraction/storage so it can
 * be unit tested directly (see tests/unit/chunking.test.ts).
 */
export interface Chunk {
  content: string;
  index: number;
  sectionReference?: string;
}

const APPROX_CHARS_PER_TOKEN = 4;

export function chunkText(text: string, maxTokens = 800, overlapTokens = 100): Chunk[] {
  const maxChars = maxTokens * APPROX_CHARS_PER_TOKEN;
  const overlapChars = overlapTokens * APPROX_CHARS_PER_TOKEN;
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const chunks: Chunk[] = [];
  let start = 0;
  let index = 0;

  while (start < normalized.length) {
    let end = Math.min(start + maxChars, normalized.length);
    // Prefer to break on a paragraph or sentence boundary near the end.
    if (end < normalized.length) {
      const paragraphBreak = normalized.lastIndexOf("\n\n", end);
      const sentenceBreak = normalized.lastIndexOf(". ", end);
      const breakPoint = Math.max(paragraphBreak, sentenceBreak);
      if (breakPoint > start + maxChars * 0.5) end = breakPoint + 1;
    }

    const content = normalized.slice(start, end).trim();
    if (content) chunks.push({ content, index });

    index += 1;
    start = end - overlapChars;
    if (start <= 0 || end >= normalized.length) start = end;
    if (end >= normalized.length) break;
  }

  return chunks;
}
