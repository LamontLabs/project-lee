import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = async (path) => readFile(new URL(`../src/${path}`, import.meta.url), "utf8");

test("email questions use the existing intent boundary without turning read questions into drafts", async () => {
  const intent = await source("lib/intent.ts");
  assert.match(intent, /intentSubtype: subtype/);
  assert.match(intent, /emailSearch \? "email_search"/);
  assert.match(intent, /if \(isEmailSearchRequest\(input\)\) return/);
  assert.match(intent, /isEmailSearchRequest[\s\S]*asksToWrite[\s\S]*return referencesEmail/);
  assert.match(intent, /if \(\/draft\|write\|compose\|email\|message\/\.test\(input\)\) return "draft_request"/);
});

test("selected email threads are hydrated only after context selection and retain Gmail provenance", async () => {
  const context = await source("lib/context-engine.ts");
  assert.match(context, /connectedEmailProvider/);
  assert.match(context, /\.provider\.search\(emailSearchTerms\(query\)/);
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