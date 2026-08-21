import { randomUUID } from "node:crypto";
import { callUniversalSystem } from "./universal-systems";
import { registerInternalServices } from "../services/internal-services";

export type ProviderName = "openai" | "anthropic" | "gemini";
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type ProviderResult = { text: string; tokensIn: number; tokensOut: number; provider: ProviderName; model: string };

export const MODEL_PRICING: Record<string, { input: number; output: number; provider: ProviderName }> = {
  "gpt-5-nano": { input: 0.0000001, output: 0.0000004, provider: "openai" },
  "gpt-5.6-luna": { input: 0.0000002, output: 0.000001, provider: "openai" },
  "gpt-5.6-terra": { input: 0.0000015, output: 0.000006, provider: "openai" },
  "claude-haiku-4-5": { input: 0.000001, output: 0.000005, provider: "anthropic" },
  "claude-sonnet-4-6": { input: 0.000003, output: 0.000015, provider: "anthropic" },
  "claude-opus-5": { input: 0.000005, output: 0.000025, provider: "anthropic" },
  "gemini-2.5-flash": { input: 0.0000003, output: 0.0000025, provider: "gemini" },
  "gemini-3.1-pro-preview": { input: 0.00000125, output: 0.000005, provider: "gemini" },
};

export function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING["gpt-5.6-luna"];
  return tokensIn * pricing.input + tokensOut * pricing.output;
}

function tokenEstimate(messages: ChatMessage[]) {
  return Math.max(1, Math.ceil(messages.reduce((sum, message) => sum + message.content.length, 0) / 4));
}

async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await operation(); } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Provider request failed.");
}

let providerRegistration: Promise<unknown> | undefined;
function ensureProviderSystems() {
  providerRegistration ??= registerInternalServices();
  return providerRegistration;
}

async function callOpenAI(model: string, messages: ChatMessage[]): Promise<ProviderResult> {
  await ensureProviderSystems();
  const response = await withRetry(() => callUniversalSystem("replit-ai-openai", "/chat/completions", { model, max_completion_tokens: 8192, messages }, randomUUID())).then((result) => result.result as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } });
  const text = response.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI returned an empty response.");
  return { text, tokensIn: response.usage?.prompt_tokens ?? tokenEstimate(messages), tokensOut: response.usage?.completion_tokens ?? Math.ceil(text.length / 4), provider: "openai", model };
}

async function callAnthropic(model: string, messages: ChatMessage[]): Promise<ProviderResult> {
  const system = messages.find((message) => message.role === "system")?.content;
  const body = {
    model,
    max_tokens: 8192,
    system,
    messages: messages.filter((message) => message.role !== "system").map((message) => ({ role: message.role, content: message.content })),
  };
  const response = await withRetry(async () => {
    await ensureProviderSystems();
    return (await callUniversalSystem("replit-ai-anthropic", "/v1/messages", body, randomUUID())).result as { content?: Array<{ type: string; text?: string }>; usage?: { input_tokens?: number; output_tokens?: number } };
  });
  const text = response.content?.find((block) => block.type === "text")?.text?.trim();
  if (!text) throw new Error("Anthropic returned an empty response.");
  return { text, tokensIn: response.usage?.input_tokens ?? tokenEstimate(messages), tokensOut: response.usage?.output_tokens ?? Math.ceil(text.length / 4), provider: "anthropic", model };
}

async function callGemini(model: string, messages: ChatMessage[]): Promise<ProviderResult> {
  const contents = messages.filter((message) => message.role !== "system").map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
  const system = messages.find((message) => message.role === "system")?.content;
  const response = await withRetry(async () => {
    await ensureProviderSystems();
    return (await callUniversalSystem("replit-ai-gemini", `/models/${model}:generateContent`, { systemInstruction: system ? { parts: [{ text: system }] } : undefined, contents, generationConfig: { maxOutputTokens: 8192 } }, randomUUID())).result as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } };
  });
  const text = response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!text) throw new Error("Gemini returned an empty response.");
  return { text, tokensIn: response.usageMetadata?.promptTokenCount ?? tokenEstimate(messages), tokensOut: response.usageMetadata?.candidatesTokenCount ?? Math.ceil(text.length / 4), provider: "gemini", model };
}

export async function callProvider(model: string, messages: ChatMessage[]): Promise<ProviderResult> {
  const provider = MODEL_PRICING[model]?.provider ?? "openai";
  if (provider === "anthropic") return callAnthropic(model, messages);
  if (provider === "gemini") return callGemini(model, messages);
  return callOpenAI(model, messages);
}

export type ProviderStreamEvent =
  | { type: "chunk"; text: string }
  | { type: "usage"; tokensIn: number; tokensOut: number };

/**
 * Stream provider output when the provider supports it. The fallback keeps the
 * route usable for providers without a streaming adapter while preserving the
 * same event contract.
 */
export async function* streamProvider(model: string, messages: ChatMessage[], signal?: AbortSignal): AsyncGenerator<ProviderStreamEvent> {
  const provider = MODEL_PRICING[model]?.provider ?? "openai";
  if (provider !== "openai") {
    const result = await callProvider(model, messages);
    yield { type: "chunk", text: result.text };
    yield { type: "usage", tokensIn: result.tokensIn, tokensOut: result.tokensOut };
    return;
  }

  const result = await callProvider(model, messages);
  if (signal?.aborted) return;
  yield { type: "chunk", text: result.text };
  yield { type: "usage", tokensIn: result.tokensIn, tokensOut: result.tokensOut };
}