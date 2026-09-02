import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = async (path) => readFile(new URL(`../src/${path}`, import.meta.url), "utf8");
const databaseSource = async (path) => readFile(new URL(`../../../lib/db/src/${path}`, import.meta.url), "utf8");

test("email questions use the existing intent boundary without turning read questions into drafts", async () => {
  const intent = await source("lib/intent.ts");
  assert.match(intent, /intentSubtype: subtype/);
  assert.match(intent, /emailSearch \? "email_search"/);
  assert.match(intent, /emailFilters/);
  assert.match(intent, /if \(isEmailSearchRequest\(input\)\) return/);
  assert.match(intent, /isEmailSearchRequest[\s\S]*asksToWrite[\s\S]*return referencesEmail/);
  assert.match(intent, /if \(\/draft\|write\|compose\|email\|message\/\.test\(input\)\) return "draft_request"/);
});

test("selected email threads are hydrated only after context selection and retain Gmail provenance", async () => {
  const context = await source("lib/context-engine.ts");
  assert.match(context, /connectedEmailProvider/);
  assert.match(context, /\.provider\.search\(intent\.emailFilters \?\? parseEmailSearchFilters\(query\)/);
  assert.match(context, /EmailSearchFilters/);
  assert.match(context, /constructContextPacket\(query, contextItems/);
  assert.match(context, /hydrateSelectedEmailContext\(selected\.items/);
  assert.match(context, /\.provider\.getThread\(candidate\.threadId\)/);
  assert.match(context, /provider: resolved\.providerName/);
  assert.match(context, /sourceRef: `gmail:\$\{message\.threadId\}`/);
  assert.match(context, /bodyText\?\.trim\(\) \|\| message\.snippet/);
  assert.ok(context.indexOf("constructContextPacket(query, contextItems") < context.indexOf("hydrateSelectedEmailContext(selected.items"));
});

test("email retrieval has no body or credential data in pipeline audit payloads", async () => {
  const pipeline = await source("lib/request-pipeline.ts");
  const email = await source("lib/email-provider.ts");
  assert.doesNotMatch(pipeline, /bodyText|snippet|access_token|refresh_token/);
  assert.doesNotMatch(email, /console\.(log|error|warn)\([^)]*(body|snippet|token|credential)/i);
});

test("email intent history persists only the normalized provider-neutral criteria", async () => {
  const intent = await source("lib/intent.ts");
  const schema = await databaseSource("schema/intent.ts");
  assert.match(schema, /emailFilters: jsonb\("email_filters"\)/);
  assert.match(intent, /persistEmailSearchFilters/);
  assert.match(intent, /emailFilters: persistedEmailFilters/);
  assert.match(intent, /filters\.(text|sender|subject|after|before)/);
  assert.doesNotMatch(intent, /persistEmailSearchFilters[\s\S]{0,1200}(bodyText|snippet|access_token|refresh_token)/);
});

test("AI handoff uses selected context only and keeps route audit metadata content-free", async () => {
  const ai = await source("routes/ai.ts");
  assert.match(ai, /contextItems: route\.packet\.items/);
  assert.match(ai, /packet: \{ items: route\.packet\.items, excluded: route\.packet\.excluded \}/);
  const routeAudit = ai.match(/eventType: "ModelRouteSelected"[\s\S]*?payload: \{[^}]*\}/)?.[0] ?? "";
  assert.match(routeAudit, /payload: \{ correlationId, route: route\.route/);
  assert.doesNotMatch(routeAudit, /bodyText|snippet|access_token|refresh_token|packet|contextItems/);
});
