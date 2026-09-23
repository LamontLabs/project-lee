import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";

const today = await fs.readFile(new URL("../app/(tabs)/index.tsx", import.meta.url), "utf8");
const api = await fs.readFile(new URL("../lib/api.ts", import.meta.url), "utf8");
const types = await fs.readFile(new URL("../lib/types.ts", import.meta.url), "utf8");

test("Today does not expose unsupported Lab/Home filters", () => {
  assert.doesNotMatch(today, /LeeSegmentedControl/);
  assert.match(today, /Owner context · All authorized projections/);
  assert.match(today, /Lab and Home views are unavailable/);
  assert.match(today, /No client-side filtering is applied/);
});

test("Today does not infer context from an unscoped brief", () => {
  assert.match(types, /export type Brief = \{/);
  assert.match(types, /alerts: Array<\{ id: string; title: string; body: string; severity: string \}>/);
  assert.doesNotMatch(types, /brainDomain|scopeKey|context/);
  assert.match(api, /brief: \(\) => request<Brief>\('\/android\/brief'\)/);
  assert.doesNotMatch(api, /scope: 'all' \| 'lab' \| 'home'/);
});

test("Today rows are informational when no supported destination exists", () => {
  assert.equal((today.match(/\bchevron\b/g) ?? []).length, 0);
  assert.doesNotMatch(today, /onPress=/);
});