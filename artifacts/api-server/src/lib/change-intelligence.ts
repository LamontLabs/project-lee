import { createHash } from "node:crypto";
import { and, asc, desc, eq, gt, gte, lte, or } from "drizzle-orm";
import { changeIntelligence, changeIntelligenceCursor, changeIntelligenceProjection, db, eventLog, normalizedConnectorEvent } from "@workspace/db";

export const CHANGE_CLASSIFICATIONS = ["ROUTINE", "NOTABLE", "IMPORTANT", "CRITICAL"] as const;
export type ChangeClassification = typeof CHANGE_CLASSIFICATIONS[number];

const CLASS_SCORE: Record<ChangeClassification, number> = {
  ROUTINE: 0.25,
  NOTABLE: 0.5,
  IMPORTANT: 0.75,
  CRITICAL: 0.95,
};

const CLASS_RANK: Record<string, ChangeClassification> = {
  ROUTINE: "ROUTINE",
  LOW: "ROUTINE",
  NOTABLE: "NOTABLE",
  MEDIUM: "NOTABLE",
  IMPORTANT: "IMPORTANT",
  HIGH: "IMPORTANT",
  CRITICAL: "CRITICAL",
};

const SUPPRESSED_EVENT_TYPES = new Set([
  "ConnectorSynced", "ConnectorSyncCompleted", "EmailSyncCompleted", "EmailSyncFailed",
  "CILQueryRequested", "CILQueryResolved", "CILReuseHit", "CILFrontierEscalated",
  "RequestPipelineStageStarted", "RequestPipelineStageCompleted", "RequestPipelineFailed",
  "QueryExecuted", "HealthChecked", "Heartbeat", "ManifestGenerated", "OperationalContextUpdated",
]);

