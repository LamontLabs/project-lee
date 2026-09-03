import { desc, eq, sql } from "drizzle-orm";
import {
  archiveManifest,
  backupArchive,
  db,
  eventLog,
  factLedger,
  interpretationLedger,
  memoryConflict,
  memoryConsolidationPhase,
  memoryConsolidationRun,
  projectionCheckpoint,
  provenanceRecord,
  semanticIndex,
  sourceChunk,
  sourceVault,
  universalObject,
  workingMemory,
} from "@workspace/db";
import { getRecoveryMode } from "./recovery-modes";
import { getStorageStatus } from "./retention";
import { digest } from "./backup-restore";

export type MemoryHealthResult = "PASS" | "WARN" | "FAIL";

export type MemoryHealthCheck = {
  id: string;
  label: string;
  result: MemoryHealthResult;
  message: string;
  metrics: Record<string, unknown>;
  evidenceRefs: string[];
  recoverySteps: string[];
};

export type MemoryHealthMeasurements = {
  database: { reachable: boolean; error?: string };
  eventLog: { count: number; sequenceGaps: number; duplicateSequences: number; invalidCausation: number; latestEventId?: string; latestSequence?: number };
  archive: { sourceCount: number; archivedSourceCount: number; manifestCount: number; missingArchivedSources: number; missingIntegrity: number; corrupt: number; evidenceRefs?: string[] };
  semantic: { canonicalCount: number; indexedCount: number; staleCount: number; orphanedCount: number; modelVersions: string[]; evidenceRefs?: string[] };
  evidence: { orphanedCount: number; provenanceBearing: number; provenanceComplete: number; evidenceRefs?: string[] };
  duplicates: { groups: number; records: number; evidenceRefs?: string[] };
  backup: { count: number; latestAgeHours: number | null; latestVerified: boolean; checksumValid: boolean; latestId?: string };
  restore: { status: "passed" | "warning" | "failed" | null; testedAt?: string | null; latestId?: string };
  capacity: { trackedBytes: number; capacityBytes: number; pressureScore: number; archiveHealth: string; corruptCount: number };
  consolidation: { staleRuns: number; stalePhases: number; failedRuns: number; evidenceRefs?: string[] };
  contradictions: { open: number; evidenceRefs?: string[] };
  rebuild: { semantic: number; projections: number; workingMemory: number; evidenceRefs?: string[] };
  corruption: { indicators: number; evidenceRefs?: string[] };
};

export type MemoryHealthReport = {
  version: "memory-health.v1";
  generatedAt: string;
  overall: MemoryHealthResult;
  recoveryMode: string;
  canonicalBrain: {
    status: MemoryHealthResult;
    databaseReachable: boolean;
    eventCount: number;
    latestEventId: string | null;
    latestSequence: number | null;
    canonicalRecords: number;
  };
  retrieval: {
    semanticIndex: Record<string, unknown>;
    rebuildableCaches: { queryCache: "rebuildable"; contextScores: "rebuildable" };
  };
  checks: MemoryHealthCheck[];
  recoveryPlan: Array<{ checkId: string; priority: "now" | "next" | "monitor"; action: string; result: MemoryHealthResult }>;
  machineLossProof: {
    backupIncludesCanonicalBrain: boolean;
    providerCredentialsExcluded: boolean;
    isolatedRestoreRequired: boolean;
    overwritePolicy: "never-overwrite-existing-installation";
    resumeRequiresProviderReauthorization: boolean;
  };
};

const worst = (results: MemoryHealthResult[]) => results.includes("FAIL") ? "FAIL" : results.includes("WARN") ? "WARN" : "PASS";
const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

function makeCheck(
  id: string,
  label: string,
  result: MemoryHealthResult,
  message: string,
  metrics: Record<string, unknown>,
  evidenceRefs: string[],
  recoverySteps: string[],
): MemoryHealthCheck {
  return { id, label, result, message, metrics, evidenceRefs: unique(evidenceRefs), recoverySteps };
}

