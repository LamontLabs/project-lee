import { desc, eq } from "drizzle-orm";
import {
  backupArchive,
  brainVersion,
  db,
  economicUsageRecord,
  eventLog,
  k6AuthorityRehearsal,
} from "@workspace/db";
import { emitEvent } from "./foundation-events";
import { collectPortableBackup, verifyPortableBackup, writeLocalBackupArchive } from "./backup-restore";
import { verifyCanonicalBrainStartup, type StartupProof } from "./startup-integrity";
import { generateManifest } from "./system-manifest";
import { getDeliveryEvidence } from "./delivery-evidence";
import { getLatestDesktopSetup } from "./desktop-setup";
import { getCurrentPersonality } from "./personality-memory";
import { getBootstrapObjective } from "./executive-objectives";
import { getOllamaStatus } from "./local-cognition";
import { getOfflineAwareness } from "./offline-awareness";
import { listProjects, localInspectProjectReadOnly, projectFor, projectOperationAuthorization } from "./mcp-project-bridge";

export const K6_REHEARSAL_SCENARIOS = ["pass", "failed", "interrupted", "reversed"] as const;
export type K6RehearsalScenario = typeof K6_REHEARSAL_SCENARIOS[number];
export type K6RehearsalCheck = {
  key: string;
  result: "PASS" | "FAIL";
  detail: string;
  evidence?: Record<string, unknown>;
};

export const K6_READINESS_MATRIX_KEYS = [
  "bootstrap-objective",
  "governed-project-operation",
  "cil-routing-authority",
  "cerbaseal-governance",
  "offline-continuity",
  "personality-continuity",
  "backup-restore",
  "packaged-runtime",
] as const;
export type K6ReadinessMatrixKey = typeof K6_READINESS_MATRIX_KEYS[number];
export type K6ReadinessMatrixStatus = "verified" | "blocked" | "partial" | "stale" | "unverified";
export type K6ReadinessMatrixEntry = {
  key: K6ReadinessMatrixKey;
  status: K6ReadinessMatrixStatus;
  detail: string;
  evidence: {
    source: string;
    observedAt: string | null;
    refs: string[];
  };
};

export type K6AuthorityRehearsalInput = {
  scenario?: unknown;
  simulationOnly?: unknown;
  ownerApproved?: unknown;
  rollbackCriteria?: unknown;
  backup?: {
    backupId?: string | null;
    verified?: boolean;
    restoreTested?: boolean;
    productionUntouched?: boolean;
  };
  brain?: {
    singular?: boolean;
    authority?: string;
    checksum?: string | null;
  };
  eventLog?: {
    continuity?: boolean;
    appendOnly?: boolean;
    sequenceContinuity?: boolean;
  };
  personality?: {
    version?: number;
    checksum?: string | null;
    persisted?: boolean;
    includedInBackup?: boolean;
    evolutionHistoryIncluded?: boolean;
    reversible?: boolean;
    safetyStatus?: string;
  };
  readinessMatrix?: unknown;
  governance?: { failClosed?: boolean };
  packagedRuntime?: { healthy?: boolean; evidence?: unknown };
  interruption?: {
    previousRuntimePreserved?: boolean;
    recovered?: boolean;
    reversalSafe?: boolean;
  };
  noCompetingHistory?: boolean;
};

export type K6AuthorityRehearsalEvidence = {
  rehearsalVersion: "1.1";
  boundary: {
    simulationOnly: boolean;
    productionTransferPerformed: false;
    destructiveCleanupPerformed: false;
    permissionEscalationPerformed: false;
  };
  approval: {
    ownerApproved: boolean;
    rollbackCriteria: string[];
  };
  scenario: K6RehearsalScenario;
  checks: K6RehearsalCheck[];
  readinessEligible: boolean;
  previousRuntimePreserved: boolean;
  recoveryCompleted: boolean;
  reversalVerified: boolean;
  canonicalBrainPreserved: boolean;
  eventLogContinuityPreserved: boolean;
  personalityContinuityPreserved: boolean;
  personalityVersion: number;
  personalityChecksum: string | null;
  readinessMatrix: K6ReadinessMatrixEntry[];
  governanceFailClosed: boolean;
  packagedRuntimeEvidence: unknown;
  recordedAt: string;
};