const EVENT_RULES: Record<string, { classification: ChangeClassification; kind: string; source: string }> = {
  GovernanceItemApproved: { classification: "CRITICAL", kind: "governance_decision", source: "governance" },
  GovernanceItemRejected: { classification: "CRITICAL", kind: "governance_decision", source: "governance" },
  GovernanceHoldCreated: { classification: "IMPORTANT", kind: "governance_hold", source: "governance" },
  GovernedActionHeld: { classification: "IMPORTANT", kind: "governance_hold", source: "governance" },
  GovernedActionRejected: { classification: "IMPORTANT", kind: "governance_decision", source: "governance" },
  GovernedActionAllowed: { classification: "CRITICAL", kind: "governance_decision", source: "governance" },
  StrategyObjectiveDeclared: { classification: "IMPORTANT", kind: "objective_changed", source: "lee" },
  StrategyInvalidated: { classification: "IMPORTANT", kind: "strategy_changed", source: "lee" },
  AssumptionInvalidated: { classification: "IMPORTANT", kind: "assumption_changed", source: "lee" },
  AssumptionValidated: { classification: "NOTABLE", kind: "assumption_changed", source: "lee" },
  StateChanged: { classification: "NOTABLE", kind: "operational_state_changed", source: "lee" },
  StateInitialized: { classification: "NOTABLE", kind: "operational_state_changed", source: "lee" },
  UniversalObjectCreated: { classification: "NOTABLE", kind: "entity_created", source: "project" },
  UniversalObjectUpdated: { classification: "NOTABLE", kind: "entity_updated", source: "project" },
  SourceVaultRecordCreated: { classification: "NOTABLE", kind: "evidence_added", source: "evidence" },
  FactCreated: { classification: "NOTABLE", kind: "fact_added", source: "evidence" },
  FactAccepted: { classification: "IMPORTANT", kind: "fact_validated", source: "evidence" },
  InterpretationCreated: { classification: "NOTABLE", kind: "interpretation_added", source: "lee" },
  KnowledgeInvalidated: { classification: "IMPORTANT", kind: "knowledge_invalidated", source: "lee" },
  KnowledgeStale: { classification: "IMPORTANT", kind: "knowledge_stale", source: "lee" },
  PersonCreated: { classification: "NOTABLE", kind: "person_changed", source: "people" },
  PersonUpdated: { classification: "NOTABLE", kind: "person_changed", source: "people" },
  InteractionRecorded: { classification: "ROUTINE", kind: "relationship_activity", source: "people" },
  FollowUpSet: { classification: "NOTABLE", kind: "relationship_follow_up", source: "people" },
  RelationshipTierChanged: { classification: "IMPORTANT", kind: "relationship_changed", source: "people" },
  EmailReceived: { classification: "NOTABLE", kind: "email_received", source: "gmail" },
  EmailSentDetected: { classification: "NOTABLE", kind: "email_sent", source: "gmail" },
  DocumentCreated: { classification: "NOTABLE", kind: "document_created", source: "drive" },
  DocumentUpdated: { classification: "NOTABLE", kind: "document_updated", source: "drive" },
  DocumentShared: { classification: "IMPORTANT", kind: "document_shared", source: "drive" },
  CommitPushed: { classification: "ROUTINE", kind: "commit_pushed", source: "github" },
  PRMerged: { classification: "IMPORTANT", kind: "pull_request_merged", source: "github" },
  IssueOpened: { classification: "NOTABLE", kind: "issue_opened", source: "github" },
  IssueResolved: { classification: "IMPORTANT", kind: "issue_resolved", source: "github" },
  PROpened: { classification: "NOTABLE", kind: "pull_request_opened", source: "github" },
  BuildFailed: { classification: "CRITICAL", kind: "build_failed", source: "github" },
  RepoInactive: { classification: "IMPORTANT", kind: "repository_inactive", source: "github" },
  CalendarEventCreated: { classification: "NOTABLE", kind: "calendar_event_created", source: "calendar" },
  CalendarEventUpdated: { classification: "NOTABLE", kind: "calendar_event_updated", source: "calendar" },
  CalendarEventCancelled: { classification: "IMPORTANT", kind: "calendar_event_cancelled", source: "calendar" },
  MeetingWithPersonDetected: { classification: "NOTABLE", kind: "meeting_detected", source: "calendar" },
  FileCreated: { classification: "ROUTINE", kind: "file_created", source: "drive" },
  FileUpdated: { classification: "ROUTINE", kind: "file_updated", source: "drive" },
  FileDeleted: { classification: "IMPORTANT", kind: "file_deleted", source: "drive" },
  WaitingLoopResolved: { classification: "IMPORTANT", kind: "waiting_loop_resolved", source: "project" },
  ProjectMomentumChanged: { classification: "IMPORTANT", kind: "project_momentum_changed", source: "project" },
  OperationalCapacityChanged: { classification: "IMPORTANT", kind: "capacity_changed", source: "lee" },
  OpportunityDetected: { classification: "NOTABLE", kind: "opportunity_detected", source: "lee" },
  BackupCompleted: { classification: "NOTABLE", kind: "backup_completed", source: "lee" },
  BackupFailed: { classification: "CRITICAL", kind: "backup_failed", source: "lee" },
  ConnectorFailed: { classification: "IMPORTANT", kind: "connector_failed", source: "connector" },
  ConnectorResumed: { classification: "NOTABLE", kind: "connector_resumed", source: "connector" },
  GovernanceEvidenceReceived: { classification: "NOTABLE", kind: "governance_evidence_received", source: "governance" },
  RecoveryFailed: { classification: "CRITICAL", kind: "recovery_failed", source: "lee" },
  RecoverySucceeded: { classification: "IMPORTANT", kind: "recovery_succeeded", source: "lee" },
  BrainVersionChanged: { classification: "IMPORTANT", kind: "brain_changed", source: "lee" },
  ExplanationGenerated: { classification: "ROUTINE", kind: "explanation_generated", source: "lee" },
  "record.created": { classification: "NOTABLE", kind: "provider_record_created", source: "connector" },
  "record.updated": { classification: "ROUTINE", kind: "provider_record_updated", source: "connector" },
  "record.deleted": { classification: "IMPORTANT", kind: "provider_record_deleted", source: "connector" },
  "message.received": { classification: "NOTABLE", kind: "email_received", source: "gmail" },
  "message.sent": { classification: "NOTABLE", kind: "email_sent", source: "gmail" },
  "calendar.event.accepted": { classification: "NOTABLE", kind: "calendar_event_updated", source: "calendar" },
  "calendar.event.declined": { classification: "IMPORTANT", kind: "calendar_event_cancelled", source: "calendar" },
  repo_updated: { classification: "ROUTINE", kind: "repository_updated", source: "github" },
  commit_pushed: { classification: "ROUTINE", kind: "commit_pushed", source: "github" },
  build_failed: { classification: "CRITICAL", kind: "build_failed", source: "github" },
  issue_opened: { classification: "NOTABLE", kind: "issue_opened", source: "github" },
  issue_resolved: { classification: "IMPORTANT", kind: "issue_resolved", source: "github" },
  pr_merged: { classification: "IMPORTANT", kind: "pull_request_merged", source: "github" },
  document_changed: { classification: "NOTABLE", kind: "document_updated", source: "drive" },
  meeting_detected: { classification: "NOTABLE", kind: "meeting_detected", source: "calendar" },
};