export function evaluateMemoryHealth(measurements: MemoryHealthMeasurements, recoveryMode = "COLD_BOOT"): MemoryHealthReport {
  const canonicalFailure = !measurements.database.reachable || measurements.eventLog.sequenceGaps > 0 || measurements.eventLog.duplicateSequences > 0 || measurements.eventLog.invalidCausation > 0;
  const semanticNeedsRebuild = measurements.semantic.staleCount + measurements.semantic.orphanedCount;
  const checks: MemoryHealthCheck[] = [
    makeCheck(
      "canonical-database",
      "Canonical database health",
      measurements.database.reachable ? "PASS" : "FAIL",
      measurements.database.reachable ? "PostgreSQL is reachable; canonical state remains authoritative." : "The canonical PostgreSQL Brain could not be reached.",
      measurements.database,
      [],
      ["Keep the installation in protected recovery mode.", "Restore only into a new empty installation after database identity and schema verification."],
    ),
    makeCheck(
      "event-log-continuity",
      "Event Log continuity",
      canonicalFailure && measurements.database.reachable ? "FAIL" : "PASS",
      canonicalFailure && measurements.database.reachable ? "Event history has sequence or causation continuity defects; canonical history is not proven." : "Event history has contiguous sequence and causation references.",
      measurements.eventLog,
      measurements.eventLog.latestEventId ? [measurements.eventLog.latestEventId] : [],
      ["Reconcile the Event Log before leaving recovery mode.", "Do not treat projections, backups, or indexes as proof of canonical history."],
    ),
    makeCheck(
      "archive-availability",
      "Archive availability",
      measurements.archive.corrupt > 0 ? "FAIL" : measurements.archive.missingArchivedSources > 0 || measurements.archive.missingIntegrity > 0 ? "WARN" : "PASS",
      measurements.archive.corrupt > 0 ? "One or more archive representations are corrupt." : measurements.archive.missingArchivedSources > 0 ? "Archived source records are missing archive manifests." : measurements.archive.manifestCount ? "Content-addressed archive manifests are available." : "No archive records are required yet.",
      measurements.archive,
      measurements.archive.evidenceRefs ?? [],
      ["Verify affected archive manifests against their content hashes.", "Preserve the original source before changing retention placement."],
    ),
    makeCheck(
      "semantic-index-freshness",
      "Semantic-index freshness",
      measurements.semantic.orphanedCount > 0 ? "WARN" : semanticNeedsRebuild > 0 ? "WARN" : "PASS",
      semanticNeedsRebuild ? "Semantic discovery is stale or incomplete; structured canonical retrieval remains authoritative." : "Semantic discovery covers current canonical records without stale rows.",
      measurements.semantic,
      measurements.semantic.evidenceRefs ?? [],
      ["Queue a bounded semantic-index rebuild.", "Keep stale or incomplete index results from lowering structured confidence silently."],
    ),
    makeCheck(
      "orphaned-evidence",
      "Orphaned evidence",
      measurements.evidence.orphanedCount > 0 ? "FAIL" : "PASS",
      measurements.evidence.orphanedCount ? "Evidence references point to records that are not present in the canonical export." : "Evidence references resolve to retained canonical records.",
      measurements.evidence,
      measurements.evidence.evidenceRefs ?? [],
      ["Restore or reconcile the missing evidence target.", "Do not promote or act on records with unresolved evidence."],
    ),
    makeCheck(
      "provenance-completeness",
      "Provenance completeness",
      measurements.evidence.provenanceComplete < measurements.evidence.provenanceBearing ? "FAIL" : "PASS",
      measurements.evidence.provenanceComplete < measurements.evidence.provenanceBearing ? "Some fact, interpretation, or provenance records lack a resolvable evidence chain." : "Evidence-bearing records have complete provenance links.",
      measurements.evidence,
      measurements.evidence.evidenceRefs ?? [],
      ["Repair provenance links with an append-only reconciliation event.", "Keep incomplete records out of consequential recommendations."],
    ),
    makeCheck(
      "unresolved-duplicates",
      "Unresolved duplicates",
      measurements.duplicates.groups > 0 ? "WARN" : "PASS",
      measurements.duplicates.groups ? "Duplicate representations are visible and retained for owner review; nothing was silently merged." : "No unresolved duplicate groups were detected.",
      measurements.duplicates,
      measurements.duplicates.evidenceRefs ?? [],
      ["Review duplicate groups with their evidence.", "Merge only through an owner-approved, auditable path."],
    ),
    makeCheck(
      "backup-freshness",
      "Backup freshness",
      !measurements.backup.count || measurements.backup.latestAgeHours === null ? "FAIL" : measurements.backup.latestAgeHours > 168 || !measurements.backup.checksumValid ? "FAIL" : measurements.backup.latestAgeHours > 24 || !measurements.backup.latestVerified ? "WARN" : "PASS",
      !measurements.backup.count ? "No portable backup has been recorded." : measurements.backup.latestAgeHours !== null && measurements.backup.latestAgeHours > 24 ? "The latest portable backup is older than the freshness target." : "A recent portable backup with integrity metadata is recorded.",
      measurements.backup,
      measurements.backup.latestId ? [measurements.backup.latestId] : [],
      ["Create an owner-reviewed portable backup.", "Verify its checksum and isolated restore before relying on it for machine replacement."],
    ),
    makeCheck(
      "restore-test",
      "Restore-test status",
      measurements.restore.status === "failed" ? "FAIL" : measurements.restore.status === "warning" || measurements.restore.status === null ? "WARN" : "PASS",
      measurements.restore.status === "passed" ? "The latest portable backup passed isolated restore verification." : measurements.restore.status === "failed" ? "The latest restore verification failed." : "No passing isolated restore proof is recorded for the latest backup.",
      measurements.restore,
      measurements.restore.latestId ? [measurements.restore.latestId] : [],
      ["Run the isolated PostgreSQL restore verifier.", "Never import into an existing installation; require a new empty installation and owner confirmation."],
    ),
    makeCheck(
      "archive-capacity",
      "Disk and archive capacity",
      measurements.capacity.pressureScore >= 1 || measurements.capacity.corruptCount > 0 ? "FAIL" : measurements.capacity.pressureScore >= 0.82 ? "WARN" : "PASS",
      measurements.capacity.corruptCount ? "Archive integrity failures are present." : `Archive usage is ${Math.round(measurements.capacity.pressureScore * 100)}% of the configured capacity.`,
      measurements.capacity,
      [],
      ["Use the staged retention pressure plan.", "Clean only rebuildable caches automatically; require owner decisions for archive movement or purge."],
    ),
    makeCheck(
      "corruption-indicators",
      "Corruption indicators",
      measurements.corruption.indicators > 0 ? "FAIL" : "PASS",
      measurements.corruption.indicators ? "Integrity checks detected possible corruption in durable or derived memory." : "No corruption indicators are currently recorded.",
      measurements.corruption,
      measurements.corruption.evidenceRefs ?? [],
      ["Keep canonical writes protected.", "Compare against a known-good backup and rerun isolated restore verification."],
    ),
    makeCheck(
      "stale-consolidations",
      "Stale consolidations",
      measurements.consolidation.staleRuns > 0 || measurements.consolidation.stalePhases > 0 ? "WARN" : measurements.consolidation.failedRuns > 0 ? "WARN" : "PASS",
      measurements.consolidation.staleRuns || measurements.consolidation.stalePhases ? "A consolidation checkpoint is stale and needs a safe resume or explicit failure review." : measurements.consolidation.failedRuns ? "A consolidation run failed; its checkpoint remains available for review." : "Consolidation checkpoints are current.",
      measurements.consolidation,
      measurements.consolidation.evidenceRefs ?? [],
      ["Resume only from the persisted phase checkpoint.", "Keep failed or skipped work visible rather than rewriting history."],
    ),
    makeCheck(
      "contradictions",
      "Unresolved contradictions",
      measurements.contradictions.open > 0 ? "WARN" : "PASS",
      measurements.contradictions.open ? `${measurements.contradictions.open} open contradiction(s) remain separated from facts and interpretations.` : "No open memory contradictions are recorded.",
      measurements.contradictions,
      measurements.contradictions.evidenceRefs ?? [],
      ["Surface both sides of each contradiction.", "Do not select a winner without owner review and supporting evidence."],
    ),
    makeCheck(
      "rebuild-requirements",
      "Rebuild requirements",
      measurements.rebuild.semantic + measurements.rebuild.projections + measurements.rebuild.workingMemory > 0 ? "WARN" : "PASS",
      measurements.rebuild.semantic + measurements.rebuild.projections + measurements.rebuild.workingMemory ? "Derived retrieval or projection state needs a rebuild; canonical records remain separate." : "No derived-memory rebuild is currently required.",
      measurements.rebuild,
      measurements.rebuild.evidenceRefs ?? [],
      ["Rebuild semantic indexes, projections, or Working Memory from canonical records.", "Record the rebuild result and keep incomplete derived state visible."],
    ),
  ];
  const overall = worst(checks.map((check) => check.result));
  const recoveryPlan = checks
    .filter((check) => check.result !== "PASS")
    .flatMap((check) => check.recoverySteps.slice(0, 1).map((action) => ({
      checkId: check.id,
      priority: check.result === "FAIL" ? "now" as const : check.id === "backup-freshness" || check.id === "restore-test" ? "next" as const : "monitor" as const,
      action,
      result: check.result,
    })));
  return {
    version: "memory-health.v1",
    generatedAt: new Date().toISOString(),
    overall,
    recoveryMode,
    canonicalBrain: {
      status: canonicalFailure ? "FAIL" : "PASS",
      databaseReachable: measurements.database.reachable,
      eventCount: measurements.eventLog.count,
      latestEventId: measurements.eventLog.latestEventId ?? null,
      latestSequence: measurements.eventLog.latestSequence ?? null,
      canonicalRecords: measurements.semantic.canonicalCount,
    },
    retrieval: {
      semanticIndex: {
        indexedCount: measurements.semantic.indexedCount,
        canonicalCount: measurements.semantic.canonicalCount,
        staleCount: measurements.semantic.staleCount,
        orphanedCount: measurements.semantic.orphanedCount,
        modelVersions: measurements.semantic.modelVersions,
      },
      rebuildableCaches: { queryCache: "rebuildable", contextScores: "rebuildable" },
    },
    checks,
    recoveryPlan,
    machineLossProof: {
      backupIncludesCanonicalBrain: measurements.backup.count > 0,
      providerCredentialsExcluded: true,
      isolatedRestoreRequired: true,
      overwritePolicy: "never-overwrite-existing-installation",
      resumeRequiresProviderReauthorization: true,
    },
  };
}