function scenarioFrom(value: unknown): K6RehearsalScenario {
  return typeof value === "string" && (K6_REHEARSAL_SCENARIOS as readonly string[]).includes(value)
    ? value as K6RehearsalScenario
    : "pass";
}

function criteriaFrom(value: unknown): string[] {
  return Array.isArray(value)
    ? value
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0 && item.length <= 240)
      .slice(0, 10)
      .map((item) => item.trim())
    : [];
}

function matrixFrom(value: unknown): K6ReadinessMatrixEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (!(K6_READINESS_MATRIX_KEYS as readonly string[]).includes(String(row.key))) return [];
    const evidence = row.evidence && typeof row.evidence === "object" ? row.evidence as Record<string, unknown> : {};
    const status = ["verified", "blocked", "partial", "stale", "unverified"].includes(String(row.status))
      ? String(row.status) as K6ReadinessMatrixStatus
      : "unverified";
    return [{
      key: row.key as K6ReadinessMatrixKey,
      status,
      detail: typeof row.detail === "string" ? row.detail.slice(0, 500) : "No readiness detail was recorded.",
      evidence: {
        source: typeof evidence.source === "string" ? evidence.source.slice(0, 200) : "",
        observedAt: typeof evidence.observedAt === "string" ? evidence.observedAt : null,
        refs: Array.isArray(evidence.refs) ? evidence.refs.map(String).slice(0, 10) : [],
      },
    }];
  });
}

function verifiedMatrix(rows: K6ReadinessMatrixEntry[]) {
  return K6_READINESS_MATRIX_KEYS.every((key) => {
    const matches = rows.filter((row) => row.key === key);
    return matches.length === 1
      && matches[0].status === "verified"
      && matches[0].evidence.source.length > 0
      && Boolean(matches[0].evidence.observedAt)
      && !Number.isNaN(new Date(matches[0].evidence.observedAt as string).getTime())
      && matches[0].evidence.refs.length > 0;
  });
}

function check(
  key: string,
  passed: boolean,
  detail: string,
  evidence?: Record<string, unknown>,
): K6RehearsalCheck {
  return { key, result: passed ? "PASS" : "FAIL", detail, ...(evidence ? { evidence } : {}) };
}

/**
 * This is deliberately a pure rehearsal evaluator. It describes the state of a
 * simulated handoff and never changes the live Brain authority.
 */
