import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { callProvider } from "../src/lib/ai-providers";
import { callUniversalSystem, registerUniversalSystem } from "../src/lib/universal-systems";
import { registerInternalServices } from "../src/services/internal-services";

type FixtureMode = "success" | "timeout" | "non-json" | "http-failure";

async function main() {
const credentials = {
  openai: "openai-test-key",
  anthropic: "anthropic-test-key",
  gemini: "gemini-test-key",
  contract: "contract-test-key",
};
let mode: FixtureMode = "success";
let requests: Array<{ path: string; headers: http.IncomingHttpHeaders; body: Record<string, unknown> }> = [];

const server = http.createServer(async (request, response) => {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  const body = raw ? JSON.parse(raw) as Record<string, unknown> : {};
  requests.push({ path: request.url ?? "", headers: request.headers, body });

  if (mode === "timeout") return;
  if (mode === "non-json") {
    response.setHeader("content-type", "text/plain");
    return response.end("not json");
  }
  if (mode === "http-failure") {
    response.statusCode = 502;
    response.setHeader("content-type", "application/json");
    return response.end(JSON.stringify({ error: "fixture failure" }));
  }

  response.setHeader("content-type", "application/json");
  if (request.url?.includes("openai")) {
    return response.end(JSON.stringify({
      choices: [{ message: { content: "openai fixture response" } }],
      usage: { prompt_tokens: 11, completion_tokens: 7 },
    }));
  }
  if (request.url?.includes("anthropic")) {
    return response.end(JSON.stringify({
      content: [{ type: "text", text: "anthropic fixture response" }],
      usage: { input_tokens: 13, output_tokens: 9 },
    }));
  }
  if (request.url?.includes("gemini")) {
    return response.end(JSON.stringify({
      candidates: [{ content: { parts: [{ text: "gemini fixture response" }] } }],
      usageMetadata: { promptTokenCount: 17, candidatesTokenCount: 5 },
    }));
  }
  return response.end(JSON.stringify({ accepted: true, received: body }));
});

const listening = new Promise<number>((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => resolve((server.address() as { port: number }).port));
});
const port = await listening;
const baseUrl = `http://127.0.0.1:${port}`;

const envKeys = [
  "AI_INTEGRATIONS_OPENAI_BASE_URL", "AI_INTEGRATIONS_OPENAI_API_KEY",
  "AI_INTEGRATIONS_ANTHROPIC_BASE_URL", "AI_INTEGRATIONS_ANTHROPIC_API_KEY",
  "AI_INTEGRATIONS_GEMINI_BASE_URL", "AI_INTEGRATIONS_GEMINI_API_KEY",
  "REPLIT_AI_OPENAI_HMAC_SECRET", "REPLIT_AI_ANTHROPIC_HMAC_SECRET",
  "REPLIT_AI_GEMINI_HMAC_SECRET", "PROVIDER_TRANSPORT_CONTRACT_KEY",
  "PROVIDER_TRANSPORT_CONTRACT_HMAC_SECRET",
];
const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
process.env.AI_INTEGRATIONS_OPENAI_BASE_URL = `${baseUrl}/openai`;
process.env.AI_INTEGRATIONS_OPENAI_API_KEY = credentials.openai;
process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL = `${baseUrl}/anthropic`;
process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY = credentials.anthropic;
process.env.AI_INTEGRATIONS_GEMINI_BASE_URL = `${baseUrl}/gemini`;
process.env.AI_INTEGRATIONS_GEMINI_API_KEY = credentials.gemini;
process.env.REPLIT_AI_OPENAI_HMAC_SECRET = "openai-test-hmac";
process.env.REPLIT_AI_ANTHROPIC_HMAC_SECRET = "anthropic-test-hmac";
process.env.REPLIT_AI_GEMINI_HMAC_SECRET = "gemini-test-hmac";
process.env.PROVIDER_TRANSPORT_CONTRACT_KEY = credentials.contract;
process.env.PROVIDER_TRANSPORT_CONTRACT_HMAC_SECRET = "contract-test-hmac";

