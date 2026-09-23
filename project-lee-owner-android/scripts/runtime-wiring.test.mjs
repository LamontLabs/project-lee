import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";

const context = await fs.readFile(new URL("../context/LeeContext.tsx", import.meta.url), "utf8");
const types = await fs.readFile(new URL("../lib/types.ts", import.meta.url), "utf8");
const api = await fs.readFile(new URL("../lib/api.ts", import.meta.url), "utf8");

test("Android local queue preserves failed syncs across restart", () => {
  assert.match(types, /CaptureQueueItem/);
  assert.match(types, /@workspace\/mobile-foundation/);
  assert.match(types, /lastError\?: string/);
  assert.match(context, /const nextStatus =/);
  assert.match(context, /nextStatus === 'failed'/);
  assert.match(context, /status: nextStatus/);
  assert.match(context, /await mark\(\{\s*\.\.\.capture/);
  assert.match(context, /lastError: detail/);
  assert.match(context, /const queued = stored\.filter\(\(capture\) => capture\.status !== 'synced'\)/);
  assert.doesNotMatch(context, /queued\.some\(\(item\) => item\.id === capture\.id\) \? \{ \.\.\.capture, status: 'synced'/);
});

test("Android API wiring uses registered guarded routes and governed approval", () => {
  for (const path of ["/android/brief", "/android/waiting", "/android/alerts", "/android/approvals", "/android/capture", "/android/approve", "/android/connection", "/android/self-awareness"]) {
    assert.match(api, new RegExp(path.replaceAll("/", "\\/")));
  }
  assert.match(api, /Authorization: `Bearer \$\{pairing\.token\}/);
  assert.match(api, /approve: \(governanceRequestId: string, decision: 'approve' \| 'hold' \| 'reject'\)/);
  assert.match(api, /selfAwareness: \(\) => request<SelfAwarenessSnapshot>\('\/android\/self-awareness'\)/);
  assert.match(context, /getSelfAwarenessCache/);
  assert.match(context, /saveSelfAwarenessCache/);
  assert.match(context, /load\(client\.selfAwareness, setSelfAwareness, saveSelfAwarenessCache/);
});