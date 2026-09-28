import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";

const context = await fs.readFile(new URL("../context/LeeContext.tsx", import.meta.url), "utf8");
const types = await fs.readFile(new URL("../lib/types.ts", import.meta.url), "utf8");
const api = await fs.readFile(new URL("../lib/api.ts", import.meta.url), "utf8");
const mobileFoundation = await fs.readFile(new URL("../../../lib/mobile-foundation/src/index.ts", import.meta.url), "utf8");

test("Android local queue preserves failed syncs across restart", () => {
  assert.match(types, /Capture = CaptureQueueItem &/);
  assert.match(mobileFoundation, /status: 'queued' \| 'syncing' \| 'synced' \| 'failed' \| 'conflict' \| 'rejected'/);
  assert.match(types, /lastError\?: string/);
  assert.match(context, /nextStatus = status === 409[\s\S]*'failed'/);
  assert.match(context, /await saveCaptures\(next\)/);
  assert.match(context, /const stored = await getCaptures\(\)/);
  assert.match(context, /const queued = stored\.filter\(\(capture\) => capture\.status !== 'synced'\)/);
});

test("Android API wiring uses registered guarded routes and governed approval", () => {
  for (const path of ["/android/brief", "/android/waiting", "/android/alerts", "/android/approvals", "/android/capture", "/android/approve", "/android/connection"]) {
    assert.match(api, new RegExp(path.replaceAll("/", "\\/")));
  }
  assert.match(api, /Authorization: `Bearer \$\{pairing\.token\}/);
  assert.match(api, /approve: \(governanceRequestId: string, decision: 'approve' \| 'hold' \| 'reject'\)/);
});