const stringValue = (value: unknown) => typeof value === "string" && value.length > 0 ? value : undefined;
const numberValue = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : undefined;
const objectValue = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value : undefined;

function payloadValue(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) if (payload[key] !== undefined) return payload[key];
  return undefined;
}

function sourceFor(event: typeof eventLog.$inferSelect, rule?: typeof EVENT_RULES[string]) {
  const prefix = event.sourceRef?.split(":")[0];
  if (prefix && ["github", "replit", "gmail", "proton", "google-drive", "google-calendar"].includes(prefix)) {
    return prefix === "google-drive" ? "drive" : prefix === "google-calendar" ? "calendar" : prefix;
  }
  if (rule?.source) return rule.source;
  return prefix || event.aggregateType.split("_")[0] || "lee";
}

function entityFor(event: typeof eventLog.$inferSelect, payload: Record<string, unknown>) {
  const entityType = stringValue(payloadValue(payload, ["entityType", "objectType", "object_type", "targetType"]))
    ?? event.aggregateType.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).replace(/^_/, "");
  const entityId = stringValue(payloadValue(payload, ["entityId", "objectId", "object_id", "projectId", "personId", "sourceId"])) ?? event.aggregateId;
  return { entityType: entityType.toLowerCase().replace(/\s+/g, "_"), entityId };
}

function stateFor(payload: Record<string, unknown>, keys: string[]) {
  return payloadValue(payload, keys);
}

export function classifyChange(event: Pick<typeof eventLog.$inferSelect, "eventType" | "sourceRef" | "payload">) {
  const payload = event.payload ?? {};
  const rule = EVENT_RULES[event.eventType];
  const explicit = stringValue(payloadValue(payload, ["classification", "significance", "riskLevel", "importance"]))?.toUpperCase();
  const classification = explicit ? (CLASS_RANK[explicit] ?? rule?.classification ?? "ROUTINE") : (rule?.classification ?? "ROUTINE");
  const score = Math.max(CLASS_SCORE[classification], numberValue(payload.significanceScore) ?? 0);
  return {
    classification,
    significanceScore: Math.min(1, score),
    kind: rule?.kind ?? event.eventType.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase(),
    source: sourceFor(event as typeof eventLog.$inferSelect, rule),
  };
}

