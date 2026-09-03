import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const sourceRoot = path.resolve("src");
const adapterFiles = new Set([
  "lib/ai-providers.ts",
  "lib/android-push.ts",
  "lib/connector-engine.ts",
  "lib/connectors.ts",
  // OAuth provider URLs and credential exchange belong to the connection adapter boundary.
  "lib/connection-center.ts",
  "lib/provider-abstraction.ts",
  "services/internal-services.ts",
]);
const prohibitedPatterns = [
  /@workspace\/integrations-[^'"]+/,
  /@replit\/connectors-sdk/,
  /https:\/\/(?:api\.)?(?:googleapis|github|fcm)\./i,
];

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(absolute));
    else if (entry.name.endsWith(".ts")) files.push(absolute);
  }
  return files;
}

test("provider-specific SDKs and endpoints stay below the adapter boundary", async () => {
  const files = await filesUnder(sourceRoot);
  const violations = [];
  for (const file of files) {
    const relative = path.relative(sourceRoot, file);
    if (adapterFiles.has(relative)) continue;
    const content = await readFile(file, "utf8");
    for (const pattern of prohibitedPatterns) {
      if (pattern.test(content)) violations.push(`${relative}: ${pattern}`);
    }
  }
  assert.deepEqual(violations, []);
});

test("provider-neutral contracts and adapter event normalization remain declared", async () => {
  const abstraction = await readFile(path.join(sourceRoot, "lib/provider-abstraction.ts"), "utf8");
  const connectors = await readFile(path.join(sourceRoot, "lib/connectors.ts"), "utf8");
  for (const contract of ["CommunicationProvider", "DocumentProvider", "DevelopmentProvider", "SchedulingProvider", "StorageProvider"]) {
    assert.match(abstraction, new RegExp(`interface ${contract}`));
  }
  assert.match(connectors, /interface ProviderAdapter/);
  assert.match(connectors, /normalize\(event/);
});