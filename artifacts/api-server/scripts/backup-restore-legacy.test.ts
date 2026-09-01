import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { eq } from "drizzle-orm";
import { db, eventLog, provenanceRecord, universalObject } from "@workspace/db";
import { collectPortableBackup, digest, verifyPortableBackup } from "../src/lib/backup-restore";

test("legacy backup reconciliation repairs update-only objects and external provenance before verification", async () => {
  const objectId = randomUUID();
  const runId = randomUUID();
  const externalSourceRef = `legacy-external://backup-fixture/${objectId}`;
  const objectName = `Legacy backup fixture ${objectId}`;
  const objectDescription = "Canonical state created by a legacy update-only fixture.";
  let provenanceId: string | undefined;

  try {
    await db.insert(universalObject).values({
      id: objectId,
      objectType: "backup_legacy_fixture",
      name: objectName,
      description: objectDescription,
      status: "active",
      sourceRefs: [externalSourceRef],
      version: 2,
      createdBy: "legacy-fixture",
      modifiedBy: "legacy-fixture",
      currentOwner: "owner",
    });
    await db.insert(eventLog).values({
      eventType: "UniversalObjectUpdated",
      aggregateType: "universal_object",
      aggregateId: objectId,
      actor: "legacy-fixture",
      sourceRef: externalSourceRef,
      sequenceNumber: 1,
      occurredAt: new Date(Date.now() - 1_000),
      payload: {
        name: objectName,
        description: objectDescription,
        status: "active",
        sourceRefs: [externalSourceRef],
        modifiedBy: "legacy-fixture",
        currentOwner: "owner",
      },
    });
    const [provenance] = await db.insert(provenanceRecord).values({
      runId,
      recordType: "universal_object",
      recordId: objectId,
      sourceRef: externalSourceRef,
      excerpt: "Legacy external evidence reference.",
      confidence: 0.8,
    }).returning();
    provenanceId = provenance.id;

    const collected = await collectPortableBackup();
    const payload = collected.payload as Record<string, any[]>;
    const object = payload.universalObject.find((row) => row.id === objectId);
    const repairedCreate = payload.eventLog.find((event) =>
      event.eventType === "UniversalObjectCreated"
      && event.aggregateId === objectId
      && event.payload?.legacyRepair === true,
    );
    const migration = payload.eventLog.find((event) =>
      event.eventType === "LegacyProvenanceMigrated"
      && event.payload?.provenanceRecordId === provenanceId,
    );
    const migratedProvenance = payload.provenanceRecord.find((row) => row.id === provenanceId);

    assert.ok(object);
    assert.ok(repairedCreate, "collector must append a durable create event for update-only objects");
    assert.ok(migration, "collector must append a durable provenance migration event");
    assert.equal(migration.payload.originalSourceRef, externalSourceRef);
    assert.equal(migration.payload.migration, "external-reference-to-event-evidence");
    assert.equal(migratedProvenance?.sourceRef, migration.id);
    assert.ok(collected.manifest.migrations.applied.includes("legacy-universal-object-event-reconciliation"));
    assert.ok(collected.manifest.migrations.applied.includes("legacy-provenance-event-evidence-reconciliation"));

    const repairedEvidence = await verifyPortableBackup(collected.manifest, collected.payload);
    assert.equal(repairedEvidence.overall, "PASS");
    assert.equal(
      repairedEvidence.checks.find((check) => check.name === "event-log-continuity-and-rebuild")?.result,
      "PASS",
    );
    assert.equal(
      repairedEvidence.checks.find((check) => check.name === "canonical-state-equality")?.result,
      "PASS",
    );

    const unresolvedPayload = structuredClone(payload);
    unresolvedPayload.eventLog = unresolvedPayload.eventLog.filter((event) =>
      event.id !== repairedCreate.id && event.id !== migration.id,
    );
    const unresolvedRecord = unresolvedPayload.provenanceRecord.find((row) => row.id === provenanceId);
    assert.ok(unresolvedRecord);
    unresolvedRecord.sourceRef = externalSourceRef;
    const unresolvedManifest = {
      ...collected.manifest,
      record_counts: {
        ...collected.manifest.record_counts,
        eventLog: unresolvedPayload.eventLog.length,
      },
      integrity: {
        ...collected.manifest.integrity,
        payload_checksum: digest(unresolvedPayload),
      },
    };

    const unresolvedEvidence = await verifyPortableBackup(unresolvedManifest, unresolvedPayload);
    assert.equal(unresolvedEvidence.overall, "FAIL");
    assert.equal(
      unresolvedEvidence.checks.find((check) => check.name === "foreign-key-and-provenance-integrity")?.result,
      "FAIL",
    );
    assert.equal(
      unresolvedEvidence.checks.find((check) => check.name === "event-log-continuity-and-rebuild")?.result,
      "FAIL",
    );
    assert.equal(
      unresolvedEvidence.checks.find((check) => check.name === "canonical-state-equality")?.result,
      "FAIL",
    );
  } finally {
    await db.delete(provenanceRecord).where(eq(provenanceRecord.id, provenanceId ?? ""));
    await db.delete(universalObject).where(eq(universalObject.id, objectId));
  }
});