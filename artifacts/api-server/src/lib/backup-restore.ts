import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { eq, inArray } from "drizzle-orm";
import {
  assumptionLedger,
  anchorLedger,
  brainVersion,
  constitutionProvision,
  constitutionVersion,
  db,
  decisionHeuristicLedger,
  eventLog,
  factLedger,
  identityProfile,
  identityProfileVersion,
  institutionalKnowledgeLedger,
  interpretationLedger,
  policyRecord,
  pool,
  provenanceRecord,
  projectionCheckpoint,
  projectionEventReceipt,
  brief,
  sourceChunk,
  sourceVault,
  strategicAnchor,
  simulation,
  universalObject,
  understandingRun,
  experienceRecord,
  observation,
  opportunity,
  strategicObjective,
} from "@workspace/db";
import { emitEvent } from "./foundation-events";

export const BACKUP_FORMAT_VERSION = "2";
export const DB_SCHEMA_VERSION = "1";
export const LOCAL_BACKUP_RETENTION = 12;
export const BACKUP_CLASSES = ["routine", "pre_migration", "pre_upgrade", "owner_snapshot", "known_good", "pre_restore"] as const;
export type BackupClass = typeof BACKUP_CLASSES[number];

const tableSources = {
  eventLog,
  brainVersion,
  constitutionProvision,
  constitutionVersion,
  identityProfile,
  identityProfileVersion,
  policyRecord,
  sourceVault,
  sourceChunk,
  understandingRun,
  factLedger,
  interpretationLedger,
  anchorLedger,
  strategicAnchor,
  assumptionLedger,
  decisionHeuristicLedger,
  institutionalKnowledgeLedger,
  provenanceRecord,
  universalObject,
  projectionCheckpoint,
  projectionEventReceipt,
  brief,
  simulation,
  experienceRecord,
  observation,
  opportunity,
  strategicObjective,
} as const;

type PortablePayload = { [K in keyof typeof tableSources]?: unknown[] };
export type RestoreCheck = { name: string; result: "PASS" | "WARN" | "FAIL"; evidence: Record<string, unknown> };
export type RestoreEvidence = {
  overall: "PASS" | "WARN" | "FAIL";
  isolated: boolean;
  checks: RestoreCheck[];
  restoredCounts: Record<string, number>;
  canonicalStateHash: string;
  isolatedDatabase?: {
    mode: string;
    productionConnectionUsedForRestore: boolean;
    physicalTables: boolean;
    transactionRolledBack: boolean;
  };
};
export type RestorePreflight = {
  eligible: boolean;
  requiresOwnerConfirmation: true;
  target: "replacement-installation";
  backupId: string | null;
  backupClass: string;
  reason: string;
  sourceInstallationId: string | null;
  brainVersion: string;
  eventLogCheckpoint: Record<string, unknown> | null;
  impact: {
    tableCount: number;
    totalRecords: number;
    recordsByTable: Record<string, number>;
    providerCredentialsIncluded: false;
  };
  verification: Pick<RestoreEvidence, "overall" | "canonicalStateHash">;
  overwritePolicy: "never-overwrite-existing-installation";
  nextStep: string;
};

function canonicalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((key) => [key, canonicalize((value as Record<string, unknown>)[key])]));
  }
  return value;
}
export function canonicalJson(value: unknown) {
  return JSON.stringify(canonicalize(value));
}
export function digest(value: unknown) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function normalizeBackupClass(value: unknown): BackupClass {
  return typeof value === "string" && (BACKUP_CLASSES as readonly string[]).includes(value)
    ? value as BackupClass
    : "routine";
}

