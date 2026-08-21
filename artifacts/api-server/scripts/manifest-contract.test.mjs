import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.MANIFEST_BASE_URL ?? "http://127.0.0.1:8080";

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { accept: "application/json" } });
  assert.equal(response.ok, true, `${path} returned HTTP ${response.status}`);
  return response.json();
}

test("canonical Manifest claims match live runtime state", async () => {
  const [manifest, state, recovery, brainVersions] = await Promise.all([
    get("/api/manifest"),
    get("/api/state"),
    get("/api/recovery/status"),
    get("/api/brain-versions"),
  ]);

  for (const key of [
    "identity", "constitution", "policies", "brainState", "engines", "capabilities",
    "engineHealth", "providers", "schemas", "semanticIndex", "knowledge", "eventLog",
    "graph", "storage", "latestBackup", "latestRestoreVerification", "selfTest", "contractVersion",
    "runtime", "events", "permissions", "risk", "governance", "humanConfirmation", "economics", "evidenceMap",
    "recoveryMode", "operationalState", "health", "dependencies", "provenance", "validation",
  ]) {
    assert.ok(Object.hasOwn(manifest, key), `Manifest is missing ${key}`);
  }

  assert.equal(manifest.operationalState.state, state.currentState);
  assert.equal(manifest.recoveryMode.mode, recovery.mode);
  assert.equal(manifest.knowledge.events, manifest.eventLog.recordCount);
  assert.equal(manifest.graph.nodeCount, manifest.validation.checks.find((check) => check.name === "graph-counts").evidence.nodeCount);
  assert.equal(manifest.storage.latestBackup?.backupId ?? null, manifest.latestBackup?.backupId ?? null);
  assert.equal(manifest.storage.latestRestoreVerification?.backupId ?? null, manifest.latestRestoreVerification?.backupId ?? null);

  const latestBrain = Array.isArray(brainVersions) && brainVersions.length > 0 ? brainVersions[0] : null;
  if (latestBrain) {
    assert.equal(manifest.brainState.version, latestBrain.versionName);
    assert.equal(manifest.brainState.checksum, latestBrain.checksum);
  } else {
    assert.equal(manifest.brainState.version, null);
  }

  assert.match(manifest.provenance.identity, /identity_profile/);
  assert.match(manifest.provenance.health, /internal_capability_service/);
  assert.ok(["PASS", "WARN"].includes(manifest.validation.result));
});

test("versioned system contract is complete, truthful, and agrees with Manifest", async () => {
  const [manifest, contract] = await Promise.all([get("/api/manifest"), get("/api/contract")]);
  assert.equal(contract.contractVersion, manifest.contractVersion);
  assert.equal(contract.identity.name, "Project LEE");
  assert.equal(contract.health.overall, manifest.health.overall);
  assert.equal(contract.runtime.operationalState, manifest.operationalState.state);
  assert.equal(contract.events.appendOnly, manifest.eventLog.appendOnly);
  assert.equal(contract.governance.failClosed, true);
  assert.equal(contract.governance.unavailableVerdict, "HOLD");
  assert.ok(contract.economics.dimensions.length > 0);
  assert.ok(contract.evidenceMap.health.length > 0);
  assert.equal(JSON.stringify(contract).match(/(api[_-]?key|password|private[_-]?key)/i), null);
  assert.ok(["PASS", "WARN"].includes(contract.validation.result));
});