await registerInternalServices();
await registerUniversalSystem({
  systemId: "provider-transport-contract",
  displayName: "Provider transport contract fixture",
  category: "test",
  baseUrl,
  credentialEnvKey: "PROVIDER_TRANSPORT_CONTRACT_KEY",
  credentialHeader: "authorization",
  capabilities: ["test"],
  requestEnvelope: "contract",
});

test.after(async () => {
  for (const key of envKeys) {
    if (previousEnv[key] === undefined) delete process.env[key];
    else process.env[key] = previousEnv[key];
  }
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("OpenAI, Anthropic, and Gemini send their provider credential headers", async () => {
  requests = [];
  const messages = [{ role: "user" as const, content: "header fixture" }];
  await callProvider({ model: "gpt-5-nano", provider: "openai", routeId: "fixture-openai" }, messages, randomUUID());
  await callProvider({ model: "claude-haiku-4-5", provider: "anthropic", routeId: "fixture-anthropic" }, messages, randomUUID());
  await callProvider({ model: "gemini-2.5-flash", provider: "gemini", routeId: "fixture-gemini" }, messages, randomUUID());

  const openai = requests.find((request) => request.path.includes("openai"));
  const anthropic = requests.find((request) => request.path.includes("anthropic"));
  const gemini = requests.find((request) => request.path.includes("gemini"));
  assert.equal(openai?.headers.authorization, `Bearer ${credentials.openai}`);
  assert.equal(anthropic?.headers["x-api-key"], credentials.anthropic);
  assert.equal(gemini?.headers["x-goog-api-key"], credentials.gemini);
  assert.equal(openai?.headers["x-api-key"], undefined);
  assert.equal(gemini?.headers.authorization, undefined);
  for (const request of [openai, anthropic, gemini]) {
    assert.ok(request?.headers["x-lee-correlation-id"]);
    assert.ok(request?.headers["x-lee-signature"]);
  }
  assert.deepEqual(openai?.body, {
    model: "gpt-5-nano", max_completion_tokens: 8192, messages,
  });
});

test("generic calls wrap payloads in the contract envelope", async () => {
  requests = [];
  const correlationId = randomUUID();
  const result = await callUniversalSystem(
    "provider-transport-contract",
    "/contract",
    { operation: "probe", value: 42 },
    correlationId,
  );
  const request = requests[0];
  assert.equal(result.correlationId, correlationId);
  assert.equal(request.headers.authorization, `Bearer ${credentials.contract}`);
  assert.equal(request.headers["x-lee-correlation-id"], correlationId);
  assert.deepEqual(request.body, {
    contract_version: "v1",
    correlation_id: correlationId,
    payload: { operation: "probe", value: 42 },
  });
});

test("provider failures preserve non-JSON and HTTP errors", async () => {
  for (const failure of ["non-json", "http-failure"] as const) {
    mode = failure;
    await assert.rejects(
      callProvider({ model: "gpt-5-nano", provider: "openai", routeId: "fixture-failure" }, [{ role: "user", content: "failure fixture" }], randomUUID()),
      failure === "non-json" ? /UNIVERSAL_SYSTEM_NON_JSON_RESPONSE/ : /HTTP 502/,
    );
  }
  mode = "success";
});

test("an unknown CIL provider never defaults to another adapter", async () => {
  requests = [];
  await assert.rejects(
    callProvider({ model: "unrecognized-model", provider: "openrouter", routeId: "fixture-unsupported" }, [{ role: "user", content: "do not infer a provider" }], randomUUID()),
    /UNSUPPORTED_CIL_PROVIDER:openrouter/,
  );
  assert.equal(requests.length, 0);
});

test("provider timeout aborts the request", async () => {
  mode = "timeout";
  await assert.rejects(
    callUniversalSystem(
      "provider-transport-contract",
      "/timeout",
      { operation: "timeout" },
      randomUUID(),
      { timeoutMs: 20 },
    ),
    /AbortError|aborted/i,
  );
  mode = "success";
});
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});