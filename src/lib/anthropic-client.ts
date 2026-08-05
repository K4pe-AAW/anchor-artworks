import Anthropic from "@anthropic-ai/sdk";

let cachedClient: Anthropic | null = null;

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getAnthropicClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!cachedClient) {
    cachedClient = new Anthropic();
  }
  return cachedClient;
}
