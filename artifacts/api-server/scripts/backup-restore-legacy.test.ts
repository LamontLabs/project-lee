import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import { db, eventLog, projectionCheckpoint, projectionEventReceipt, provenanceRecord, universalObject } from "@workspace/db";
import { collectPortableBackup, digest, verifyPortableBackup } from "../src/lib/backup-restore";
import { rebuildProjection } from "../src/lib/projector";

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

    const fixtureEventIds = payload.eventLog
      .filter((event) => event.aggregateId === objectId && ["UniversalObjectCreated", "UniversalObjectUpdated"].includes(event.eventType))
      .map((event) => event.id);
    const dryRunProjection = await rebuildProjection("universal_objects", { dryRun: true });
    assert.deepEqual(
      dryRunProjection.conflicts.filter((conflict) => fixtureEventIds.includes(conflict.eventId)),
      [],
      "dry-run replay must not conflict on the repaired create-plus-update history",
    );

    const resetProjection = await rebuildProjection("universal_objects", { reset: true });
    assert.deepEqual(
      resetProjection.conflicts.filter((conflict) => fixtureEventIds.includes(conflict.eventId)),
      [],
      "reset replay must not conflict on the repaired create-plus-update history",
    );
    const [projected] = await db.select().from(universalObject).where(eq(universalObject.id, objectId)).limit(1);
    assert.ok(projected, "reset replay must restore the repaired object");
    assert.deepEqual(
      {
        objectType: projected.objectType,
        name: projected.name,
        description: projected.description,
        status: projected.status,
        sourceRefs: projected.sourceRefs,
        version: projected.version,
        createdBy: projected.createdBy,
        modifiedBy: projected.modifiedBy,
        currentOwner: projected.currentOwner,
      },
      {
        objectType: object.objectType,
        name: object.name,
        description: object.description,
        status: object.status,
        sourceRefs: object.sourceRefs,
        version: repairedCreate.sequenceNumber,
        createdBy: object.createdBy,
        modifiedBy: object.modifiedBy,
        currentOwner: object.currentOwner,
      },
    );

    const receipts = await db.select().from(projectionEventReceipt).where(and(
      eq(projectionEventReceipt.projectionName, "universal_objects"),
      inArray(projectionEventReceipt.eventId, fixtureEventIds),
    ));
    assert.equal(receipts.length, fixtureEventIds.length, "replayed fixture events must each have a receipt");
    assert.ok(receipts.every((receipt) => /^[0-9a-f]{64}$/i.test(receipt.eventHash)), "replayed receipts must retain event hashes");
    const [checkpoint] = await db.select().from(projectionCheckpoint).where(eq(projectionCheckpoint.projectionName, "universal_objects")).limit(1);
    assert.ok(checkpoint, "reset replay must retain a projection checkpoint");
    assert.equal(checkpoint.lastEventId, resetProjection.lastEventId);
    assert.equal(checkpoint.conflictCount, resetProjection.conflicts.length);
    assert.equal(checkpoint.status, resetProjection.conflicts.length ? "conflicted" : "ready");
  } finally {
    await db.delete(provenanceRecord).where(eq(provenanceRecord.id, provenanceId ?? ""));
    await db.delete(universalObject).where(eq(universalObject.id, objectId));
  }
});