function evidenceFor(event: typeof eventLog.$inferSelect, payload: Record<string, unknown>) {
  const refs = [
    event.sourceRef,
    ...(Array.isArray(payload.evidenceRefs) ? payload.evidenceRefs : []),
    ...(Array.isArray(payload.sourceRefs) ? payload.sourceRefs : []),
    ...(Array.isArray(payload.sourceEvidence) ? payload.sourceEvidence : []),
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
  return [...new Set([...refs, `event:${event.id}`])];
}

export function buildChangeRecord(event: typeof eventLog.$inferSelect) {
  if (SUPPRESSED_EVENT_TYPES.has(event.eventType)) return null;
  const payload = event.payload ?? {};
  if (payload.meaningful === false || payload.ownerVisible === false) return null;
  if (!EVENT_RULES[event.eventType] && payload.meaningful !== true) return null;
  const normalizedProviderEvent = event.aggregateType === "normalized_connector_event";
  if ((event.eventType === "EmailReceived" || event.eventType === "message.received") && !payload.initiativeId && !payload.actionable && !payload.reason) return null;
  if (normalizedProviderEvent && event.sourceRef?.startsWith("gmail:") && !payload.initiativeId && !payload.actionable && !payload.meaningful) return null;
  const entity = entityFor(event, payload);
  const classification = classifyChange(event);
  const previousState = stateFor(payload, ["previousState", "previous", "from", "previousClassification", "oldValue", "before"]);
  const currentState = stateFor(payload, ["currentState", "current", "to", "classification", "newValue", "after"]);
  const evidenceRefs = evidenceFor(event, payload);
  const confidence = Math.min(1, numberValue(payload.confidence) ?? (evidenceRefs.length > 1 ? 0.9 : 0.75));
  const ageDays = Math.max(0, (Date.now() - new Date(event.occurredAt).getTime()) / 86400000);
  const freshness = 1 / (1 + ageDays / 30);
  const stateExplanation = previousState !== undefined && currentState !== undefined
    ? `Changed from ${JSON.stringify(previousState)} to ${JSON.stringify(currentState)}.`
    : `Recorded ${classification.kind.replaceAll("_", " ")} activity.`;
  const explanation = `${stateExplanation} Evidence: ${evidenceRefs.slice(0, 4).join(", ")}${evidenceRefs.length > 4 ? "…" : ""}.`;
  const fingerprint = createHash("sha256").update(`${event.id}:${entity.entityType}:${entity.entityId}:${classification.kind}`).digest("hex");
  return {
    fingerprint,
    eventId: event.id,
    eventType: event.eventType,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    entityType: entity.entityType ?? event.aggregateType,
    entityId: entity.entityId,
    source: classification.source,
    sourceRef: event.sourceRef,
    previousState: objectValue(previousState) ?? previousState ?? null,
    currentState: objectValue(currentState) ?? currentState ?? payload,
    changeKind: classification.kind,
    classification: classification.classification,
    significanceScore: classification.significanceScore,
    confidence,
    freshness,
    causalEventId: event.causationId,
    correlationId: event.correlationId,
    evidenceRefs,
    explanation,
    metadata: { eventVersion: event.eventVersion, actor: event.actor, aggregateType: event.aggregateType },
    occurredAt: event.occurredAt,
  };
}

export async function recordChangeFromEvent(event: typeof eventLog.$inferSelect) {
  const record = buildChangeRecord(event);
  if (!record) return null;
  const [created] = await db.insert(changeIntelligence).values(record).onConflictDoNothing({ target: changeIntelligence.fingerprint }).returning();
  return created ?? null;
}

export async function recordNormalizedProviderChange(input: typeof normalizedConnectorEvent.$inferSelect) {
  const payload = input.payload ?? {};
  const normalizedFrom = stringValue(payload.normalizedFrom);
  const eventType = normalizedFrom && EVENT_RULES[normalizedFrom] ? normalizedFrom : input.eventType;
  const syntheticEvent = {
    id: input.id,
    eventType,
    eventVersion: "1.0.0",
    aggregateType: "normalized_connector_event",
    aggregateId: input.id,
    payload: { ...payload, provider: input.provider },
    actor: "connector",
    sourceRef: input.sourceRef,
    sequenceNumber: 1,
    causationId: null,
    correlationId: null,
    sessionId: null,
    brainVersion: null,
    occurredAt: input.occurredAt,
    createdAt: input.createdAt,
  } as typeof eventLog.$inferSelect;
  const record = buildChangeRecord(syntheticEvent);
  if (!record) return null;
  const stableFingerprint = createHash("sha256").update(`${input.provider}:${input.externalId}:${eventType}`).digest("hex");
  const [created] = await db.insert(changeIntelligence).values({ ...record, fingerprint: stableFingerprint }).onConflictDoNothing({ target: changeIntelligence.fingerprint }).returning();
  return created ?? null;
}

async function checkpoint() {
  const [item] = await db.select().from(changeIntelligenceProjection).where(eq(changeIntelligenceProjection.id, "main")).limit(1);
  return item;
}

export async function projectPendingChanges() {
  const current = await checkpoint();
  const cursor = current?.lastCreatedAt && current.lastEventId
    ? or(gt(eventLog.createdAt, current.lastCreatedAt), and(eq(eventLog.createdAt, current.lastCreatedAt), gt(eventLog.id, current.lastEventId)))
    : undefined;
  const events = await db.select().from(eventLog).where(cursor).orderBy(asc(eventLog.createdAt), asc(eventLog.id)).limit(5000);
  let created = 0;
  for (const event of events) if (await recordChangeFromEvent(event)) created += 1;
  const last = events.at(-1);
  if (last) {
    await db.insert(changeIntelligenceProjection).values({ id: "main", lastCreatedAt: last.createdAt, lastEventId: last.id, processedCount: created }).onConflictDoUpdate({
      target: changeIntelligenceProjection.id,
      set: { lastCreatedAt: last.createdAt, lastEventId: last.id, processedCount: (current?.processedCount ?? 0) + created, updatedAt: new Date() },
    });
  }
  return { scanned: events.length, created, lastEventId: last?.id ?? current?.lastEventId ?? null };
}

export async function openChangeCursor(scopeKey: string, at = new Date()) {
  const [latest] = await db.select({ id: changeIntelligence.id }).from(changeIntelligence).where(lte(changeIntelligence.occurredAt, at)).orderBy(desc(changeIntelligence.occurredAt)).limit(1);
  const [cursor] = await db.insert(changeIntelligenceCursor).values({ scopeKey, lastOpenedAt: at, lastChangeId: latest?.id ?? null }).onConflictDoUpdate({
    target: changeIntelligenceCursor.scopeKey,
    set: { lastOpenedAt: at, lastChangeId: latest?.id ?? null, updatedAt: new Date() },
  }).returning();
  return cursor;
}

export type ChangeQuery = {
  start?: Date;
  end?: Date;
  min?: number;
  search?: string;
  type?: string;
  scopeType?: string;
  scopeId?: string;
  scopeKey?: string;
  sinceLastOpen?: boolean;
  markOpened?: boolean;
  limit?: number;
};

export async function queryMeaningfulChanges(input: ChangeQuery = {}) {
  await projectPendingChanges();
  const cursor = input.sinceLastOpen ? await db.select().from(changeIntelligenceCursor).where(eq(changeIntelligenceCursor.scopeKey, input.scopeKey ?? "timeline")).limit(1).then(([item]) => item) : undefined;
  const conditions = [
    input.start ? gte(changeIntelligence.occurredAt, input.start) : cursor ? gte(changeIntelligence.occurredAt, cursor.lastOpenedAt) : undefined,
    input.end ? lte(changeIntelligence.occurredAt, input.end) : undefined,
    input.min !== undefined ? gte(changeIntelligence.significanceScore, input.min) : undefined,
    input.scopeType ? eq(changeIntelligence.entityType, input.scopeType) : undefined,
    input.scopeId ? eq(changeIntelligence.entityId, input.scopeId) : undefined,
  ].filter(Boolean) as any[];
  let rows = await db.select().from(changeIntelligence).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(changeIntelligence.occurredAt), desc(changeIntelligence.significanceScore)).limit(Math.min(input.limit ?? 1000, 2000));
  if (input.search) {
    const term = input.search.toLowerCase();
    rows = rows.filter((row) => `${row.eventType} ${row.source} ${row.entityType} ${row.entityId} ${row.explanation}`.toLowerCase().includes(term));
  }
  if (input.type) rows = rows.filter((row) => row.changeKind === input.type);
  const changes = rows.map((row) => ({
    ...row,
    significance: row.significanceScore,
    timelineType: row.changeKind,
    payload: { previousState: row.previousState, currentState: row.currentState, metadata: row.metadata },
    whyChain: [{ step: "classification", summary: `${row.classification} because ${row.explanation}`, evidenceRefs: row.evidenceRefs }],
  }));
  if (input.markOpened) await openChangeCursor(input.scopeKey ?? "timeline");
  return { changes, cursor: cursor ?? null, markedOpened: Boolean(input.markOpened) };
}