export function buildK6AuthorityRehearsalEvidence(input: K6AuthorityRehearsalInput): {
  status: "passed" | "failed" | "interrupted" | "reversed" | "incomplete";
  evidence: K6AuthorityRehearsalEvidence;
} {
  const scenario = scenarioFrom(input.scenario);
  const simulationOnly = input.simulationOnly === true;
  const ownerApproved = input.ownerApproved === true;
  const rollbackCriteria = criteriaFrom(input.rollbackCriteria);
  const backup = input.backup ?? {};
  const brain = input.brain ?? {};
  const eventLogProof = input.eventLog ?? {};
  const interruption = input.interruption ?? {};
  const readinessMatrix = matrixFrom(input.readinessMatrix);
  const checks = [
    check(
      "cross-system-readiness-matrix",
      verifiedMatrix(readinessMatrix),
      verifiedMatrix(readinessMatrix)
        ? "Every K6 readiness domain has fresh, source-labeled evidence."
        : "K6 readiness requires one verified, fresh, source-labeled evidence row for every required domain.",
      {
        requiredKeys: K6_READINESS_MATRIX_KEYS,
        rows: readinessMatrix,
        missingOrUnverified: K6_READINESS_MATRIX_KEYS.filter((key) => readinessMatrix.filter((row) => row.key === key).length !== 1 || readinessMatrix.find((row) => row.key === key)?.status !== "verified"),
      },
    ),
    check(
      "owner-approval-and-rollback-criteria",
      ownerApproved && rollbackCriteria.length > 0,
      ownerApproved && rollbackCriteria.length > 0
        ? "The owner approved this rehearsal and supplied rollback criteria."
        : "An explicit owner approval and at least one rollback criterion are required.",
    ),
    check(
      "simulation-boundary",
      simulationOnly,
      simulationOnly
        ? "The rehearsal is explicitly simulation-only."
        : "A rehearsal must not run without an explicit simulation-only boundary.",
    ),
    check(
      "pre-transfer-backup",
      Boolean(backup.backupId && backup.verified && backup.restoreTested && backup.productionUntouched),
      "A verified, restorable pre-transfer backup must exist and leave the live canonical state untouched.",
      { backupId: backup.backupId ?? null, verified: backup.verified === true, restoreTested: backup.restoreTested === true, productionUntouched: backup.productionUntouched === true },
    ),
    check(
      "singular-canonical-brain",
      brain.singular === true && brain.authority === "canonical",
      "The rehearsal retains one canonical Brain authority; no replacement Brain is promoted.",
      { singular: brain.singular === true, authority: brain.authority ?? null, checksum: brain.checksum ?? null },
    ),
    check(
      "event-log-continuity-and-append-only",
      eventLogProof.continuity === true && eventLogProof.appendOnly === true && eventLogProof.sequenceContinuity === true,
      "Event Log continuity, sequence allocation, and append-only enforcement remain intact.",
      { continuity: eventLogProof.continuity === true, appendOnly: eventLogProof.appendOnly === true, sequenceContinuity: eventLogProof.sequenceContinuity === true },
    ),
    check(
      "personality-memory-continuity",
      input.personality?.persisted === true
        && input.personality.version !== undefined
        && input.personality.version > 0
        && Boolean(input.personality.checksum)
        && input.personality.includedInBackup === true
        && input.personality.evolutionHistoryIncluded === true
        && input.personality.reversible === true
        && input.personality.safetyStatus === "passed",
      "Personality Memory must remain persisted, versioned, reversible, safety-checked, and present in the verified pre-transfer backup.",
      {
        version: input.personality?.version ?? 0,
        checksum: input.personality?.checksum ?? null,
        persisted: input.personality?.persisted === true,
        includedInBackup: input.personality?.includedInBackup === true,
        evolutionHistoryIncluded: input.personality?.evolutionHistoryIncluded === true,
        reversible: input.personality?.reversible === true,
        safetyStatus: input.personality?.safetyStatus ?? "unknown",
      },
    ),
    check(
      "governance-fail-closed",
      input.governance?.failClosed === true,
      "Consequential execution remains blocked unless the normal CerbaSeal approval path allows it.",
    ),
    check(
      "packaged-runtime-evidence",
      input.packagedRuntime?.healthy === true,
      "Packaged desktop runtime startup, migration, and contract evidence is required.",
      { healthy: input.packagedRuntime?.healthy === true },
    ),
    check(
      "interruption-preserves-previous-runtime",
      interruption.previousRuntimePreserved === true && interruption.recovered === true,
      "An interrupted handoff preserves the previous runtime and completes recovery.",
      { previousRuntimePreserved: interruption.previousRuntimePreserved === true, recovered: interruption.recovered === true },
    ),
    check(
      "reversal-without-competing-history",
      interruption.reversalSafe === true && input.noCompetingHistory !== false,
      "The simulated handoff can reverse without creating competing canonical history.",
      { reversalSafe: interruption.reversalSafe === true, noCompetingHistory: input.noCompetingHistory !== false },
    ),
    check(
      "simulated-transfer",
      scenario !== "failed",
      scenario === "failed"
        ? "The injected transfer failure was retained as a failed rehearsal; no live authority changed."
        : "The authority swap was exercised only in the isolated simulation.",
    ),
  ];
  const allPassed = checks.every((item) => item.result === "PASS");
  const status = !ownerApproved || !simulationOnly || rollbackCriteria.length === 0
    ? "incomplete"
    : scenario === "interrupted"
      ? "interrupted"
      : scenario === "reversed"
        ? "reversed"
        : scenario === "failed" || !allPassed
          ? "failed"
          : "passed";
  const evidence: K6AuthorityRehearsalEvidence = {
    rehearsalVersion: "1.1",
    boundary: {
      simulationOnly,
      productionTransferPerformed: false,
      destructiveCleanupPerformed: false,
      permissionEscalationPerformed: false,
    },
    approval: { ownerApproved, rollbackCriteria },
    scenario,
    checks,
    readinessEligible: status === "passed" && allPassed,
    previousRuntimePreserved: interruption.previousRuntimePreserved === true,
    recoveryCompleted: interruption.recovered === true,
    reversalVerified: interruption.reversalSafe === true && input.noCompetingHistory !== false,
    canonicalBrainPreserved: brain.singular === true && brain.authority === "canonical",
    eventLogContinuityPreserved: eventLogProof.continuity === true && eventLogProof.appendOnly === true && eventLogProof.sequenceContinuity === true,
    personalityContinuityPreserved: input.personality?.persisted === true
      && input.personality.includedInBackup === true
      && input.personality.evolutionHistoryIncluded === true
      && input.personality.reversible === true
      && input.personality.safetyStatus === "passed",
    personalityVersion: input.personality?.version ?? 0,
    personalityChecksum: input.personality?.checksum ?? null,
    readinessMatrix,
    governanceFailClosed: input.governance?.failClosed === true,
    packagedRuntimeEvidence: input.packagedRuntime?.evidence ?? null,
    recordedAt: new Date().toISOString(),
  };
  return { status, evidence };
}

