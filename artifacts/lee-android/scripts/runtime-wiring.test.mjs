import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";

const context = await fs.readFile(new URL("../context/LeeContext.tsx", import.meta.url), "utf8");
const types = await fs.readFile(new URL("../lib/types.ts", import.meta.url), "utf8");
const api = await fs.readFile(new URL("../lib/api.ts", import.meta.url), "utf8");

test("Android local queue preserves failed syncs across restart", () => {
  assert.match(types, /status: 'queued' \| 'synced' \| 'failed'/);
  assert.match(types, /lastError\?: string/);
  assert.match(context, /status: 'failed' as const/);
  assert.match(context, /await saveCaptures\(failed\)/);
  assert.match(context, /const queued = captures\.filter\(\(capture\) => capture\.status !== 'synced'\)/);
  assert.doesNotMatch(context, /queued\.some\(\(item\) => item\.id === capture\.id\) \? \{ \.\.\.capture, status: 'synced'/);
});

test("Android API wiring uses registered guarded routes and governed approval", () => {
  for (const path of ["/android/brief", "/android/waiting", "/android/alerts", "/android/approvals", "/android/capture", "/android/approve", "/android/connection"]) {
    assert.match(api, new RegExp(path.replaceAll("/", "\\/")));
  }
  assert.match(api, /Authorization: `Bearer \$\{pairing\.token\}/);
  assert.match(api, /approve: \(governanceRequestId: string, decision: 'approve' \| 'hold' \| 'reject'\)/);
});