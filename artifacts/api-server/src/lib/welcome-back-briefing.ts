import { and, desc, eq, gte, lte } from "drizzle-orm";
import {
  changeIntelligence,
  changeIntelligenceCursor,
  cleanShutdown,
  db,
  executiveObjective,
  governanceRequest,
  internalCapabilityService,
  knowledgeGap,
  memoryConsolidationPhase,
  memoryConsolidationRun,
  modelRouteDecision,
  projectRepairEvidence,
  projectRepairRun,
  projectRepairVerification,
} from "@workspace/db";
import { getRecoveryMode } from "./recovery-modes";
import { getMemoryHealth, type MemoryHealthReport } from "./memory-health";
import { openChangeCursor } from "./change-intelligence";

export const WELCOME_BACK_CURSOR_KEY = "owner:welcome-back";
export const WELCOME_BACK_BRIEFING_VERSION = "welcome-back.v1";

type BriefingStatus = "available" | "degraded" | "no_changes" | "unavailable" | "recovery_protected" | "baseline_required";
type EvidenceSectionStatus = Exclude<BriefingStatus, "recovery_protected" | "baseline_required">;

export type WelcomeBackSection = {
  id: string;
  label: string;
  status: EvidenceSectionStatus;
  statement: string | null;
  evidenceRefs: string[];
  freshness: string;
  contradictionState: string;
  unavailableReason?: string;
};

type EvidenceSummary = {
  evidenceRefs: string[];
  freshness: string;
  contradictionState: string;
};

export function resolveWelcomeBackBoundary(cursorAt: Date | null | undefined, cleanShutdownAt: Date | null | undefined) {
  if (cursorAt) return { kind: "cursor" as const, lastSessionAt: cursorAt };
  if (cleanShutdownAt) return { kind: "clean_shutdown" as const, lastSessionAt: cleanShutdownAt };
  return { kind: "baseline_required" as const, lastSessionAt: null };
}

export function welcomeBackStatus(input: { recoveryProtected: boolean; cilAvailable: boolean; evidenceCount: number; health: "PASS" | "WARN" | "FAIL" }) {
  if (input.recoveryProtected) return "recovery_protected" as const;
  if (!input.cilAvailable) return "unavailable" as const;
  if (input.evidenceCount === 0) return "no_changes" as const;
  return input.health === "PASS" ? "available" as const : "degraded" as const;
}

export function shouldAdvanceWelcomeBackCursor(status: string) {
  return status === "available" || status === "degraded" || status === "no_changes";
}

const unique = (values: Array<string | null | undefined>) => [...new Set(values.filter((value): value is string => Boolean(value)))];
const iso = (value: Date | null | undefined) => value?.toISOString() ?? null;

function ageState(value: Date | null | undefined) {
  if (!value) return "unknown";
  const days = Math.max(0, (Date.now() - value.getTime()) / 86_400_000);
  return days > 90 ? "expired" : days > 30 ? "stale" : days > 7 ? "current" : "fresh";
}

function latestDate(values: Array<Date | null | undefined>) {
  return values.filter((value): value is Date => Boolean(value)).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
}

function section(
  id: string,
  label: string,
  summary: EvidenceSummary | null,
  statement: string | null,
  unavailableReason?: string,
): WelcomeBackSection {
  if (!summary || summary.evidenceRefs.length === 0) {
    return {
      id,
      label,
      status: "unavailable",
      statement: null,
      evidenceRefs: [],
      freshness: "unavailable",
      contradictionState: "unknown",
      unavailableReason: unavailableReason ?? "No source-backed evidence is available for this section.",
    };
  }
  return {
    id,
    label,
    status: "available",
    statement,
    evidenceRefs: summary.evidenceRefs,
    freshness: summary.freshness,
    contradictionState: summary.contradictionState,
  };
}

function noChangeSection(id: string, label: string, reason: string): WelcomeBackSection {
  return {
    id,
    label,
    status: "no_changes",
    statement: null,
    evidenceRefs: [],
    freshness: "not_applicable",
    contradictionState: "unknown",
    unavailableReason: reason,
  };
}

