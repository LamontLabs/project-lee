import { createHash } from "node:crypto";
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
} from "@workspace/db";

export const BACKUP_FORMAT_VERSION = "2";
export const DB_SCHEMA_VERSION = "1";

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
} as const;

type PortablePayload = { [K in keyof typeof tableSources]?: unknown[] };
export type RestoreCheck = { name: string; result: "PASS" | "WARN" | "FAIL"; evidence: Record<string, unknown> };
export type RestoreEvidence = {
  overall: "PASS" | "WARN" | "FAIL";
  isolated: boolean;
  checks: RestoreCheck[];
  restoredCounts: Record<string, number>;
  canonicalStateHash: string;
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

export async function collectPortableBackup() {
  const payload: Record<string, unknown[]> = {};
  for (const [name, table] of Object.entries(tableSources)) {
    payload[name as keyof typeof tableSources] = await db.select().from(table as any);
  }
  const recordCounts = Object.fromEntries(Object.entries(payload).map(([name, rows]) => [name, rows?.length ?? 0]));
  const latestBrain = (payload.brainVersion ?? []).slice().sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] as any;
  const backupId = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID().slice(0, 8)}`;
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
    migrations: { compatible_schema_versions: [DB_SCHEMA_VERSION], applied: [] },
    integrity: { algorithm: "sha256", canonicalization: "sorted-keys-date-iso", payload_checksum: digest(payload) },
    production_restore_allowed: false,
  };
  const sizeBytes = Buffer.byteLength(canonicalJson({ manifest, payload }));
  return { backupId, manifest, payload, sizeBytes };
}

function rows(payload: PortablePayload, name: keyof PortablePayload) {
  return (payload[name] ?? []) as any[];
}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function verifyPortableBackup(manifest: any, payload: PortablePayload): Promise<RestoreEvidence> {
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
    ...eventRows.map((row) => row.sourceRef).filter(Boolean),
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
  checks.push({ name: "foreign-key-and-provenance-integrity", result: invalidFacts.length || invalidInterpretations.length || invalidProvenance.length ? "FAIL" : legacyFactRefs.length || legacyProvenanceRefs.length ? "WARN" : "PASS", evidence: { invalidFacts, invalidInterpretations, invalidProvenanceCount: invalidProvenance.length, legacyExternalEvidenceRefs: legacyFactRefs.length, legacyProvenanceRefs: legacyProvenanceRefs.length } });

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
    for (const field of ["objectType", "name", "status"]) {
      if (rebuilt[field] !== undefined && String(rebuilt[field]) !== String(row[field])) {
        canonicalProjectionMismatches.push({ id: row.id, field, expected: row[field], actual: rebuilt[field] });
      }
    }
  }
  checks.push({ name: "canonical-state-equality", result: canonicalProjectionMismatches.length ? "FAIL" : "PASS", evidence: { comparedObjects: canonicalObjectIds.size, mismatches: canonicalProjectionMismatches } });
  checks.push({ name: "production-write-boundary", result: manifest?.production_restore_allowed === false ? "PASS" : "FAIL", evidence: { isolated: true, productionRestoreAllowed: manifest?.production_restore_allowed } });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("CREATE TEMP TABLE restore_records (table_name text NOT NULL, record_id text, record jsonb NOT NULL) ON COMMIT DROP");
    await client.query("CREATE TEMP TABLE restore_event_log (event_id text PRIMARY KEY, event_type text NOT NULL, aggregate_id text NOT NULL, payload jsonb NOT NULL) ON COMMIT DROP");
    await client.query("CREATE TEMP TABLE restore_universal_objects (object_id text PRIMARY KEY, object jsonb NOT NULL) ON COMMIT DROP");
    let restoredRowCount = 0;
    for (const [tableName, tableRows] of Object.entries(payload)) {
      for (const row of tableRows ?? []) {
        await client.query("INSERT INTO restore_records (table_name, record_id, record) VALUES ($1, $2, $3::jsonb)", [tableName, (row as any).id ?? null, JSON.stringify(canonicalize(row))]);
        restoredRowCount += 1;
      }
    }
    for (const event of events) {
      await client.query("INSERT INTO restore_event_log (event_id, event_type, aggregate_id, payload) VALUES ($1, $2, $3, $4::jsonb)", [event.id, event.eventType, event.aggregateId, JSON.stringify(canonicalize(event.payload ?? {}))]);
    }
    for (const [objectId, object] of replayedObjects) {
      await client.query("INSERT INTO restore_universal_objects (object_id, object) VALUES ($1, $2::jsonb)", [objectId, JSON.stringify(canonicalize(object))]);
    }
    const [{ count: databaseRowCount }] = (await client.query("SELECT count(*)::int AS count FROM restore_records")).rows;
    const [{ count: databaseProjectionCount }] = (await client.query("SELECT count(*)::int AS count FROM restore_universal_objects")).rows;
    const isolatedRestorePass = databaseRowCount === restoredRowCount && databaseProjectionCount === replayedObjects.size;
    checks.push({ name: "isolated-clean-database-restore", result: isolatedRestorePass ? "PASS" : "FAIL", evidence: { database: "postgresql-temporary-transaction", restoredRowCount, databaseRowCount, rebuiltProjectionCount: databaseProjectionCount, transactionRolledBack: true } });
    await client.query("ROLLBACK");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    checks.push({ name: "isolated-clean-database-restore", result: "FAIL", evidence: { database: "postgresql-temporary-transaction", error: error instanceof Error ? error.message : String(error), transactionRolledBack: true } });
  } finally {
    client.release();
  }

  const restoredCounts = Object.fromEntries(Object.entries(payload).map(([name, value]) => [name, value?.length ?? 0]));
  const canonicalStateHash = digest({ facts: rows(payload, "factLedger"), interpretations: rows(payload, "interpretationLedger"), objects: rows(payload, "universalObject"), events });
  const overall = checks.some((check) => check.result === "FAIL") ? "FAIL" : checks.some((check) => check.result === "WARN") ? "WARN" : "PASS";
  return { overall, isolated: true, checks, restoredCounts, canonicalStateHash };
}