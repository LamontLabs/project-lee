import test from "node:test";
import assert from "node:assert/strict";

const base = "http://127.0.0.1:8080/api";
async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers ?? {}) },
  });
  return { response, body: await response.json() };
}

test("portable backup restores in an isolated sandbox without overwriting production", async () => {
  const created = await request("/backups/create", { method: "POST" });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.formatVersion, "2");
  const requiredTables = [
    "eventLog", "brainVersion", "constitutionProvision", "constitutionVersion",
    "identityProfile", "identityProfileVersion", "policyRecord", "factLedger",
    "interpretationLedger", "provenanceRecord",
  ];
  for (const table of requiredTables) assert.ok(created.body.manifest.tables.includes(table), `missing ${table}`);
  assert.equal(created.body.manifest.integrity.algorithm, "sha256");
  assert.equal(created.body.manifest.production_restore_allowed, false);

  const before = await request("/events?limit=500");
  const verified = await request(`/backups/${created.body.id}/verify`, { method: "POST" });
  assert.equal(verified.response.status, 200);
  assert.notEqual(verified.body.evidence.overall, "FAIL");
  assert.ok(verified.body.evidence.checks.some((check) => check.name === "canonical-payload-integrity" && check.result === "PASS"));

  const restored = await request(`/backups/${created.body.id}/test-restore`, { method: "POST" });
  assert.equal(restored.response.status, 200);
  assert.equal(restored.body.passed, true);
  assert.equal(restored.body.evidence.isolated, true);
  assert.equal(restored.body.evidence.isolatedDatabase.productionConnectionUsedForRestore, false);
  assert.ok(restored.body.evidence.checks.some((check) => check.name === "event-log-continuity-and-rebuild" && check.result === "PASS"));
  assert.ok(restored.body.evidence.checks.some((check) => check.name === "canonical-state-equality" && check.result === "PASS"));
  assert.ok(restored.body.evidence.checks.some((check) => check.name === "isolated-clean-database-restore" && check.result === "PASS"));
  assert.ok(restored.body.evidence.checks.some((check) => check.name === "production-canonical-state-untouched" && check.result === "PASS"));

  const after = await request("/events?limit=500");
  assert.deepEqual(after.body.map((event) => event.id), before.body.map((event) => event.id));

  const downloaded = await request(`/backups/${created.body.id}/download`);
  assert.equal(downloaded.response.status, 200);
  assert.equal(downloaded.body.manifest.backup_format_version, "2");
  assert.equal(downloaded.body.integrity.payloadChecksum, created.body.manifest.integrity.payload_checksum);
});