export async function collectPortableBackup(options: { backupClass?: unknown; reason?: unknown } = {}) {
  const reconciliation = await reconcileLegacyIntegrity();
  const payload: Record<string, unknown[]> = {};
  for (const [name, table] of Object.entries(tableSources)) {
    payload[name as keyof typeof tableSources] = await db.select().from(table as any);
  }
  const recordCounts = Object.fromEntries(Object.entries(payload).map(([name, rows]) => [name, rows?.length ?? 0]));
  const latestBrain = (payload.brainVersion ?? []).slice().sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] as any;
  const backupId = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
  const backupClass = normalizeBackupClass(options.backupClass);
  const reason = typeof options.reason === "string" && options.reason.trim().length <= 240
    ? options.reason.trim()
    : backupClass === "routine" ? "Routine Brain protection." : `${backupClass.replaceAll("_", " ")} recovery point.`;
  const eventCheckpoint = (payload.eventLog ?? []).slice().sort((a: any, b: any) =>
    Number(b.sequenceNumber ?? 0) - Number(a.sequenceNumber ?? 0)
    || new Date(b.occurredAt ?? b.createdAt ?? 0).getTime() - new Date(a.occurredAt ?? a.createdAt ?? 0).getTime(),
  )[0] as any;
  const manifest = {
    backup_id: backupId,
    timestamp: new Date().toISOString(),
    lee_version: "1.0",
    db_schema_version: DB_SCHEMA_VERSION,
    reality_model_version: "1",
    brain_version: latestBrain?.versionName ?? "unversioned",
    backup_format_version: BACKUP_FORMAT_VERSION,
    tables: Object.keys(tableSources),
    record_counts: recordCounts,
    migrations: {
      compatible_schema_versions: [DB_SCHEMA_VERSION],
      applied: reconciliation.migrations,
    },
    integrity: { algorithm: "sha256", canonicalization: "sorted-keys-date-iso", payload_checksum: digest(payload) },
    production_restore_allowed: false,
    backup_class: backupClass,
    reason,
    source_installation_id: process.env.LEE_INSTANCE_ID ?? null,
    event_log_checkpoint: eventCheckpoint ? {
      event_id: eventCheckpoint.id,
      sequence_number: eventCheckpoint.sequenceNumber ?? null,
      occurred_at: eventCheckpoint.occurredAt ?? eventCheckpoint.createdAt ?? null,
    } : null,
    restore_compatibility: {
      target: "new-or-isolated-installation",
      provider_credentials_included: false,
      compatible_schema_versions: [DB_SCHEMA_VERSION],
      requires_owner_confirmation: true,
    },
  };
  const sizeBytes = Buffer.byteLength(canonicalJson({ manifest, payload }));
  return { backupId, manifest, payload, sizeBytes };
}

/**
 * Desktop runtimes keep a private on-disk copy in addition to the database
 * row. The archive deliberately uses the same portable format so it can be
 * moved between installations; only its location is desktop-specific.
 */
