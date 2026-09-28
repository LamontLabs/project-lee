import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";

const foundation = await fs.readFile(new URL("../../../lib/mobile-foundation/src/index.ts", import.meta.url), "utf8");
const storage = await fs.readFile(new URL("../lib/storage.ts", import.meta.url), "utf8");
const context = await fs.readFile(new URL("../context/LeeContext.tsx", import.meta.url), "utf8");
const api = await fs.readFile(new URL("../lib/api.ts", import.meta.url), "utf8");

test("mobile cache and queue use protected bounded persistence with identity metadata", () => {
  assert.match(storage, /secureCache/);
  assert.match(storage, /createSecureCaptureQueue\('owner', \{ maxItems: 30 \}\)/);
  assert.match(foundation, /privacyScope\?: MobilePrivacyScope/);
  assert.match(foundation, /acknowledgement\?:/);
  assert.match(foundation, /slice\(-maxItems\)/);
});
test("Owner re-authorizes before sync and retains terminal outcomes", () => {
  assert.match(context, /await client\.health\(\)/);
  assert.match(context, /reauthorization-required/);
  assert.match(context, /status === 409 \? 'conflict'/);
  assert.match(context, /MAX_ATTEMPTS = 5/);
  assert.match(context, /identity\.capabilities\.granted\.includes\(requiredCapability\)/);
});
test("capture uploads carry stable identity and server acknowledgements", () => {
  assert.match(api, /captureId: string/);
  assert.match(api, /CaptureAcknowledgement/);
  assert.match(context, /client\.capture\(\{ captureId: capture\.id/);
  assert.match(context, /response\.duplicate/);
  assert.match(context, /serverRevision: response\.serverRevision \?\? response\.sourceId/);
  assert.match(context, /acknowledgement \}/);
});