function changeSummary(changes: Array<typeof changeIntelligence.$inferSelect>): EvidenceSummary | null {
  if (!changes.length) return null;
  const latest = latestDate(changes.map((change) => change.occurredAt));
  return {
    evidenceRefs: unique(changes.flatMap((change) => change.evidenceRefs)),
    freshness: ageState(latest),
    contradictionState: "unknown",
  };
}

function changeStatement(changes: Array<typeof changeIntelligence.$inferSelect>, empty: string) {
  if (!changes.length) return null;
  const first = changes.slice(0, 3).map((change) => change.explanation).filter(Boolean);
  return first.length ? first.join(" ") : `${changes.length} source-backed change(s) were recorded.`;
}

function healthSummary(report: MemoryHealthReport): EvidenceSummary | null {
  const evidenceRefs = unique(report.checks.flatMap((check) => check.evidenceRefs));
  const contradictionState = report.checks.some((check) => check.id === "open-contradictions" && check.result !== "PASS")
    ? "open"
    : "clear";
  return evidenceRefs.length
    ? { evidenceRefs, freshness: "current", contradictionState }
    : null;
}

function healthSection(report: MemoryHealthReport): WelcomeBackSection {
  const summary = healthSummary(report);
  const status: EvidenceSectionStatus = report.overall === "FAIL" ? "unavailable" : report.overall === "WARN" ? "degraded" : "available";
  if (!summary) {
    return section("memory-health", "Memory health", null, null, "Memory Health produced no evidence references; no health claim is presented.");
  }
  return {
    id: "memory-health",
    label: "Memory health",
    status,
    statement: `Memory Health is ${report.overall}; canonical Brain status is ${report.canonicalBrain.status}.`,
    evidenceRefs: summary.evidenceRefs,
    freshness: summary.freshness,
    contradictionState: summary.contradictionState,
    ...(report.overall === "FAIL" ? { unavailableReason: "Canonical memory health is not proven. Review the recovery plan before relying on this briefing." } : {}),
  };
}

function currentSessionResponse(
  status: BriefingStatus,
  lastSessionAt: Date | null,
  currentSessionAt: Date,
  sections: WelcomeBackSection[],
  extras: {
    headline: string;
    evidenceRefs: string[];
    knowledgeGap: unknown;
    routeEvidence: unknown;
    memoryHealth: unknown;
    recoveryMode: string;
    unavailableReason?: string;
  },
) {
  return {
    version: WELCOME_BACK_BRIEFING_VERSION,
    status,
    session: { lastSessionAt: iso(lastSessionAt), currentSessionAt: currentSessionAt.toISOString() },
    headline: extras.headline,
    evidenceRefs: unique(extras.evidenceRefs),
    freshness: "current",
    contradictionState: sections.some((item) => item.contradictionState === "open") ? "open" : "clear",
    sections,
    knowledgeGap: extras.knowledgeGap,
    routeEvidence: extras.routeEvidence,
    memoryHealth: extras.memoryHealth,
    recoveryMode: extras.recoveryMode,
    ...(extras.unavailableReason ? { unavailableReason: extras.unavailableReason } : {}),
  };
}