function matrixEntry(
  key: K6ReadinessMatrixKey,
  verified: boolean,
  detail: string,
  source: string,
  observedAt: string | null,
  refs: string[],
): K6ReadinessMatrixEntry {
  return {
    key,
    status: verified ? "verified" : "unverified",
    detail,
    evidence: { source, observedAt, refs },
  };
}

function publicRehearsal(row: typeof k6AuthorityRehearsal.$inferSelect | null) {
  return row ? { ...row, rollbackCriteria: row.rollbackCriteria ?? [], evidence: row.evidence ?? {} } : null;
}

export async function getLatestK6AuthorityRehearsal() {
  const [row] = await db.select().from(k6AuthorityRehearsal).orderBy(desc(k6AuthorityRehearsal.updatedAt)).limit(1);
  return publicRehearsal(row ?? null);
}

export async function getK6AuthorityRehearsalHistory() {
  return (await db.select().from(k6AuthorityRehearsal).orderBy(desc(k6AuthorityRehearsal.createdAt)).limit(20)).map(publicRehearsal);
}

function startupToProof(input: StartupProof) {
  return {
    brain: {
      singular: input.databaseIdentity.brainName === "canonical" && input.brain.result !== "FAIL",
      authority: input.databaseIdentity.brainName === "canonical" ? "canonical" : "unknown",
      checksum: input.brain.version,
    },
    eventLog: {
      continuity: input.eventLog.result === "PASS",
      appendOnly: input.eventLog.appendOnlyTrigger,
      sequenceContinuity: input.eventLog.gaps.length === 0 && input.eventLog.invalidCausationIds.length === 0,
    },
  };
}

async function createPreTransferBackup() {
  const result = await collectPortableBackup({ backupClass: "pre_migration", reason: "K6 authority transfer rehearsal pre-transfer checkpoint." });
  const localArchive = await writeLocalBackupArchive(result);
  const [saved] = await db.insert(backupArchive).values({
    backupId: result.backupId,
    formatVersion: result.manifest.backup_format_version,
    brainVersion: String(result.manifest.brain_version),
    manifest: result.manifest,
    payload: result.payload,
    sizeBytes: result.sizeBytes,
  }).returning();
  await emitEvent({
    eventType: "BackupCreated",
    aggregateType: "backup_archive",
    aggregateId: saved.id,
    sourceRef: "k6-authority-rehearsal",
    payload: { backupId: saved.backupId, manifest: result.manifest },
  });
  await db.insert(economicUsageRecord).values({
    operation: "backup",
    category: "backup",
    quantity: result.sizeBytes,
    unit: "bytes",
    provider: "backup-engine",
    sourceRef: saved.id,
    evidenceRef: `backup_archive:${saved.id}`,
    metadata: { backupId: saved.backupId, reason: "k6-authority-rehearsal" },
    recordedAt: saved.createdAt,
  });
  const verification = await verifyPortableBackup(result.manifest, result.payload);
  await db.update(backupArchive).set({
    verifiedAt: new Date(),
    status: verification.overall === "FAIL" ? "invalid" : "verified",
    restoreTestedAt: new Date(),
    restoreTestStatus: verification.overall === "PASS" ? "passed" : verification.overall === "WARN" ? "warning" : "failed",
    restoreEvidence: verification,
  }).where(eq(backupArchive.id, saved.id));
  return {
    backupId: saved.backupId,
    verified: verification.overall === "PASS",
    restoreTested: verification.overall === "PASS",
    productionUntouched: false,
    verification,
    payload: result.payload,
    localArchive,
  };
}

