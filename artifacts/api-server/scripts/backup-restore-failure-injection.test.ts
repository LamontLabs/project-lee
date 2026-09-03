import assert from "node:assert/strict";
import test from "node:test";
import { collectPortableBackup, digest, verifyPortableBackup } from "../src/lib/backup-restore";

test("portable backup verification fails closed for corrupt, incompatible, partial, and unavailable archives", async () => {
  const collected = await collectPortableBackup({ backupClass: "known_good", reason: "failure-injection fixture" });

  const corruptManifest = structuredClone(collected.manifest);
  corruptManifest.integrity.payload_checksum = "0".repeat(64);
  const corrupt = await verifyPortableBackup(corruptManifest, collected.payload);
  assert.equal(corrupt.overall, "FAIL");
  assert.equal(corrupt.checks.find((check) => check.name === "canonical-payload-integrity")?.result, "FAIL");

  const incompatibleManifest = structuredClone(collected.manifest);
  incompatibleManifest.db_schema_version = "future-schema";
  const incompatible = await verifyPortableBackup(incompatibleManifest, collected.payload);
  assert.equal(incompatible.overall, "FAIL");
  assert.equal(incompatible.checks.find((check) => check.name === "migration-compatibility")?.result, "FAIL");

  const partialPayload = structuredClone(collected.payload);
  partialPayload.factLedger = [];
  const partialManifest = structuredClone(collected.manifest);
  partialManifest.record_counts.factLedger = 0;
  partialManifest.integrity.payload_checksum = digest(partialPayload);
  const partial = await verifyPortableBackup(partialManifest, partialPayload);
  assert.equal(partial.overall, "FAIL");
  assert.equal(partial.checks.find((check) => check.name === "foreign-key-and-provenance-integrity")?.result, "FAIL");

  const unavailable = await verifyPortableBackup(collected.manifest, undefined as never);
  assert.equal(unavailable.overall, "FAIL");
  assert.equal(unavailable.checks.find((check) => check.name === "portable-manifest")?.result, "FAIL");
});