export async function getWelcomeBackBriefing() {
  const now = new Date();
  const recoveryMode = getRecoveryMode().mode;
  const [cursor] = await db.select().from(changeIntelligenceCursor).where(eq(changeIntelligenceCursor.scopeKey, WELCOME_BACK_CURSOR_KEY)).limit(1);
  const [shutdown] = cursor ? [] : await db.select().from(cleanShutdown).orderBy(desc(cleanShutdown.createdAt)).limit(1);
  const boundary = resolveWelcomeBackBoundary(cursor?.lastOpenedAt, shutdown?.createdAt);
  const lastSession = boundary.lastSessionAt;

  if (boundary.kind === "baseline_required") {
    const baseline = await openChangeCursor(WELCOME_BACK_CURSOR_KEY, now);
    return currentSessionResponse("baseline_required", null, now, [], {
      headline: "A first session boundary is required before LEE can summarize changes.",
      evidenceRefs: [baseline.id],
      knowledgeGap: { status: "unavailable", reason: "A first session boundary has not existed yet.", evidenceRefs: [] },
      routeEvidence: { status: "unavailable", reason: "A first session boundary has not existed yet.", evidenceRefs: [] },
      memoryHealth: { status: "unavailable", reason: "A first session boundary has not existed yet.", evidenceRefs: [] },
      recoveryMode,
      unavailableReason: "No previous owner session boundary is recorded. This visit establishes the baseline; no historical records were treated as new.",
    });
  }
  const sessionStart = lastSession;
  if (!sessionStart) throw new Error("Welcome-back session boundary could not be established.");

  const base = {
    knowledgeGap: { status: "unavailable", reason: "No current open knowledge gap is recorded.", evidenceRefs: [] as string[] },
    routeEvidence: { status: "unavailable", reason: "CIL route evidence is unavailable.", evidenceRefs: [] as string[] },
    memoryHealth: { status: "unavailable", reason: "Memory Health evidence is unavailable.", evidenceRefs: [] as string[] },
  };
  if (["READ_ONLY", "RECOVERY_MODE", "MIGRATION_MODE", "SAFE_MODE"].includes(recoveryMode)) {
    return {
      ...currentSessionResponse("recovery_protected", lastSession, now, [
        ...["objectives", "relationships", "repairs", "consolidation", "cil-route", "memory-health", "backup-restore", "knowledge-gap"].map((id) => section(id, id === "cil-route" ? "CIL route evidence" : id === "backup-restore" ? "Backup and restore" : id.replaceAll("-", " "), null, null, `Recovery mode ${recoveryMode} prevents this dependency from being presented as current evidence.`)),
      ], {
        headline: "The welcome-back briefing is protected while LEE is recovering.",
        evidenceRefs: cursor ? [cursor.id] : [],
        ...base,
        recoveryMode,
        unavailableReason: `Read-only protection is active in ${recoveryMode}; no narrative was generated and the session cursor was not advanced.`,
      }),
      recoveryMode,
    };
  }

  const changes = await db.select().from(changeIntelligence)
    .where(and(gte(changeIntelligence.occurredAt, sessionStart), lte(changeIntelligence.occurredAt, now)))
    .orderBy(desc(changeIntelligence.occurredAt), desc(changeIntelligence.significanceScore))
    .limit(500);
  const backedChanges = changes.filter((change) => change.evidenceRefs.length > 0);
  const objectives = backedChanges.filter((change) => /objective|strategy/i.test(`${change.changeKind} ${change.entityType} ${change.eventType}`));
  const relationships = backedChanges.filter((change) => /person|relationship|commitment|interaction|follow_up/i.test(`${change.changeKind} ${change.entityType} ${change.eventType}`));
  const objectiveRows = await db.select().from(executiveObjective).orderBy(desc(executiveObjective.updatedAt)).limit(50);
  const [repairs, repairEvidence, repairVerifications, governance] = await Promise.all([
    db.select().from(projectRepairRun).where(gte(projectRepairRun.updatedAt, sessionStart)).orderBy(desc(projectRepairRun.updatedAt)).limit(50),
    db.select().from(projectRepairEvidence).where(gte(projectRepairEvidence.capturedAt, sessionStart)).limit(200),
    db.select().from(projectRepairVerification).where(gte(projectRepairVerification.verifiedAt, sessionStart)).limit(200),
    db.select().from(governanceRequest).where(gte(governanceRequest.createdAt, sessionStart)).orderBy(desc(governanceRequest.createdAt)).limit(100),
  ]);
  const [consolidationRuns, consolidationPhases, cilService, routes, gaps, report] = await Promise.all([
    db.select().from(memoryConsolidationRun).where(gte(memoryConsolidationRun.updatedAt, sessionStart)).orderBy(desc(memoryConsolidationRun.updatedAt)).limit(50),
    db.select().from(memoryConsolidationPhase).where(gte(memoryConsolidationPhase.updatedAt, sessionStart)).orderBy(desc(memoryConsolidationPhase.updatedAt)).limit(200),
    db.select().from(internalCapabilityService).where(eq(internalCapabilityService.serviceId, "cil")).limit(1).then(([row]) => row),
    db.select().from(modelRouteDecision).where(and(gte(modelRouteDecision.createdAt, sessionStart), lte(modelRouteDecision.createdAt, now))).orderBy(desc(modelRouteDecision.createdAt)).limit(50),
    db.select().from(knowledgeGap).where(eq(knowledgeGap.status, "open")).orderBy(desc(knowledgeGap.importance), desc(knowledgeGap.updatedAt)).limit(1).then(([row]) => row),
    getMemoryHealth(),
  ]);

  const objectiveRefs = unique([...objectives.flatMap((item) => item.evidenceRefs), ...objectiveRows.filter((row) => objectives.some((item) => item.entityId === row.id)).map((row) => row.id)]);
  const objectiveSummary = changeSummary(objectives);
  const relationshipSummary = changeSummary(relationships);
  const repairRefs = unique([
    ...repairs.map((item) => item.id),
    ...repairs.map((item) => item.governanceRequestId),
    ...repairEvidence.filter((item) => repairs.some((run) => run.id === item.runId)).map((item) => item.id),
    ...repairVerifications.filter((item) => repairs.some((run) => run.id === item.runId)).flatMap((item) => [item.id, ...item.evidenceRefs]),
    ...governance.filter((item) => repairs.some((run) => run.governanceRequestId === item.id)).flatMap((item) => [item.id, ...item.evidenceRefs]),
  ]);
  const repairSummary = repairs.length ? { evidenceRefs: repairRefs, freshness: ageState(latestDate(repairs.map((item) => item.updatedAt))), contradictionState: "unknown" } : null;
  const repairStatement = repairs.length
    ? repairs.slice(0, 3).map((repair) => {
      const gate = governance.find((item) => item.id === repair.governanceRequestId);
      const approval = gate?.status ?? gate?.verdict ?? "approval state unavailable";
      return `Repair for ${repair.projectId} is ${repair.status}; governance state is ${approval}.`;
    }).join(" ")
    : null;
  const consolidationRefs = unique([
    ...consolidationRuns.map((run) => run.id),
    ...consolidationRuns.flatMap((run) => [...run.inputEvidenceRefs, ...run.outputEvidenceRefs]),
    ...consolidationPhases.filter((phase) => consolidationRuns.some((run) => run.id === phase.runId)).flatMap((phase) => [phase.id, ...phase.inputEvidenceRefs, ...phase.outputEvidenceRefs]),
  ]);
  const consolidationSummary = consolidationRuns.length ? { evidenceRefs: consolidationRefs, freshness: ageState(latestDate(consolidationRuns.map((run) => run.updatedAt))), contradictionState: consolidationRuns.some((run) => run.unresolvedConflictCount > 0) ? "open" : "unknown" } : null;
  const routeAvailable = Boolean(cilService && ["healthy", "degraded"].includes(cilService.currentHealth));
  const routeRefs = routes.map((route) => route.id);
  const routeSummary = routeAvailable && routeRefs.length ? { evidenceRefs: routeRefs, freshness: ageState(latestDate(routes.map((route) => route.createdAt))), contradictionState: "unknown" } : null;
  const health = healthSection(report);
  const backupCheck = report.checks.find((check) => check.id === "backup-freshness");
  const restoreCheck = report.checks.find((check) => check.id === "restore-test");
  const backupRefs = unique([...(backupCheck?.evidenceRefs ?? []), ...(restoreCheck?.evidenceRefs ?? [])]);
  const backupSection = backupRefs.length
    ? section("backup-restore", "Backup and restore", { evidenceRefs: backupRefs, freshness: "current", contradictionState: "unknown" }, `Backup integrity is ${backupCheck?.result ?? "unavailable"}; isolated restore proof is ${restoreCheck?.result ?? "unavailable"}.`)
    : section("backup-restore", "Backup and restore", null, null, "No verified backup or isolated restore evidence is available.");
  const gap = gaps
    ? { question: gaps.question, importance: gaps.importance, reason: gaps.reason, status: gaps.status, evidenceRefs: unique([gaps.id, gaps.sourceRef]), freshness: ageState(gaps.updatedAt), contradictionState: "unknown" }
    : { ...base.knowledgeGap, freshness: "unavailable", contradictionState: "unknown" };
  const sections = [
    objectiveSummary ? section("objectives", "Objective changes", { ...objectiveSummary, evidenceRefs: unique([...objectiveSummary.evidenceRefs, ...objectiveRefs]) }, changeStatement(objectives, "")) : noChangeSection("objectives", "Objective changes", "No source-backed objective change was recorded since the last session."),
    relationshipSummary ? section("relationships", "Relationship and commitment updates", relationshipSummary, changeStatement(relationships, "")) : noChangeSection("relationships", "Relationship and commitment updates", "No source-backed relationship or commitment update was recorded since the last session."),
    repairSummary ? section("repairs", "Repair approval state", repairSummary, repairStatement) : noChangeSection("repairs", "Repair approval state", "No repair approval update was recorded since the last session."),
    consolidationSummary ? section("consolidation", "Consolidation outcomes", consolidationSummary, `${consolidationRuns.length} consolidation run(s) changed since the last session; ${consolidationPhases.length} phase record(s) were observed.`) : noChangeSection("consolidation", "Consolidation outcomes", "No consolidation outcome was recorded since the last session."),
    routeSummary ? section("cil-route", "CIL route evidence", routeSummary, `${routes.length} CIL route decision(s) were recorded since the last session; the latest route was ${routes[0].tier} via ${routes[0].provider}/${routes[0].model}.`) : section("cil-route", "CIL route evidence", null, null, !cilService || cilService.currentHealth === "unavailable" ? "CIL is unavailable; no route-backed narrative is presented." : "No CIL route evidence was recorded in this session window."),
    health,
    backupSection,
    gap.status !== "unavailable" ? section("knowledge-gap", "Largest current knowledge gap", { evidenceRefs: gap.evidenceRefs, freshness: gap.freshness, contradictionState: gap.contradictionState }, `Largest open knowledge gap: ${gap.question}.`) : section("knowledge-gap", "Largest current knowledge gap", null, null, gap.reason),
  ];
  const evidenceRefs = unique(sections.flatMap((item) => item.evidenceRefs));
  const cilBlocked = !routeAvailable;
  const status: BriefingStatus = welcomeBackStatus({
    recoveryProtected: false,
    cilAvailable: !cilBlocked,
    evidenceCount: evidenceRefs.length,
    health: report.overall,
  });
  const response = currentSessionResponse(status, lastSession, now, sections, {
    headline: status === "no_changes" ? "No source-backed changes were recorded since your last session." : status === "unavailable" ? "The briefing is unavailable until its evidence dependencies are ready." : "Here is what changed while you were away.",
    evidenceRefs: unique([...evidenceRefs, cursor?.id]),
    knowledgeGap: gap,
    routeEvidence: { status: routeSummary ? status : "unavailable", serviceHealth: cilService?.currentHealth ?? "unavailable", routes: routes.map((route) => ({ id: route.id, tier: route.tier, provider: route.provider, model: route.model, createdAt: iso(route.createdAt) })), evidenceRefs: routeRefs },
    memoryHealth: { status: report.overall, generatedAt: report.generatedAt, canonicalBrain: report.canonicalBrain, evidenceRefs: health.evidenceRefs },
    recoveryMode,
    ...(cilBlocked ? { unavailableReason: !cilService || cilService.currentHealth === "unavailable" ? "CIL is unavailable; no generated narrative is permitted." : undefined } : {}),
  });
  if (shouldAdvanceWelcomeBackCursor(status)) await openChangeCursor(WELCOME_BACK_CURSOR_KEY, now);
  return response;
}