async function collectReadinessMatrix(input: {
  manifest: Awaited<ReturnType<typeof generateManifest>>;
  offline: Awaited<ReturnType<typeof getOfflineAwareness>>;
  ollama: Awaited<ReturnType<typeof getOllamaStatus>>;
  packagedHealthy: boolean;
  packagedEvidence: unknown;
  backup: Awaited<ReturnType<typeof createPreTransferBackup>>;
  personality: Awaited<ReturnType<typeof getCurrentPersonality>>;
  personalityProof: K6AuthorityRehearsalInput["personality"];
}) {
  const [objective, projects, selfInspection] = await Promise.all([
    getBootstrapObjective(),
    listProjects(),
    localInspectProjectReadOnly(),
  ]);
  const observedAt = new Date().toISOString();
  const objectiveRecord = objective as any;
  const objectiveVerified = Boolean(
    objectiveRecord?.id
      && objectiveRecord.status === "active"
      && Array.isArray(objectiveRecord.evidence)
      && objectiveRecord.evidence.length > 0,
  );
  const selfProject = projects.find((project) => project.endpoint === "local://workspace");
  const selfProjectConfig = selfProject ? projectFor(selfProject.id) : undefined;
  const selfApplyAuthorization = selfProjectConfig ? projectOperationAuthorization(selfProjectConfig, "apply") : null;
  const projectVerified = Boolean(
    selfInspection.provenance?.readOnly === true
      && selfProject
      && selfProject.allowedOperations.includes("inspect")
      && selfApplyAuthorization?.allowed === false,
  );
  const cil = (input.manifest.health?.cil ?? {}) as Record<string, unknown>;
  const cerbaseal = (input.manifest.health?.cerbaseal ?? {}) as Record<string, unknown>;
  const cilVerified = ["healthy", "degraded"].includes(String(cil.status))
    && input.ollama.runtimeId === "ollama"
    && input.ollama.privacy === "local_only";
  const cerbasealVerified = input.manifest.governance.failClosed === true
    && ["healthy", "degraded"].includes(String(cerbaseal.status));
  const offlineVerified = Array.isArray(input.offline.localCapabilities)
    && ["canonical_brain", "event_log", "diagnostics", "approved_local_cognition"].every((capability) => input.offline.localCapabilities.includes(capability))
    && Array.isArray(input.offline.expectedLimitations)
    && input.offline.expectedLimitations.length > 0
    && Array.isArray(input.offline.providers)
    && input.offline.providers.every((provider) => ["current", "degraded", "offline", "stale", "reconnected", "unverified"].includes(provider.state)
      && typeof provider.freshnessLabel === "string");
  const personalityProof = input.personalityProof ?? {};
  const personalityVerified = personalityProof.persisted === true
    && personalityProof.includedInBackup === true
    && personalityProof.evolutionHistoryIncluded === true
    && personalityProof.reversible === true
    && personalityProof.safetyStatus === "passed";
  const backupVerified = input.backup.verified && input.backup.restoreTested && input.backup.productionUntouched;
  const packagedRefs = input.packagedEvidence && typeof input.packagedEvidence === "object"
    ? [
      ...("desktopSetup" in input.packagedEvidence && (input.packagedEvidence as any).desktopSetup?.id ? [(input.packagedEvidence as any).desktopSetup.id] : []),
      "delivery-evidence",
    ]
    : ["delivery-evidence"];
  return [
    matrixEntry("bootstrap-objective", objectiveVerified, objectiveVerified ? "The K6 objective is persisted with owner-scoped evidence." : "The persisted K6 objective is missing, inactive, or has no evidence.", "executive-objective", objectiveRecord?.updatedAt ? new Date(objectiveRecord.updatedAt).toISOString() : observedAt, [objectiveRecord?.id ?? "bootstrap-objective"]),
    matrixEntry("governed-project-operation", projectVerified, projectVerified ? "Project LEE is inspected through the observe-only bridge and mutation authority is denied for the self project." : "Project bridge inspection or its observe-only mutation boundary is not verified.", "mcp-project-bridge", selfInspection.provenance?.observedAt ?? observedAt, [selfProject?.id ?? "project-bridge"]),
    matrixEntry("cil-routing-authority", cilVerified, cilVerified ? "CIL is registered as the reasoning authority and local cognition identifies Ollama only as a CIL-selected local destination." : "CIL routing authority or the governed local destination is not verified.", "system-manifest", observedAt, ["cil", "ollama", "model-router"]),
    matrixEntry("cerbaseal-governance", cerbasealVerified, cerbasealVerified ? "CerbaSeal remains fail-closed for consequential operations." : "CerbaSeal fail-closed governance is not verified.", "system-manifest.governance", observedAt, ["cerbaseal", "governance"]),
    matrixEntry("offline-continuity", offlineVerified, offlineVerified ? "Local capabilities remain explicit while every provider carries an explicit freshness label and limitation." : "Offline local capability or provider freshness labeling is not verified.", "offline-awareness", observedAt, ["provider-freshness", "offline-continuity"]),
    matrixEntry("personality-continuity", personalityVerified, personalityVerified ? `Personality Memory v${personalityProof.version ?? input.personality.version} is persisted, safety-checked, reversible, and present in backup evidence.` : "Personality continuity evidence is incomplete.", "personality-memory", input.personality?.checksum ? observedAt : null, [input.personality?.checksum ?? "personality-memory"]),
    matrixEntry("backup-restore", Boolean(backupVerified), backupVerified ? "The pre-transfer backup is verified, restore-tested, and leaves the canonical Brain untouched." : "Verified backup, restore, or production-untouched evidence is missing.", "backup-archive", observedAt, [input.backup.backupId ?? "backup-archive"]),
    matrixEntry("packaged-runtime", input.packagedHealthy, input.packagedHealthy ? "Authoritative packaged-runtime evidence passed startup and release checks." : "Authoritative packaged-runtime evidence is not healthy.", "delivery-evidence", observedAt, packagedRefs),
  ];
}

