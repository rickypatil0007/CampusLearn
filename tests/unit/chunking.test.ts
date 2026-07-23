import { describe, it, expect } from "vitest";
import { chunkText } from "@/lib/ai/chunking";

describe("chunkText", () => {
  it("returns an empty array for empty input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   ")).toEqual([]);
  });

  it("returns a single chunk for short text", () => {
    const chunks = chunkText("This is a short document.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe("This is a short document.");
  });

  it("splits long text into multiple chunks with sequential indices", () => {
    const longText = Array.from({ length: 50 }, (_, i) => `Paragraph ${i} contains several sentences of filler content to pad this out. It repeats a bit.`).join("\n\n");
    const chunks = chunkText(longText, 100, 20);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c, i) => expect(c.index).toBe(i));
  });

  it("keeps chunk content non-empty", () => {
    const longText = "Sentence one. ".repeat(500);
    const chunks = chunkText(longText, 200, 20);
    for (const c of chunks) expect(c.content.trim().length).toBeGreaterThan(0);
  });
});
