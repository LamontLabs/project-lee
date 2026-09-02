import { and, desc, eq, isNull } from "drizzle-orm";
import { db, eventLog, governanceRequest, policyConsultation, policyRecord } from "@workspace/db";
export const POLICY_DEFAULTS: Record<string, { description: string; values: Record<string, unknown> }> = {
  cost: { description: "Controls model spend, tier selection, reuse, and embedding ceilings.", values: { dailySpendLimitUsd: 5, weeklySpendLimitUsd: 25, monthlySpendLimitUsd: 75, strongModelApprovalThresholdUsd: 0.05, cheapModelFirst: true, cilReuseAggressiveness: "balanced", embeddingCostCeilingUsd: 0.01 } },
  privacy: { description: "Controls what private records may enter context or audience-specific explanations.", values: { contextObjectTypes: ["project", "decision", "fact", "interpretation", "waiting"], explanationAudienceAllowlist: { Legal: ["fact", "interpretation", "decision"], Investor: ["project", "decision", "fact"], General: ["project", "fact"] }, retainConversationHistory: true, confidentialSourceTypes: ["private_note", "credential"] } },
  retention: { description: "Defines how long operational records remain available.", values: { sourceFilesDays: null, conversationTurnsDays: 730, costRecordsDays: null, healthSnapshotsDays: 90, semanticIndexBehavior: "rebuild-on-restore" } },
  notification: { description: "Controls alert volume, quiet hours, and digest behavior.", values: { maxPerDay: { info: 10, warning: 8, critical: null }, quietHours: { start: "22:00", end: "07:00" }, digestWindow: "09:00", pushCategories: ["critical", "warning"] } },
  relationship: { description: "Controls follow-up sensitivity and relationship escalation defaults.", values: { highStakesCategories: ["investor", "partner", "legal"], followUpWindowDays: { default: 7, highStakes: 3 }, waitingLoopEscalationDays: 14 } },
  backup: { description: "Controls Brain backup cadence, retention, encryption, and verification.", values: { schedule: "daily 02:00", dailyRetention: 7, weeklyRetention: 4, monthlyRetention: 12, encryptionRequired: true, verificationCadence: "every backup", restoreTestCadence: "monthly" } },
  connector: { description: "Controls connector cadence, error tolerance, and freshness.", values: { syncFrequencyMinutes: 30, errorTolerance: 3, freshnessRequirementHours: 24 } },
  resource: { description: "Controls thresholds used to classify compute, disk, token, cost, network, quota, and battery pressure.", values: { cpuConstrainedPercent: 75, cpuCriticalPercent: 90, memoryConstrainedPercent: 80, memoryCriticalPercent: 92, diskConstrainedPercent: 80, diskCriticalPercent: 92, tokenConstrainedPercent: 75, tokenCriticalPercent: 90, batteryConstrainedPercent: 25, batteryCriticalPercent: 10 } },
  context_economy: {
    description: "Controls Context Value factor weights by intent type.",
    values: {
      defaults: { goal: 1, recency: 0.7, importance: 0.8, relationship: 0.6, project: 0.5, confidence: 0.9, trust: 0.7, mode: 0.5 },
      question_factual: { goal: 1, recency: 0.6, importance: 0.7, relationship: 0.4, project: 0.4, confidence: 1, trust: 0.8, mode: 0.4 },
      question_exploratory: { goal: 1, recency: 0.5, importance: 0.6, relationship: 0.7, project: 0.6, confidence: 0.8, trust: 0.7, mode: 0.7 },
      explanation_seeking: { goal: 1, recency: 0.5, importance: 0.8, relationship: 0.7, project: 0.5, confidence: 1, trust: 0.8, mode: 0.6 },
    },
  },
};
export async function ensurePolicies() {
  for (const [policyType, definition] of Object.entries(POLICY_DEFAULTS)) {
    const [active] = await db.select().from(policyRecord).where(and(eq(policyRecord.policyType, policyType), isNull(policyRecord.supersededAt))).orderBy(desc(policyRecord.version)).limit(1);
    if (!active) await db.insert(policyRecord).values({ policyType, version: 1, values: definition.values, description: definition.description, changeReason: "Seeded built-in default", createdBy: "system" });
  }
}
export async function checkPolicy(policyType: string, action: string, context: Record<string, unknown> = {}, requester = "unknown") {
  await ensurePolicies(); const definition = POLICY_DEFAULTS[policyType]; if (!definition) throw new Error(`Unknown policy type: ${policyType}`);
  const [policy] = await db.select().from(policyRecord).where(and(eq(policyRecord.policyType, policyType), isNull(policyRecord.supersededAt))).orderBy(desc(policyRecord.version)).limit(1); const values = policy.values; const constraints: string[] = []; let permitted = true;
  if (policyType === "cost" && action === "model_call" && Number(context.estimatedCostUsd ?? 0) > Number(values.strongModelApprovalThresholdUsd ?? 0.05)) { permitted = false; constraints.push(`Model calls above $${values.strongModelApprovalThresholdUsd} require governance approval.`); }
  if (policyType === "privacy" && action === "context_include" && Array.isArray(values.contextObjectTypes) && !values.contextObjectTypes.includes(context.objectType)) { permitted = false; constraints.push(`Object type ${context.objectType} is excluded from context.`); }
  if (policyType === "privacy" && action === "context_include" && Array.isArray(values.confidentialSourceTypes) && values.confidentialSourceTypes.includes(context.sourceType)) { permitted = false; constraints.push(`Source type ${context.sourceType} is excluded from context.`); }
  if (policyType === "notification" && action === "notify" && context.level === "info" && Number(context.todayCount ?? 0) >= Number((values.maxPerDay as any)?.info ?? 10)) { permitted = false; constraints.push("Daily informational notification limit reached."); }
  await db.insert(policyConsultation).values({ policyType, policyVersion: policy.version, action, context, permitted, value: values, constraints, requester });
  await db.insert(eventLog).values({ eventType: permitted ? "PolicyConsulted" : "PolicyViolation", aggregateType: "policy", aggregateId: policy.id, sourceRef: "policy-engine", occurredAt: new Date(), payload: { policyType, policyVersion: policy.version, action, permitted, requester, constraints } });
  if (!permitted) await db.insert(governanceRequest).values({ leeRequestId: crypto.randomUUID(), actionClass: "policy_override", targetSystem: policyType, status: "HOLD", riskLevel: "MEDIUM", reason: constraints.join(" "), requestPayload: { policyType, action, context, requester }, evidenceRefs: [policy.id], actor: requester });
  return { permitted, value: values, constraints, appliedPolicyVersion: policy.version, policyType };
}
export async function createPolicyVersion(policyType: string, values: Record<string, unknown>, changeReason: string, createdBy = "founder") {
  await ensurePolicies(); const definition = POLICY_DEFAULTS[policyType]; if (!definition) throw new Error(`Unknown policy type: ${policyType}`); const [current] = await db.select().from(policyRecord).where(and(eq(policyRecord.policyType, policyType), isNull(policyRecord.supersededAt))).orderBy(desc(policyRecord.version)).limit(1); if (current) await db.update(policyRecord).set({ supersededAt: new Date() }).where(eq(policyRecord.id, current.id)); const [created] = await db.insert(policyRecord).values({ policyType, version: (current?.version ?? 0) + 1, values, description: definition.description, changeReason, createdBy }).returning(); await db.insert(eventLog).values({ eventType: "PolicyVersionCreated", aggregateType: "policy", aggregateId: created.id, sourceRef: "policy-engine", occurredAt: new Date(), payload: { policyType, version: created.version, createdBy, changeReason } }); return created;
}