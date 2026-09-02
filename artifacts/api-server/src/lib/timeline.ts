import { and, desc, eq, gte, lte, or, ilike } from "drizzle-orm";
import { db, eventLog, milestoneMarker, timelineEventConfig } from "@workspace/db";
const SIGNIFICANT: Record<string, { type: string; score: number }> = {
  StrategyObjectiveDeclared: { type: "decision_made", score: 0.9 }, GovernanceRequestCreated: { type: "decision_locked", score: 0.95 }, UniversalObjectCreated: { type: "project_created", score: 0.7 }, BriefGenerated: { type: "brief_generated", score: 0.65 }, SourceVaultRecordCreated: { type: "document_imported", score: 0.7 }, FactCreated: { type: "fact_extracted", score: 0.7 }, InterpretationCreated: { type: "interpretation_created", score: 0.65 }, BootstrapCompleted: { type: "project_bootstrapped", score: 0.85 }, AssumptionValidated: { type: "assumption_validated", score: 0.8 }, AssumptionInvalidated: { type: "assumption_invalidated", score: 0.9 }, ImpactEdgeCreated: { type: "decision_impact", score: 0.8 }, BrainVersionCreated: { type: "backup_completed", score: 0.7 }, ConstitutionAmendmentProposed: { type: "constitution_amended", score: 0.9 }, ConnectorSyncCompleted: { type: "connector_sync_notable", score: 0.55 }, CuriosityScanCompleted: { type: "opportunity_captured", score: 0.55 },
};
async function ensureConfigs() {
  for (const [eventType, rule] of Object.entries(SIGNIFICANT)) await db.insert(timelineEventConfig).values({ eventType, timelineType: rule.type, significance: rule.score }).onConflictDoNothing({ target: timelineEventConfig.eventType });
}
export async function queryTimeline(input: { start?: Date; end?: Date; min?: number; search?: string; type?: string }) {
  await ensureConfigs();
  const configs = await db.select().from(timelineEventConfig).where(eq(timelineEventConfig.visible, true));
  const configMap = new Map(configs.map((item) => [item.eventType, item]));
  const conditions = [input.start ? gte(eventLog.occurredAt, input.start) : undefined, input.end ? lte(eventLog.occurredAt, input.end) : undefined, input.search ? or(ilike(eventLog.eventType, `%${input.search}%`), ilike(eventLog.sourceRef, `%${input.search}%`)) : undefined].filter(Boolean);
  const events = await db.select().from(eventLog).where(conditions.length ? and(...conditions as any) : undefined).orderBy(desc(eventLog.occurredAt)).limit(1000);
  const milestones = await db.select().from(milestoneMarker);
  return events.map((event) => { const config = configMap.get(event.eventType) ?? { timelineType: event.eventType.toLowerCase(), significance: 0.25 }; return { ...event, timelineType: config.timelineType, significance: config.significance, milestone: milestones.find((item) => item.eventId === event.id) ?? null }; }).filter((event) => event.significance >= (input.min ?? 0) && (!input.type || event.timelineType === input.type));
}