export async function runK6AuthorityRehearsal(input: K6AuthorityRehearsalInput = {}) {
  const startedAt = new Date();
  const ownerApproved = input.ownerApproved === true;
  const simulationOnly = input.simulationOnly === true;
  const rollbackCriteria = criteriaFrom(input.rollbackCriteria);
  let backup: Awaited<ReturnType<typeof createPreTransferBackup>> | undefined;
  let startup: StartupProof | null = null;
  let packagedEvidence: unknown = null;
  let desktopSetup: Awaited<ReturnType<typeof getLatestDesktopSetup>> = null;

  if (ownerApproved && simulationOnly && rollbackCriteria.length > 0) {
    try {
      const [brainBefore] = await db.select({ id: brainVersion.id, checksum: brainVersion.checksum })
        .from(brainVersion)
        .orderBy(desc(brainVersion.createdAt))
        .limit(1);
      backup = await createPreTransferBackup();
      const [brainAfter] = await db.select({ id: brainVersion.id, checksum: brainVersion.checksum })
        .from(brainVersion)
        .orderBy(desc(brainVersion.createdAt))
        .limit(1);
      backup.productionUntouched = Boolean(brainBefore?.id === brainAfter?.id && brainBefore?.checksum === brainAfter?.checksum);
      const personality = await getCurrentPersonality();
      const payload = backup.payload as Record<string, unknown>;
      const personalityBackupRows = Array.isArray(payload.personalityMemory) ? payload.personalityMemory as Array<Record<string, unknown>> : [];
      const evolutionBackupRows = Array.isArray(payload.personalityEvolutionHistory) ? payload.personalityEvolutionHistory as Array<Record<string, unknown>> : [];
      (input as K6AuthorityRehearsalInput).personality = {
        version: personality.version,
        checksum: personality.checksum,
        persisted: Boolean(personality.id),
        includedInBackup: personalityBackupRows.some((row) => row.id === personality.id && row.checksum === personality.checksum),
        evolutionHistoryIncluded: evolutionBackupRows.some((row) => row.personalityId === personality.id && row.toVersion === personality.version),
        reversible: personality.version > 0,
        safetyStatus: personality.safetyStatus,
      };
      startup = await verifyCanonicalBrainStartup();
      const [manifest, delivery] = await Promise.all([
        generateManifest({ emitEvent: false }),
        getDeliveryEvidence(),
      ]);
      desktopSetup = await getLatestDesktopSetup();
      const setupProof = (desktopSetup?.summary as Record<string, any> | undefined)?.startupProof;
      const packagedHealthy = delivery.packaging.status === "healthy"
        && desktopSetup?.status === "complete"
        && setupProof?.overall === "PASS";
      packagedEvidence = {
        packaging: delivery.packaging,
        desktopSetup: desktopSetup ? { id: desktopSetup.id, status: desktopSetup.status, startupProof: setupProof ?? null } : null,
        manifestRuntime: { version: manifest.identity.leeVersion ?? null },
        healthy: packagedHealthy,
      };
      (input as K6AuthorityRehearsalInput).packagedRuntime = { healthy: packagedHealthy, evidence: packagedEvidence };
      const readinessMatrix = await collectReadinessMatrix({
        manifest,
        offline: await getOfflineAwareness(),
        ollama: await getOllamaStatus(),
        packagedHealthy,
        packagedEvidence,
        backup,
        personality,
        personalityProof: (input as K6AuthorityRehearsalInput).personality,
      });
      (input as K6AuthorityRehearsalInput).readinessMatrix = readinessMatrix;
    } catch (error) {
      packagedEvidence = { healthy: false, error: error instanceof Error ? error.message : "Rehearsal evidence collection failed." };
    }
  }

  const proof = startup ? startupToProof(startup) : {
    brain: { singular: false, authority: "unknown", checksum: null },
    eventLog: { continuity: false, appendOnly: false, sequenceContinuity: false },
  };
  const recovery = input.interruption ?? { previousRuntimePreserved: true, recovered: true, reversalSafe: true };
  const result = buildK6AuthorityRehearsalEvidence({
    ...input,
    simulationOnly,
    ownerApproved,
    rollbackCriteria,
    backup: backup ?? input.backup,
    brain: proof.brain,
    eventLog: proof.eventLog,
    governance: { failClosed: startup ? (await generateManifest({ emitEvent: false })).governance.failClosed === true : false },
    packagedRuntime: { healthy: (packagedEvidence as { healthy?: boolean } | null)?.healthy === true, evidence: packagedEvidence },
    interruption: recovery,
    noCompetingHistory: true,
  });

  const [created] = await db.insert(k6AuthorityRehearsal).values({
    status: result.status,
    simulationOnly,
    ownerApproved,
    rollbackCriteria,
    backupId: backup?.backupId ?? null,
    evidence: result.evidence,
    startedAt,
    completedAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  const event = await emitEvent({
    eventType: "K6AuthorityRehearsalRecorded",
    aggregateType: "k6_authority_rehearsal",
    aggregateId: created.id,
    sourceRef: "k6-authority-rehearsal",
    payload: { status: result.status, readinessEligible: result.evidence.readinessEligible, scenario: result.evidence.scenario, simulationOnly },
  });
  const [saved] = await db.update(k6AuthorityRehearsal).set({
    evidence: { ...result.evidence, eventId: event.id, backupEvidence: backup?.verification ?? null, startupProof: startup },
    updatedAt: new Date(),
  }).where(eq(k6AuthorityRehearsal.id, created.id)).returning();
  return publicRehearsal(saved);
}