export async function writeLocalBackupArchive(result: Awaited<ReturnType<typeof collectPortableBackup>>) {
  const dataDir = process.env.LEE_DATA_DIR;
  if (!dataDir) return null;
  const directory = join(dataDir, "backups");
  const fileName = `${result.backupId}.json`;
  const filePath = join(directory, fileName);
  const archive = {
    manifest: result.manifest,
    payload: result.payload,
    integrity: { payloadChecksum: digest(result.payload), canonicalization: "sorted-keys-date-iso" },
  };
  try {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await chmod(directory, 0o700);
    const temporaryPath = join(directory, `.${fileName}.${process.pid}.tmp`);
    await writeFile(temporaryPath, canonicalJson(archive), { encoding: "utf8", mode: 0o600 });
    await chmod(temporaryPath, 0o600);
    await rename(temporaryPath, filePath);
    await chmod(filePath, 0o600);

    const entries = (await readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && /^backup-.*\.json$/.test(entry.name))
      .map((entry) => entry.name);
    const dated = await Promise.all(entries.map(async (name) => ({
      name,
      modified: (await stat(join(directory, name))).mtimeMs,
    })));
    dated.sort((a, b) => b.modified - a.modified);
    await Promise.all(dated.slice(LOCAL_BACKUP_RETENTION).map(({ name }) => unlink(join(directory, name))));
    return { localFileCopy: true, localFileName: fileName };
  } catch (error) {
    // Do not silently claim desktop durability when the local export failed.
    throw new Error(`Local desktop backup export unavailable: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getLocalBackupStatus(backupId: string) {
  const dataDir = process.env.LEE_DATA_DIR;
  if (!dataDir) return { localFileCopy: false, localFileName: null };
  const localFileName = `${backupId}.json`;
  // Database values are not allowed to turn this status probe into a path
  // traversal, and callers only ever receive a basename.
  if (!/^[A-Za-z0-9._-]+\.json$/.test(localFileName)) return { localFileCopy: false, localFileName: null };
  try {
    await stat(join(dataDir, "backups", localFileName));
    return { localFileCopy: true, localFileName };
  } catch {
    return { localFileCopy: false, localFileName: null };
  }
}

type ReconciliationResult = { migrations: string[]; repairedObjects: string[]; migratedProvenance: string[] };

function objectEventPayload(object: any) {
  return {
    objectId: object.id,
    objectType: object.objectType,
    name: object.name,
    description: object.description,
    status: object.status,
    sourceRefs: object.sourceRefs,
    createdAt: object.createdAt instanceof Date ? object.createdAt.toISOString() : object.createdAt,
    updatedAt: object.updatedAt instanceof Date ? object.updatedAt.toISOString() : object.updatedAt,
    createdBy: object.createdBy,
    modifiedBy: object.modifiedBy,
    currentOwner: object.currentOwner,
    importedFrom: object.importedFrom,
    generatedBy: object.generatedBy,
    legacyRepair: true,
  };
}

async function reconcileLegacyIntegrity(): Promise<ReconciliationResult> {
  const result: ReconciliationResult = { migrations: [], repairedObjects: [], migratedProvenance: [] };
  const [objects, events] = await Promise.all([
    db.select().from(universalObject),
    db.select().from(eventLog).where(eq(eventLog.aggregateType, "universal_object")),
  ]);
  const createdAggregateIds = new Set(events.filter((event) => event.eventType === "UniversalObjectCreated").map((event) => event.aggregateId));
  for (const object of objects) {
    const payload = objectEventPayload(object);
    if (!createdAggregateIds.has(object.id)) {
      await emitEvent({ eventType: "UniversalObjectCreated", aggregateType: "universal_object", aggregateId: object.id, actor: "legacy-integrity-repair", sourceRef: object.sourceRefs[0] ?? "legacy-integrity-repair", payload });
      result.repairedObjects.push(object.id);
    } else {
      const aggregateEvents = events.filter((event) => event.aggregateId === object.id).sort((a, b) => a.sequenceNumber - b.sequenceNumber);
      const rebuilt = aggregateEvents.reduce((state, event) => ({ ...state, ...event.payload }), { id: object.id });
      const fields = ["objectType", "name", "description", "status", "sourceRefs", "createdBy", "modifiedBy", "currentOwner", "importedFrom", "generatedBy"];
      const differs = fields.some((field) => canonicalJson((rebuilt as Record<string, unknown>)[field]) !== canonicalJson((object as any)[field]));
      if (differs) {
        await emitEvent({ eventType: "UniversalObjectUpdated", aggregateType: "universal_object", aggregateId: object.id, actor: "legacy-integrity-repair", sourceRef: object.sourceRefs[0] ?? "legacy-integrity-repair", payload });
        result.repairedObjects.push(object.id);
      }
    }
  }
  const provenance = await db.select().from(provenanceRecord);
  const durableIds = new Set([
    ...(await db.select({ id: sourceVault.id }).from(sourceVault)).map((row) => row.id),
    ...(await db.select({ id: sourceChunk.id }).from(sourceChunk)).map((row) => row.id),
    ...events.map((event) => event.id),
    ...(await db.select({ id: factLedger.id }).from(factLedger)).map((row) => row.id),
    ...(await db.select({ id: interpretationLedger.id }).from(interpretationLedger)).map((row) => row.id),
    ...objects.map((object) => object.id),
  ]);
  const legacyFactRefs = (await db.select().from(factLedger)).flatMap((fact) =>
    (fact.sourceEvidence ?? []).filter((ref) => !durableIds.has(ref)).map((ref) => ({ fact, ref })),
  );
  const legacy = provenance.filter((row) => !durableIds.has(row.sourceRef));
  const migrationEvents = legacy.length
    ? await db.select().from(eventLog).where(inArray(eventLog.eventType, ["LegacyProvenanceMigrated"]))
    : [];
  for (const row of legacy) {
    const existing = migrationEvents.find((event) => event.payload.provenanceRecordId === row.id && event.payload.originalSourceRef === row.sourceRef);
    const migration = existing ?? await emitEvent({
      eventType: "LegacyProvenanceMigrated",
      aggregateType: "provenance_record",
      aggregateId: row.recordId,
      actor: "legacy-integrity-repair",
      sourceRef: row.sourceRef,
      payload: { provenanceRecordId: row.id, recordType: row.recordType, recordId: row.recordId, originalSourceRef: row.sourceRef, migration: "external-reference-to-event-evidence" },
    });
    await db.update(provenanceRecord).set({ sourceRef: migration.id }).where(eq(provenanceRecord.id, row.id));
    result.migratedProvenance.push(row.id);
  }
  const factMigrationEvents = legacyFactRefs.length
    ? await db.select().from(eventLog).where(inArray(eventLog.eventType, ["LegacyProvenanceMigrated"]))
    : [];
  for (const { fact, ref } of legacyFactRefs) {
    const existing = factMigrationEvents.find((event) => event.payload.recordType === "fact" && event.payload.recordId === fact.id && event.payload.originalSourceRef === ref);
    const migration = existing ?? await emitEvent({
      eventType: "LegacyProvenanceMigrated",
      aggregateType: "fact_ledger",
      aggregateId: fact.id,
      actor: "legacy-integrity-repair",
      sourceRef: ref,
      payload: { recordType: "fact", recordId: fact.id, originalSourceRef: ref, migration: "external-reference-to-event-evidence" },
    });
    const sourceEvidence = (fact.sourceEvidence ?? []).map((candidate) => candidate === ref ? migration.id : candidate);
    await db.update(factLedger).set({ sourceEvidence }).where(eq(factLedger.id, fact.id));
    result.migratedProvenance.push(`${fact.id}:${ref}`);
  }
  if (result.repairedObjects.length) result.migrations.push("legacy-universal-object-event-reconciliation");
  if (result.migratedProvenance.length) result.migrations.push("legacy-provenance-event-evidence-reconciliation");
  return result;
}

function rows(payload: PortablePayload, name: keyof PortablePayload) {
  return (payload[name] ?? []) as any[];
}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function quoteIdentifier(value: string) {
  return `"${value.replaceAll(`"`, `""`)}"`;
}

function tableNameForSource(sourceName: string) {
  return sourceName.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function databaseRow(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
    tableNameForSource(key),
    nested,
  ]));
}

