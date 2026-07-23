import "server-only";

/**
 * Configurable embedding provider. Switch via EMBEDDING_PROVIDER env var
 * without touching call sites — src/lib/ai/rag.ts and the document
 * processing route only ever call `getEmbedding` / `getEmbeddings`.
 */
export type EmbeddingProvider = "openai" | "voyage" | "anthropic";

const PROVIDER = (process.env.EMBEDDING_PROVIDER as EmbeddingProvider) || "openai";
const API_KEY = process.env.EMBEDDING_API_KEY;

export async function getEmbedding(text: string): Promise<number[]> {
  const [embedding] = await getEmbeddings([text]);
  return embedding;
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (!API_KEY) {
    throw new Error("EMBEDDING_API_KEY is not configured. Document processing and the AI assistant are disabled until it is set.");
  }

  switch (PROVIDER) {
    case "openai":
      return embedWithOpenAi(texts);
    case "voyage":
      return embedWithVoyage(texts);
    case "anthropic":
      // Anthropic does not currently offer a first-party embeddings endpoint;
      // documented here so switching providers is a one-line env change once
      // (or if) one becomes available, rather than a code change.
      throw new Error('EMBEDDING_PROVIDER="anthropic" is not yet supported — use "openai" or "voyage".');
    default:
      throw new Error(`Unknown EMBEDDING_PROVIDER: ${PROVIDER}`);
  }
}

async function embedWithOpenAi(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: texts }),
  });
  if (!res.ok) throw new Error(`Embedding request failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data.map((d) => d.embedding);
}

async function embedWithVoyage(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "voyage-3-lite", input: texts }),
  });
  if (!res.ok) throw new Error(`Embedding request failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data.map((d) => d.embedding);
}
