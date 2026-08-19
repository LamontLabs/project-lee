import { openai } from "@workspace/integrations-openai-ai-server";

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
  "gemini-2.5-pro": { input: 0.00000125, output: 0.000005, provider: "gemini" },
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

async function callOpenAI(model: string, messages: ChatMessage[]): Promise<ProviderResult> {
  const response = await withRetry(() => openai.chat.completions.create({ model, max_completion_tokens: 8192, messages }));
  const text = response.choices[0]?.message?.content?.trim();
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
    const result = await fetch(`${process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL}/v1/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01" },
      body: JSON.stringify(body),
    });
    if (!result.ok) throw new Error(`Anthropic request failed (${result.status}).`);
    return result.json() as Promise<{ content?: Array<{ type: string; text?: string }>; usage?: { input_tokens?: number; output_tokens?: number } }>;
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
    const result = await fetch(`${process.env.AI_INTEGRATIONS_GEMINI_BASE_URL}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.AI_INTEGRATIONS_GEMINI_API_KEY ?? "" },
      body: JSON.stringify({ systemInstruction: system ? { parts: [{ text: system }] } : undefined, contents, generationConfig: { maxOutputTokens: 8192 } }),
    });
    if (!result.ok) throw new Error(`Gemini request failed (${result.status}).`);
    return result.json() as Promise<{ candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } }>;
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