async function restoreIntoIsolatedSchema(
  client: { query: (text: string, values?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }> },
  payload: PortablePayload,
) {
  const schemaName = `lee_restore_${randomUUID().replaceAll("-", "")}`;
  const schema = quoteIdentifier(schemaName);
  const restoredCounts: Record<string, number> = {};
  await client.query("SAVEPOINT restore_schema_setup");
  try {
    await client.query(`CREATE SCHEMA ${schema}`);
    for (const [sourceName, tableRows] of Object.entries(payload)) {
      const tableName = tableNameForSource(sourceName);
      const quotedTable = quoteIdentifier(tableName);
      const quotedSource = `${quoteIdentifier("public")}.${quotedTable}`;
      const target = `${schema}.${quotedTable}`;
      try {
        await client.query(`CREATE TABLE ${target} (LIKE ${quotedSource} INCLUDING ALL)`);
        for (const [rowIndex, row] of (tableRows ?? []).entries()) {
          try {
            await client.query(
              `INSERT INTO ${target} SELECT * FROM jsonb_populate_record(NULL::${quotedSource}, $1::jsonb)`,
              [JSON.stringify(canonicalize(databaseRow(row)))],
            );
          } catch (error) {
            throw new Error(`row ${rowIndex + 1}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      } catch (error) {
        throw new Error(`table ${sourceName} (${tableName}) restore failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      const count = await client.query(`SELECT count(*)::int AS count FROM ${target}`);
      restoredCounts[sourceName] = Number(count.rows[0]?.count ?? 0);
    }

    const requiredTables = ["event_log", "brain_version", "fact_ledger", "interpretation_ledger", "provenance_record"];
    const restoredTableNames = new Set(Object.keys(restoredCounts).map(tableNameForSource));
    const missingTables = requiredTables.filter((tableName) => !restoredTableNames.has(tableName));
    const canonicalTrigger = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgrelid = 'public.event_log'::regclass
          AND tgname = 'event_log_append_only'
          AND NOT tgisinternal
      ) AS present
    `);
    const canonicalTriggerPresent = Boolean(canonicalTrigger.rows[0]?.present);

    let isolatedTriggerResult: "PASS" | "WARN" | "FAIL" = "WARN";
    try {
      const isolatedEventTable = `${schema}.${quoteIdentifier("event_log")}`;
      await client.query(`
        CREATE TRIGGER event_log_restore_append_only
        BEFORE UPDATE OR DELETE ON ${isolatedEventTable}
        FOR EACH ROW
        EXECUTE FUNCTION public.prevent_event_log_mutation()
      `);
      const eventRow = await client.query(`SELECT id FROM ${isolatedEventTable} LIMIT 1`);
      if (eventRow.rows[0]?.id) {
        await client.query("SAVEPOINT restore_append_only_check");
        try {
          await client.query(`UPDATE ${isolatedEventTable} SET payload = payload WHERE id = $1`, [eventRow.rows[0].id]);
          isolatedTriggerResult = "FAIL";
        } catch (error) {
          isolatedTriggerResult = (error as { code?: string }).code === "55006" ? "PASS" : "FAIL";
        } finally {
          await client.query("ROLLBACK TO SAVEPOINT restore_append_only_check");
          await client.query("RELEASE SAVEPOINT restore_append_only_check");
        }
      }
    } catch {
      isolatedTriggerResult = "FAIL";
    }

    return { restoredCounts, tableCheck: missingTables.length === 0, missingTables, canonicalTriggerPresent, isolatedTriggerResult };
  } catch (error) {
    await client.query("ROLLBACK TO SAVEPOINT restore_schema_setup").catch(() => undefined);
    throw error;
  } finally {
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`).catch(() => undefined);
    await client.query("RELEASE SAVEPOINT restore_schema_setup").catch(() => undefined);
  }
}

export async function verifyPortableBackup(manifest: any, payload: PortablePayload): Promise<RestoreEvidence> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) payload = {};
  const checks: RestoreCheck[] = [];
  const required = ["eventLog", "brainVersion", "constitutionProvision", "constitutionVersion", "identityProfile", "identityProfileVersion", "policyRecord", "factLedger", "interpretationLedger", "provenanceRecord"];
  const missing = required.filter((name) => !Array.isArray(payload[name as keyof PortablePayload]));
  checks.push({ name: "portable-manifest", result: manifest?.backup_format_version === BACKUP_FORMAT_VERSION && !missing.length ? "PASS" : "FAIL", evidence: { formatVersion: manifest?.backup_format_version, missing } });
  const checksumValid = manifest?.integrity?.payload_checksum === digest(payload);
  checks.push({ name: "canonical-payload-integrity", result: checksumValid ? "PASS" : "FAIL", evidence: { algorithm: manifest?.integrity?.algorithm, checksumValid } });
  const migrationValid = manifest?.db_schema_version === DB_SCHEMA_VERSION && manifest?.migrations?.compatible_schema_versions?.includes(DB_SCHEMA_VERSION);
  checks.push({ name: "migration-compatibility", result: migrationValid ? "PASS" : "FAIL", evidence: { schemaVersion: manifest?.db_schema_version, expected: DB_SCHEMA_VERSION } });

  const expectedCounts = manifest?.record_counts ?? {};
  const countMismatches = Object.entries(expectedCounts).filter(([name, count]) => rows(payload, name as keyof PortablePayload).length !== count);
  checks.push({ name: "record-counts", result: countMismatches.length ? "FAIL" : "PASS", evidence: { mismatches: countMismatches } });

  const eventRows = rows(payload, "eventLog");
  const sourceIds = new Set([
    ...rows(payload, "sourceVault").map((row) => row.id),
    ...rows(payload, "sourceChunk").map((row) => row.id),
    ...eventRows.map((row) => row.id),
  ]);
  const factIds = new Set(rows(payload, "factLedger").map((row) => row.id));
  const interpretationIds = new Set(rows(payload, "interpretationLedger").map((row) => row.id));
  const objectIds = new Set(rows(payload, "universalObject").map((row) => row.id));
  const allRecordIds = new Set(Object.values(payload).flatMap((tableRows) => (tableRows ?? []).map((row: any) => row.id).filter(Boolean)));
  const allEvidenceIds = new Set([...sourceIds, ...factIds, ...interpretationIds, ...objectIds, ...allRecordIds]);
  const unresolvedFacts = rows(payload, "factLedger").flatMap((row) => (row.sourceEvidence ?? []).filter((id: string) => !sourceIds.has(id)).map((id: string) => ({ recordId: row.id, id, legacyExternalRef: !uuidPattern.test(id) })));
  const invalidFacts = unresolvedFacts.filter((item) => !item.legacyExternalRef);
  const legacyFactRefs = unresolvedFacts.filter((item) => item.legacyExternalRef);
  const invalidInterpretations = rows(payload, "interpretationLedger").flatMap((row) => [...(row.inputFacts ?? []), ...(row.inputInterpretations ?? [])].filter((id: string) => !factIds.has(id) && !interpretationIds.has(id)).map((id: string) => ({ recordId: row.id, id })));
  const unresolvedProvenance = rows(payload, "provenanceRecord").filter((row) => !allEvidenceIds.has(row.sourceRef) || !allRecordIds.has(row.recordId));
  const invalidProvenance = unresolvedProvenance.filter((row) => uuidPattern.test(String(row.sourceRef)) || !allRecordIds.has(row.recordId));
  const legacyProvenanceRefs = unresolvedProvenance.filter((row) => !uuidPattern.test(String(row.sourceRef)) && allRecordIds.has(row.recordId));
  checks.push({ name: "foreign-key-and-provenance-integrity", result: invalidFacts.length || invalidInterpretations.length || invalidProvenance.length || legacyFactRefs.length || legacyProvenanceRefs.length ? "FAIL" : "PASS", evidence: { invalidFacts, invalidInterpretations, invalidProvenanceCount: invalidProvenance.length, legacyExternalEvidenceRefs: legacyFactRefs.length, legacyProvenanceRefs: legacyProvenanceRefs.length, reconciliationRequired: legacyFactRefs.length > 0 || legacyProvenanceRefs.length > 0 } });

  const events = rows(payload, "eventLog").slice().sort((a, b) => new Date(a.createdAt ?? a.occurredAt).getTime() - new Date(b.createdAt ?? b.occurredAt).getTime() || String(a.id).localeCompare(String(b.id)));
  const eventIds = new Set(events.map((event) => event.id));
  const invalidCausation = events.filter((event) => event.causationId && !eventIds.has(event.causationId)).map((event) => event.id);
  const replayedObjects = new Map<string, any>();
  for (const event of events) {
    if (event.eventType === "UniversalObjectCreated") replayedObjects.set(event.aggregateId, { id: event.aggregateId, ...event.payload });
    if (event.eventType === "UniversalObjectUpdated" && replayedObjects.has(event.aggregateId)) replayedObjects.set(event.aggregateId, { ...replayedObjects.get(event.aggregateId), ...event.payload });
  }
  const canonicalObjectIds = new Set(rows(payload, "universalObject").map((row) => row.id));
  const missingReplayedObjects = [...canonicalObjectIds].filter((id) => !replayedObjects.has(id));
  checks.push({ name: "event-log-continuity-and-rebuild", result: invalidCausation.length || missingReplayedObjects.length ? "FAIL" : "PASS", evidence: { eventCount: events.length, invalidCausation, replayedObjectCount: replayedObjects.size, missingReplayedObjects } });
  const canonicalProjectionMismatches: Array<Record<string, unknown>> = [];
  for (const row of rows(payload, "universalObject")) {
    const rebuilt = replayedObjects.get(row.id);
    if (!rebuilt) {
      canonicalProjectionMismatches.push({ id: row.id, reason: "missing-rebuilt-object" });
      continue;
    }
    for (const field of ["objectType", "name", "description", "status", "sourceRefs", "createdBy", "modifiedBy", "currentOwner", "importedFrom", "generatedBy"]) {
      if (rebuilt[field] !== undefined && canonicalJson(rebuilt[field]) !== canonicalJson(row[field])) {
        canonicalProjectionMismatches.push({ id: row.id, field, expected: row[field], actual: rebuilt[field] });
      }
    }
  }
  checks.push({ name: "canonical-state-equality", result: canonicalProjectionMismatches.length ? "FAIL" : "PASS", evidence: { comparedObjects: canonicalObjectIds.size, mismatches: canonicalProjectionMismatches } });
  checks.push({ name: "production-write-boundary", result: manifest?.production_restore_allowed === false ? "PASS" : "FAIL", evidence: { isolated: true, productionRestoreAllowed: manifest?.production_restore_allowed } });

  const client = await pool.connect();
  let isolatedDatabase: RestoreEvidence["isolatedDatabase"];
  try {
    await client.query("BEGIN");
    const restored = await restoreIntoIsolatedSchema(client, payload);
    const countMismatch = Object.entries(restored.restoredCounts).filter(([name, count]) => count !== rows(payload, name as keyof PortablePayload).length);
    const isolatedRestorePass = restored.tableCheck
      && countMismatch.length === 0
      && restored.canonicalTriggerPresent
      && restored.isolatedTriggerResult !== "FAIL";
    checks.push({ name: "isolated-clean-database-restore", result: isolatedRestorePass ? "PASS" : "FAIL", evidence: {
      database: "postgresql-isolated-schema",
      physicalTables: true,
      restoredCounts: restored.restoredCounts,
      countMismatch,
      missingTables: restored.missingTables,
      canonicalEventLogAppendOnlyTrigger: restored.canonicalTriggerPresent,
      isolatedEventLogAppendOnlyTrigger: restored.isolatedTriggerResult,
      transactionRolledBack: true,
    } });
    checks.push({ name: "canonical-event-log-append-only", result: restored.canonicalTriggerPresent ? "PASS" : "FAIL", evidence: { trigger: "event_log_append_only", table: "public.event_log" } });
    isolatedDatabase = { mode: "postgresql-isolated-schema", productionConnectionUsedForRestore: false, physicalTables: true, transactionRolledBack: true };
    await client.query("ROLLBACK");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    checks.push({ name: "isolated-clean-database-restore", result: "FAIL", evidence: { database: "postgresql-isolated-schema", error: error instanceof Error ? error.message : String(error), transactionRolledBack: true } });
    isolatedDatabase = { mode: "postgresql-isolated-schema", productionConnectionUsedForRestore: false, physicalTables: false, transactionRolledBack: true };
  } finally {
    client.release();
  }

  const restoredCounts = Object.fromEntries(Object.entries(payload).map(([name, value]) => [name, value?.length ?? 0]));
  const canonicalStateHash = digest({ facts: rows(payload, "factLedger"), interpretations: rows(payload, "interpretationLedger"), objects: rows(payload, "universalObject"), events });
  const overall = checks.some((check) => check.result === "FAIL") ? "FAIL" : checks.some((check) => check.result === "WARN") ? "WARN" : "PASS";
  return { overall, isolated: true, checks, restoredCounts, canonicalStateHash, isolatedDatabase };
}

