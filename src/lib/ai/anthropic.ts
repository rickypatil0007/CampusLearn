import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

/** Server-only Anthropic client. Never import this module from a Client Component. */
export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured. AI features are disabled until it is set.");
  }
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export const CLAUDE_MODEL = "claude-sonnet-4-5";

/** Rough cost estimate for logging — update with real published rates as needed. */
export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  const inputRate = 3 / 1_000_000; // $3 / M input tokens
  const outputRate = 15 / 1_000_000; // $15 / M output tokens
  return inputTokens * inputRate + outputTokens * outputRate;
}
