import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";

const root = new URL("../", import.meta.url);
const capture = await fs.readFile(new URL("app/(tabs)/capture.tsx", root), "utf8");
const context = await fs.readFile(new URL("context/LeeContext.tsx", root), "utf8");
const approvals = await fs.readFile(new URL("app/(tabs)/approvals.tsx", root), "utf8");
const alerts = await fs.readFile(new URL("app/(tabs)/alerts.tsx", root), "utf8");
const layout = await fs.readFile(new URL("app/_layout.tsx", root), "utf8");
const ask = await fs.readFile(new URL("app/(tabs)/ask.tsx", root), "utf8");

test("capture supports local-first text and device capture paths", () => {
  for (const mode of ["note", "idea", "observation", "project_update", "url"]) {
    assert.match(capture, new RegExp(`id: '${mode}'`));
  }
  for (const action of ["capture-voice", "capture-photo", "capture-attachment"]) {
    assert.match(capture, new RegExp(`testID="${action}"`));
  }
  assert.match(capture, /Saved locally · will retry when paired/);
  assert.match(capture, /Queued locally · will retry automatically/);
  assert.match(capture, /Retry sync/);
});

test("offline captures retry after pairing and when the app returns foreground", () => {
  assert.match(context, /AppState\.addEventListener\('change'/);
  assert.match(context, /if \(state === 'active'\) void retryQueued\(\)/);
  assert.match(context, /const queued = stored\.filter\(\(capture\) => capture\.status !== 'synced'\)/);
  assert.match(context, /setCaptures\(next\);\s+await saveCaptures\(next\)/);
  assert.match(context, /retryCapture: syncCapture/);
});

test("approval decisions remain online-only and expired approvals cannot be released", () => {
  assert.match(approvals, /if \(!api \|\| offline\)/);
  assert.match(approvals, /approval\.lifecycle === 'PENDING'/);
  assert.match(approvals, /approval\.expiresAt\).*Date\.now\(\)/);
  assert.match(approvals, /Decision expired/);
  assert.match(approvals, /disabled=\{Boolean\(busy\) \|\| !actionable\}/);
});

test("alerts deep-link to Ask Lee without dismissing the signal", () => {
  assert.match(alerts, /router\.push\(\{ pathname: '\/\(tabs\)\/ask'/);
  assert.match(alerts, /Review this alert:/);
  assert.doesNotMatch(alerts, /onPress=\{\(\) => void dismiss\(alert\.id\)\}>\s*<Text[^>]*>Open Lee/);
  assert.match(ask, /useLocalSearchParams/);
  assert.match(ask, /if \(prompt\) setQuestion/);
});

test("notification and app links preserve alert and approval identity", () => {
  assert.match(layout, /approvalId/);
  assert.match(layout, /alertId/);
  assert.match(layout, /Linking\.getInitialURL/);
  assert.match(layout, /Linking\.addEventListener\('url'/);
  assert.match(layout, /params: \{ id \}/);
});