export function buildRestorePreflight(manifest: any, payload: PortablePayload, evidence: RestoreEvidence): RestorePreflight {
  const recordsByTable = Object.fromEntries(Object.entries(payload).map(([name, value]) => [name, value?.length ?? 0]));
  return {
    eligible: evidence.overall === "PASS",
    requiresOwnerConfirmation: true,
    target: "replacement-installation",
    backupId: typeof manifest?.backup_id === "string" ? manifest.backup_id : null,
    backupClass: typeof manifest?.backup_class === "string" ? manifest.backup_class : "legacy",
    reason: typeof manifest?.reason === "string" ? manifest.reason : "Portable Brain recovery point.",
    sourceInstallationId: typeof manifest?.source_installation_id === "string" ? manifest.source_installation_id : null,
    brainVersion: typeof manifest?.brain_version === "string" ? manifest.brain_version : "unversioned",
    eventLogCheckpoint: manifest?.event_log_checkpoint && typeof manifest.event_log_checkpoint === "object" ? manifest.event_log_checkpoint : null,
    impact: {
      tableCount: Object.keys(recordsByTable).length,
      totalRecords: Object.values(recordsByTable).reduce((total, count) => total + count, 0),
      recordsByTable,
      providerCredentialsIncluded: false,
    },
    verification: { overall: evidence.overall, canonicalStateHash: evidence.canonicalStateHash },
    overwritePolicy: "never-overwrite-existing-installation",
    nextStep: evidence.overall === "PASS"
      ? "Download this verified package and import it during a new, empty installation. Existing installations are never overwritten by this flow."
      : "Repair or replace this archive before attempting a replacement installation.",
  };
}

