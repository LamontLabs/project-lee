import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = async (path) => readFile(new URL(`../src/${path}`, import.meta.url), "utf8");

test("normal AI entry points do not select providers locally", async () => {
  const [router, ai, android] = await Promise.all([
    source("lib/model-router.ts"),
    source("routes/ai.ts"),
    source("routes/android.ts"),
  ]);
  assert.match(router, /consultCILRoute/);
  assert.doesNotMatch(router, /function chooseTier|modelForTier|CIL unavailable[\s\S]{0,120}callProvider/);
  assert.doesNotMatch(ai, /callProvider\(|function modelFor/);
  assert.doesNotMatch(android, /streamProvider\(|const model = ["']gpt-/);
  assert.match(ai, /routeModelRequest/);
  assert.match(android, /routeModelRequest/);
});

test("CIL response authority and Universal Systems API are explicit", async () => {
  const [services, universal, route, contract] = await Promise.all([
    source("services/internal-services.ts"),
    source("lib/universal-systems.ts"),
    source("routes/universal-systems.ts"),
    readFile(new URL("../../../lib/api-zod/src/system-contract.ts", import.meta.url), "utf8"),
  ]);
  assert.match(services, /model_route\?: CILModelRoute/);
  assert.match(services, /resolution_tier === "T3_FRONTIER"[\s\S]*model_route/);
  assert.match(universal, /registerUniversalSystem|callUniversalSystem/);
  assert.match(route, /systems\/register|systems\/:systemId\/call/);
  assert.match(contract, /connectedSystems/);
});

test("all external reasoning and governance calls use the Universal Systems transport", async () => {
  const [services, ai, universal] = await Promise.all([
    source("services/internal-services.ts"),
    source("lib/ai-providers.ts"),
    source("lib/universal-systems.ts"),
  ]);
  assert.match(services, /callUniversalSystem\("cil"/);
  assert.match(services, /callUniversalSystem\("cerbaseal"/);
  assert.doesNotMatch(services, /fetch\(|requestJson|signedHeaders/);
  assert.match(ai, /callUniversalSystem\("replit-ai-openai"/);
  assert.match(ai, /callUniversalSystem\("replit-ai-anthropic"/);
  assert.match(ai, /callUniversalSystem\("replit-ai-gemini"/);
  assert.doesNotMatch(ai, /fetch\(|@workspace\/integrations-openai|openai\.chat/);
  assert.match(universal, /X-LEE-Correlation-Id/);
  assert.match(universal, /AbortController/);
});

test("local governance preparation cannot release consequential execution", async () => {
  const execution = await source("lib/consequential-execution.ts");
  assert.match(execution, /governanceService\.evaluate/);
  assert.doesNotMatch(execution, /if \(local\.verdict !== "ALLOW"\)/);
  assert.match(execution, /CerbaSeal|REPLAY|expired/i);
});