function ageHours(value: Date | null | undefined) {
  return value ? Math.max(0, (Date.now() - value.getTime()) / 3_600_000) : null;
}

export async function getMemoryHealth(): Promise<MemoryHealthReport> {
  let database: MemoryHealthMeasurements["database"] = { reachable: true };
  try {
    await db.execute(sql`select 1`);
  } catch (error) {
    database = { reachable: false, error: error instanceof Error ? error.message : String(error) };
  }
  if (!database.reachable) {
    return evaluateMemoryHealth({
      database,
      eventLog: { count: 0, sequenceGaps: 0, duplicateSequences: 0, invalidCausation: 0 },
      archive: { sourceCount: 0, archivedSourceCount: 0, manifestCount: 0, missingArchivedSources: 0, missingIntegrity: 0, corrupt: 0 },
      semantic: { canonicalCount: 0, indexedCount: 0, staleCount: 0, orphanedCount: 0, modelVersions: [] },
      evidence: { orphanedCount: 0, provenanceBearing: 0, provenanceComplete: 0 },
      duplicates: { groups: 0, records: 0 },
      backup: { count: 0, latestAgeHours: null, latestVerified: false, checksumValid: false },
      restore: { status: null },
      capacity: { trackedBytes: 0, capacityBytes: 0, pressureScore: 0, archiveHealth: "unavailable", corruptCount: 0 },
      consolidation: { staleRuns: 0, stalePhases: 0, failedRuns: 0 },
      contradictions: { open: 0 },
      rebuild: { semantic: 0, projections: 0, workingMemory: 0 },
      corruption: { indicators: 0 },
    }, getRecoveryMode().mode);
  }

  const [objects, facts, interpretations, sources, chunks, events, provenance, indexes, archives, conflicts, backups, runs, phases, checkpoints, workingRows, storage] = await Promise.all([
    db.select().from(universalObject),
    db.select().from(factLedger),
    db.select().from(interpretationLedger),
    db.select().from(sourceVault),
    db.select().from(sourceChunk),
    db.select().from(eventLog),
    db.select().from(provenanceRecord),
    db.select().from(semanticIndex),
    db.select().from(archiveManifest),
    db.select().from(memoryConflict).where(eq(memoryConflict.status, "open")),
    db.select().from(backupArchive).orderBy(desc(backupArchive.createdAt)).limit(12),
    db.select().from(memoryConsolidationRun),
    db.select().from(memoryConsolidationPhase),
    db.select().from(projectionCheckpoint),
    db.select().from(workingMemory),
    getStorageStatus(),
  ]);
  const knownIds = new Set([...objects, ...facts, ...interpretations, ...sources, ...chunks, ...events].map((row) => row.id));
  const eventIds = new Set(events.map((event) => event.id));
  const orderedSequences = events.map((event) => Number(event.sequenceNumber)).filter(Number.isFinite).sort((a, b) => a - b);
  let sequenceGaps = orderedSequences.length > 1 ? orderedSequences.slice(1).reduce((count, value, index) => count + Math.max(0, value - orderedSequences[index] - 1), 0) : 0;
  const duplicateSequences = orderedSequences.filter((value, index) => index > 0 && value === orderedSequences[index - 1]).length;
  const invalidCausation = events.filter((event) => event.causationId && !eventIds.has(event.causationId)).length;
  if (orderedSequences.length && orderedSequences[0] > 1) sequenceGaps += orderedSequences[0] - 1;
  const latestEvent = events.slice().sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];
  const archivedSources = sources.filter((source) => String(source.ageState).toLowerCase() === "archived");
  const archiveBySource = new Set(archives.map((archive) => archive.sourceId));
  const missingArchived = archivedSources.filter((source) => !archiveBySource.has(source.id));
  const missingIntegrity = archives.filter((archive) => archive.integrityState === "missing").length;
  const corrupt = archives.filter((archive) => archive.integrityState === "corrupt").length;
  const sourceByKey = new Map<string, Date>([
    ...objects.map((row) => [`universal_object:${row.id}`, row.updatedAt] as const),
    ...facts.map((row) => [`fact:${row.id}`, row.updatedAt] as const),
    ...interpretations.map((row) => [`interpretation:${row.id}`, row.updatedAt] as const),
  ]);
  const indexKeys = new Set(indexes.map((row) => `${row.objectType}:${row.objectId}`));
  const staleIndexes = indexes.filter((row) => {
    const updatedAt = sourceByKey.get(`${row.objectType}:${row.objectId}`);
    return updatedAt ? row.sourceUpdatedAt < updatedAt : false;
  });
  const canonicalRecords = sourceByKey.size;
  const missingIndexes = [...sourceByKey.keys()].filter((key) => !indexKeys.has(key));
  const orphanedIndexes = indexes.filter((row) => !sourceByKey.has(`${row.objectType}:${row.objectId}`));
  const orphanedFacts = facts.flatMap((fact) => (fact.sourceEvidence ?? []).filter((ref) => !knownIds.has(ref)).map(() => fact.id));
  const orphanedInterpretations = interpretations.flatMap((item) => [...(item.inputFacts ?? []), ...(item.inputInterpretations ?? [])].filter((ref) => !knownIds.has(ref)).map(() => item.id));
  const orphanedProvenance = provenance.filter((item) => !knownIds.has(item.sourceRef) || !knownIds.has(item.recordId)).map((item) => item.id);
  const factKeys = new Map<string, string[]>();
  for (const fact of facts) {
    const key = `${fact.subject.trim().toLowerCase()}:${fact.predicate.trim().toLowerCase()}:${fact.object.trim().toLowerCase()}`;
    factKeys.set(key, [...(factKeys.get(key) ?? []), fact.id]);
  }
  const duplicateGroups = [...factKeys.values()].filter((ids) => ids.length > 1);
  const latestBackup = backups[0];
  const latestAge = ageHours(latestBackup?.createdAt);
  const checksumValid = Boolean(
    latestBackup?.manifest
      && latestBackup?.payload
      && (latestBackup.manifest as any).integrity?.payload_checksum
      && digest(latestBackup.payload) === (latestBackup.manifest as any).integrity.payload_checksum,
  );
  const latestRestore = backups.find((backup) => backup.restoreTestStatus || backup.restoreTestedAt);
  const staleRuns = runs.filter((run) => run.status === "running" && (ageHours(run.lastHeartbeatAt) ?? Infinity) > 0.25);
  const stalePhases = phases.filter((phase) => phase.status === "running" && (ageHours(phase.lastHeartbeatAt) ?? Infinity) > 0.25);
  const failedRuns = runs.filter((run) => run.status === "failed").length;
  const projectionLag = checkpoints.filter((checkpoint) => checkpoint.status !== "ready" || (latestEvent && checkpoint.lastCreatedAt && checkpoint.lastCreatedAt < latestEvent.occurredAt)).length;
  const staleWorkingMemory = workingRows.filter((row) => (ageHours(row.lastAssembledAt) ?? Infinity) > 24).length;
  const unresolvedDuplicates = duplicateGroups.flat();
  const measurements: MemoryHealthMeasurements = {
    database,
    eventLog: { count: events.length, sequenceGaps, duplicateSequences, invalidCausation, latestEventId: latestEvent?.id, latestSequence: orderedSequences.at(-1) },
    archive: { sourceCount: sources.length, archivedSourceCount: archivedSources.length, manifestCount: archives.length, missingArchivedSources: missingArchived.length, missingIntegrity, corrupt, evidenceRefs: [...missingArchived.map((row) => row.id), ...archives.filter((row) => row.integrityState !== "verified").map((row) => row.id)] },
    semantic: { canonicalCount: canonicalRecords, indexedCount: indexes.length, staleCount: staleIndexes.length + missingIndexes.length, orphanedCount: orphanedIndexes.length, modelVersions: unique(indexes.map((row) => row.modelVersion)), evidenceRefs: [...staleIndexes.map((row) => row.id), ...orphanedIndexes.map((row) => row.id)] },
    evidence: { orphanedCount: unique([...orphanedFacts, ...orphanedInterpretations, ...orphanedProvenance]).length, provenanceBearing: facts.length + interpretations.length + provenance.length, provenanceComplete: facts.filter((row) => (row.sourceEvidence ?? []).every((ref) => knownIds.has(ref))).length + interpretations.filter((row) => [...(row.inputFacts ?? []), ...(row.inputInterpretations ?? [])].every((ref) => knownIds.has(ref))).length + provenance.filter((row) => knownIds.has(row.sourceRef) && knownIds.has(row.recordId)).length, evidenceRefs: [...orphanedFacts, ...orphanedInterpretations, ...orphanedProvenance] },
    duplicates: { groups: duplicateGroups.length, records: unresolvedDuplicates.length, evidenceRefs: unresolvedDuplicates },
    backup: { count: backups.length, latestAgeHours: latestAge, latestVerified: Boolean(latestBackup?.verifiedAt), checksumValid, latestId: latestBackup?.id },
    restore: { status: latestRestore?.restoreTestStatus === "passed" ? "passed" : latestRestore?.restoreTestStatus === "failed" ? "failed" : latestRestore ? "warning" : null, testedAt: latestRestore?.restoreTestedAt?.toISOString() ?? null, latestId: latestRestore?.id },
    capacity: { trackedBytes: storage.trackedBytes, capacityBytes: Number(process.env.LEE_STORAGE_CAPACITY_BYTES ?? 10 * 1024 * 1024 * 1024), pressureScore: storage.trackedBytes / Number(process.env.LEE_STORAGE_CAPACITY_BYTES ?? 10 * 1024 * 1024 * 1024), archiveHealth: storage.health, corruptCount: storage.byIntegrity.corrupt ?? 0 },
    consolidation: { staleRuns: staleRuns.length, stalePhases: stalePhases.length, failedRuns, evidenceRefs: [...staleRuns.map((row) => row.id), ...stalePhases.map((row) => row.id)] },
    contradictions: { open: conflicts.length, evidenceRefs: conflicts.map((row) => row.id) },
    rebuild: { semantic: missingIndexes.length + staleIndexes.length, projections: projectionLag, workingMemory: staleWorkingMemory + (canonicalRecords > 0 && workingRows.length === 0 ? 1 : 0), evidenceRefs: [...missingIndexes.map((key) => key), ...checkpoints.filter((row) => row.status !== "ready").map((row) => row.id), ...workingRows.filter((row) => (ageHours(row.lastAssembledAt) ?? Infinity) > 24).map((row) => row.id)] },
    corruption: { indicators: corrupt + backups.filter((row) => row.status === "invalid").length, evidenceRefs: [...archives.filter((row) => row.integrityState === "corrupt").map((row) => row.id), ...backups.filter((row) => row.status === "invalid").map((row) => row.id)] },
  };
  return evaluateMemoryHealth(measurements, getRecoveryMode().mode);
}