/**
 * Replacement-machine restore is intentionally narrower than a general
 * database replacement: it is allowed only against an empty, migrated
 * installation. Existing canonical data is never truncated or overwritten.
 */
export async function restorePortableBackupIntoEmptyDatabase(archivePath: string) {
  const archive = JSON.parse(await readFile(archivePath, "utf8")) as { manifest?: any; payload?: PortablePayload };
  const manifest = archive.manifest;
  const payload = archive.payload;
  const evidence = await verifyPortableBackup(manifest, payload as PortablePayload);
  if (evidence.overall !== "PASS") throw new Error(`Replacement restore blocked: archive verification returned ${evidence.overall}.`);

  const allowedTables = new Set(Object.keys(tableSources));
  const unknownTables = Object.keys(payload ?? {}).filter((name) => !allowedTables.has(name));
  if (unknownTables.length) throw new Error(`Replacement restore blocked: archive contains unknown canonical tables (${unknownTables.join(", ")}).`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const sourceName of allowedTables) {
      const tableName = tableNameForSource(sourceName);
      const result = await client.query(`SELECT count(*)::int AS count FROM ${quoteIdentifier("public")}.${quoteIdentifier(tableName)}`);
      if (Number(result.rows[0]?.count ?? 0) > 0) {
        throw new Error(`Replacement restore blocked: existing installation is not empty (${sourceName} contains data).`);
      }
    }

    const pending = Object.entries(payload ?? {}).map(([sourceName, tableRows]) => ({ sourceName, tableRows: tableRows ?? [], lastError: "" }));
    const restoredCounts: Record<string, number> = {};
    while (pending.length) {
      let progress = false;
      for (let index = pending.length - 1; index >= 0; index -= 1) {
        const item = pending[index];
        const tableName = tableNameForSource(item.sourceName);
        const target = `${quoteIdentifier("public")}.${quoteIdentifier(tableName)}`;
        const savepoint = `restore_${index}`;
        await client.query(`SAVEPOINT ${quoteIdentifier(savepoint)}`);
        try {
          for (const row of item.tableRows) {
            await client.query(
              `INSERT INTO ${target} SELECT * FROM jsonb_populate_record(NULL::${target}, $1::jsonb)`,
              [JSON.stringify(canonicalize(databaseRow(row)))],
            );
          }
          await client.query(`RELEASE SAVEPOINT ${quoteIdentifier(savepoint)}`);
          restoredCounts[item.sourceName] = item.tableRows.length;
          pending.splice(index, 1);
          progress = true;
        } catch (error) {
          item.lastError = error instanceof Error ? error.message : String(error);
          await client.query(`ROLLBACK TO SAVEPOINT ${quoteIdentifier(savepoint)}`);
          await client.query(`RELEASE SAVEPOINT ${quoteIdentifier(savepoint)}`);
          if ((error as { code?: string }).code !== "23503") throw new Error(`Replacement restore failed for ${item.sourceName}: ${item.lastError}`);
        }
      }
      if (!progress) {
        throw new Error(`Replacement restore blocked by unresolved table dependencies: ${pending.map((item) => `${item.sourceName}: ${item.lastError}`).join("; ")}`);
      }
    }
    await client.query("COMMIT");
    return { restored: true, target: "empty-migrated-installation", backupId: manifest.backup_id ?? null, brainVersion: manifest.brain_version ?? "unversioned", restoredCounts, verification: evidence };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}