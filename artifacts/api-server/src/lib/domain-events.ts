import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, eventLog } from "@workspace/db";

const EVENT_TYPES = [
  "KnowledgeCreated","KnowledgeUpdated","KnowledgeInvalidated","FactAccepted","FactInvalidated","FactCreated","InterpretationCreated","InterpretationRevised",
  "PersonCreated","PersonUpdated","InteractionRecorded","FollowUpSet","RelationshipTierChanged",
  "ObjectiveCreated","ObjectiveUpdated","RecommendationGenerated","StrategyInvalidated","PrioritizationUpdated",
  "GovernanceItemCreated","GovernanceItemApproved","GovernanceItemRejected","GovernanceHoldCreated",
  "BriefGenerated","BriefRegenerated","ConnectorSynced","ConnectorFailed","ConnectorResumed",
  "ObjectPromoted","ObjectDemoted","ObjectArchived","ObjectCompressed","ConfidenceChanged","ConfidencePropagated",
  "AssumptionRecorded","AssumptionInvalidated","ConstitutionAmended","ConstitutionCheckFailed","PolicyChanged","PolicyViolationDetected",
  "BrainVersionChanged","BackupCompleted","BackupFailed","ModeChanged","StateChanged","EngineRegistered","EngineUnavailable","EnginePaused","EngineResumed","EngineShutdown","SelfTestCompleted","RecoveryAttempted","RecoverySucceeded","RecoveryFailed","BootStarted","BootCompleted","CleanShutdownRecorded","SafeModeActivated","RecoveryCompleted","OwnerVerified","KnowledgeAged","KnowledgeStale","ManifestGenerated","WorldStateUpdated","OperationalPatternEstablished","OperationalPatternBroken","InitiativeItemCreated","OperationalContextUpdated",
    "EmailReceived","ThreadUpdated","WaitingLoopResolved","EmailSentDetected","DocumentCreated","DocumentUpdated","DocumentShared","CommitPushed","IssueOpened","IssueResolved","PROpened","PRMerged","BuildFailed","RepoInactive","CalendarEventCreated","CalendarEventUpdated","CalendarEventCancelled","TravelDetected","MeetingWithPersonDetected","FileCreated","FileUpdated","FileDeleted","BootstrapCompleted","CILQueryRequested","CILQueryResolved","CILReuseHit","CILFrontierEscalated","CILDriftDetected","CILContradictionDetected","CILUnavailable","CILModelInventoryRequested","CILModelInventoryResolved","CILModelInventoryUnavailable","GovernedActionSubmitted","GovernedActionAllowed","GovernedActionHeld","GovernedActionRejected","GovernanceEvidenceReceived","GovernanceServiceUnavailable","ExecutionReleased","ExecutionCancelled","ExecutiveLoopPhaseChanged","ExecutiveLoopInterrupted","ExecutiveLoopResumed","OperationalConfidenceUpdated","StateInitialized","StateTransitionRejected",
    "IntentClassified","IntentCorrected","ExplanationGenerated","ExplanationInvalidated","ProjectMomentumChanged","OpportunityDetected","OpportunityResolved","OperationalCapacityChanged","AnchorCreated","AnchorRetired","AnchorContradictionDetected","PortfolioStateUpdated","PortfolioRiskDetected","PortfolioOpportunityDetected","SimulationCreated","SimulationScenarioMatched","TimeMachineSnapshotGenerated","UncertaintyLevelChanged","ResourceAllocationUpdated","ExecutionReadinessUpdated","PortfolioDependencyGraphUpdated","ExecutiveLoopReviewRecorded",
    "UniversalObjectCreated","UniversalObjectUpdated","SourceVaultRecordCreated","ImpactNodeCreated","ImpactEdgeCreated","ConstitutionProvisionCreated","OperationalAdaptationApplied","OperationalAdaptationRejected",
    "ConnectionCreated","ConnectionAuthenticationSucceeded","ConnectionAuthenticationFailed","ConnectionPermissionsChanged","ConnectionCapabilitiesChanged","ConnectionHealthChanged","ConnectionReauthorizationRequired","ConnectionReauthorizationCompleted","ConnectionDisconnected","ConnectionContractChanged",
     "RequestPipelineStageStarted","RequestPipelineStageCompleted","RequestPipelineFailed","EventDeliveryTested","LegacyProvenanceMigrated","GmailWatchRenewed","GmailWatchRenewalFailed","GmailHistoryGapRecovered","EmailSyncCompleted","EmailSyncFailed",
] as const;
export type DomainEventType = typeof EVENT_TYPES[number];
export const DOMAIN_EVENT_CATALOG = Object.fromEntries(EVENT_TYPES.map((eventType) => [eventType, {
  eventType, eventVersion: "1.0.0", payload: z.object({}).passthrough(),
}])) as unknown as Record<DomainEventType, { eventType: DomainEventType; eventVersion: string; payload: z.ZodTypeAny }>;
export const domainEventType = z.enum(EVENT_TYPES.filter((value, index, values) => values.indexOf(value) === index) as [string, ...string[]]);
export const domainEventSchema = z.object({
  eventId: z.string().uuid().optional(), eventType: domainEventType, eventVersion: z.string(),
  occurredAt: z.coerce.date(), causedBy: z.string().uuid().nullable().optional(), sourceEngine: z.string(),
  payload: z.record(z.unknown()), sessionId: z.string().uuid().nullable().optional(), brainVersion: z.string().nullable().optional(),
});
export type DomainEventInput = { eventType: string; aggregateId: string; aggregateType: string; payload: Record<string, unknown>; actor?: string; sourceRef?: string; causationId?: string; correlationId?: string; sessionId?: string; brainVersion?: string };
const subscriptions = new Map<string, Map<string, (event: typeof eventLog.$inferSelect) => void | Promise<void>>>();
export function validateDomainPayload(eventType: string, payload: Record<string, unknown>) {
  const catalog = DOMAIN_EVENT_CATALOG[eventType as DomainEventType]; if (!catalog) throw new Error(`Unknown domain event type: ${eventType}`);
  const parsed = catalog.payload.safeParse(payload); if (!parsed.success) throw new Error(`Invalid ${eventType} payload: ${parsed.error.message}`); return catalog;
}
export function subscribe(eventType: DomainEventType, handler: (event: typeof eventLog.$inferSelect) => void | Promise<void>) { const id = crypto.randomUUID(); const handlers = subscriptions.get(eventType) ?? new Map(); handlers.set(id, handler); subscriptions.set(eventType, handlers); return id; }
export function unsubscribe(eventType: DomainEventType, handlerId: string) { subscriptions.get(eventType)?.delete(handlerId); }
export async function notifySubscribers(event: typeof eventLog.$inferSelect) { for (const handler of subscriptions.get(event.eventType as DomainEventType)?.values() ?? []) await handler(event); }
export async function causalChain(eventId: string) {
  const chain: (typeof eventLog.$inferSelect)[] = []; let currentId: string | null = eventId;
  while (currentId) { const [event] = await db.select().from(eventLog).where(eq(eventLog.id, currentId)).limit(1); if (!event) break; chain.unshift(event); currentId = event.causationId; }
  return chain;
}