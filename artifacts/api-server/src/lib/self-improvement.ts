import { randomUUID } from "node:crypto";
import { and, desc, eq, gte } from "drizzle-orm";
import {
  db,
  eventLog,
  operationalAdaptation,
  operationalMetric,
} from "@workspace/db";

const MIN_OBSERVATIONS = 5;
const WINDOW_DAYS = 90;
export const PROTECTED_ADAPTATION_TARGETS = [
  "identity",
  "constitution",
  "facts",
  "knowledge",
  "strategic_anchors",
  "cerbaseal_governance",
  "owner_permissions",
  "credentials",
] as const;

type Signal = {
  category: string;
  observationType: string;
  value: number;
  context?: Record<string, unknown>;
};

function signalsForEvent(event: typeof eventLog.$inferSelect): Signal[] {
  const type = event.eventType.toLowerCase();
  const payload = event.payload ?? {};
  if (type.includes("recommendation") && /(accepted|rejected|dismissed|completed)/.test(type)) {
    return [{ category: "recommendations", observationType: type.includes("accepted") || type.includes("completed") ? "accepted" : "dismissed", value: type.includes("accepted") || type.includes("completed") ? 1 : 0, context: payload }];
  }
  if (type.includes("simulation") && /(resolved|completed|validated|failed)/.test(type)) {
    const accuracy = typeof payload.accuracy === "number" ? payload.accuracy : type.includes("failed") ? 0 : 1;
    return [{ category: "simulations", observationType: "accuracy", value: Math.max(0, Math.min(1, accuracy)), context: payload }];
  }
  if (type.includes("assumption") && /(validated|failed|invalidated|confirmed)/.test(type)) {
    return [{ category: "assumptions", observationType: type.includes("failed") || type.includes("invalidated") ? "failed" : "validated", value: type.includes("failed") || type.includes("invalidated") ? 0 : 1, context: payload }];
  }
  if (type.includes("brief") && /(completed|dismissed|opened|generated)/.test(type)) {
    const itemCount = typeof payload.itemCount === "number" ? payload.itemCount : 0;
    return [{ category: "briefs", observationType: type.includes("completed") ? "completed" : type.includes("dismissed") ? "dismissed" : "engaged", value: type.includes("completed") ? 1 : 0, context: { ...payload, itemCount } }];
  }
  if (type.includes("curiosity") && /(answered|dismissed|followed|ignored)/.test(type)) {
    return [{ category: "curiosity", observationType: type.includes("answered") || type.includes("followed") ? "useful_follow_up" : "dismissed", value: type.includes("answered") || type.includes("followed") ? 1 : 0, context: payload }];
  }
  if (type.includes("initiative") && /(accepted|acted|dismissed|ignored)/.test(type)) {
    return [{ category: "initiatives", observationType: type.includes("accepted") || type.includes("acted") ? "owner_action" : "dismissed", value: type.includes("accepted") || type.includes("acted") ? 1 : 0, context: payload }];
  }
  return [];
}

const RULES: Record<string, { parameter: string; defaultValue: string; reason: (rate: number) => string; nextValue: (rate: number) => string | null }> = {
  recommendations: {
    parameter: "recommendation_surfacing_mode",
    defaultValue: "balanced",
    reason: (rate) => `Recommendation acceptance is ${Math.round(rate * 100)}%; favor high-capacity timing until effectiveness improves.`,
    nextValue: (rate) => rate < 0.5 ? "high_capacity" : null,
  },
  recommendationTiming: {
    parameter: "recommendation_timing",
    defaultValue: "balanced",
    reason: (rate) => `Recommendation acceptance is ${Math.round(rate * 100)}%; adjust timing toward higher-capacity moments.`,
    nextValue: (rate) => rate < 0.5 ? "high_capacity" : null,
  },
  simulations: {
    parameter: "simulation_uncertainty_weight",
    defaultValue: "1.0",
    reason: (rate) => `Simulation accuracy is ${Math.round(rate * 100)}%; increase uncertainty when projections miss.`,
    nextValue: (rate) => rate < 0.6 ? "1.25" : null,
  },
  assumptions: {
    parameter: "assumption_flagging_sensitivity",
    defaultValue: "normal",
    reason: (rate) => `Assumption validation is ${Math.round(rate * 100)}%; flag this category with higher uncertainty.`,
    nextValue: (rate) => rate < 0.6 ? "high" : null,
  },
  briefs: {
    parameter: "brief_item_ceiling",
    defaultValue: "10",
    reason: (rate) => `Brief completion is ${Math.round(rate * 100)}%; reduce the item ceiling to protect attention.`,
    nextValue: (rate) => rate < 0.5 ? "7" : null,
  },
  presentationDepth: {
    parameter: "presentation_depth",
    defaultValue: "standard",
    reason: (rate) => `Brief completion is ${Math.round(rate * 100)}%; reduce presentation depth to protect attention.`,
    nextValue: (rate) => rate < 0.5 ? "concise" : null,
  },
  curiosity: {
    parameter: "curiosity_question_weight",
    defaultValue: "1.0",
    reason: (rate) => `Useful curiosity follow-ups are ${Math.round(rate * 100)}%; lower low-yield question types.`,
    nextValue: (rate) => rate < 0.5 ? "0.75" : null,
  },
  initiatives: {
    parameter: "initiative_surfacing_threshold",
    defaultValue: "normal",
    reason: (rate) => `Owner action follows ${Math.round(rate * 100)}% of initiatives; raise the threshold for weak signals.`,
    nextValue: (rate) => rate < 0.5 ? "high" : null,
  },
};

export const APPROVED_ADAPTATION_PARAMETERS = Object.freeze(Object.values(RULES).map((rule) => rule.parameter));

function adaptationError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode });
}

function validateAdaptationParameter(parameter: string) {
  const normalized = parameter.trim().toLowerCase();
  if (PROTECTED_ADAPTATION_TARGETS.includes(normalized as typeof PROTECTED_ADAPTATION_TARGETS[number])) {
    throw adaptationError(`Self-improvement cannot modify protected target "${parameter}".`, 403);
  }
  if (!APPROVED_ADAPTATION_PARAMETERS.includes(parameter)) {
    throw adaptationError(`Self-improvement parameter "${parameter}" is not approved for adaptation.`, 400);
  }
}

async function recordRejectedAdaptation(parameter: string, reason: string, evidenceRefs: string[] = []) {
  await db.insert(eventLog).values({
    eventType: "OperationalAdaptationRejected",
    aggregateType: "operational_adaptation",
    aggregateId: randomUUID(),
    sourceRef: "self-improvement-boundary",
    occurredAt: new Date(),
    payload: { parameter, reason, evidenceRefs, protectedTarget: PROTECTED_ADAPTATION_TARGETS.includes(parameter as typeof PROTECTED_ADAPTATION_TARGETS[number]) },
  });
}

export async function requestAdaptation(input: { category: string; parameter: string; newValue: string; evidenceRefs: string[]; observationCount?: number; reason: string }) {
  try {
    validateAdaptationParameter(input.parameter);
  } catch (error) {
    await recordRejectedAdaptation(input.parameter, error instanceof Error ? error.message : "Rejected adaptation.", input.evidenceRefs);
    throw error;
  }
  if (input.evidenceRefs.length < MIN_OBSERVATIONS) {
    await recordRejectedAdaptation(input.parameter, `At least ${MIN_OBSERVATIONS} evidence references are required.`, input.evidenceRefs);
    throw adaptationError(`At least ${MIN_OBSERVATIONS} evidence references are required.`, 422);
  }
  if (!input.reason.trim()) {
    await recordRejectedAdaptation(input.parameter, "A reason is required.", input.evidenceRefs);
    throw adaptationError("A reason is required.", 422);
  }
  const [current] = await db.select().from(operationalAdaptation)
    .where(eq(operationalAdaptation.parameter, input.parameter)).orderBy(desc(operationalAdaptation.updatedAt)).limit(1);
  if (current?.status === "disabled") throw adaptationError("This adaptation is disabled until explicitly re-enabled by a future owner-controlled policy.", 409);
  const now = new Date();
  const defaultValue = current?.defaultValue ?? (input.parameter === "brief_item_ceiling" ? "10" : "normal");
  const previousValue = current?.currentValue ?? defaultValue;
  const rollbackData = { previousValue, defaultValue, evidenceRefs: input.evidenceRefs, reason: input.reason, capturedAt: now.toISOString() };
  const [adaptation] = current
    ? await db.update(operationalAdaptation).set({ previousValue, currentValue: input.newValue, evidenceRefs: input.evidenceRefs, observationCount: input.observationCount ?? input.evidenceRefs.length, reason: input.reason, rollbackData, status: "active", updatedAt: now }).where(eq(operationalAdaptation.id, current.id)).returning()
    : await db.insert(operationalAdaptation).values({ category: input.category, parameter: input.parameter, previousValue, currentValue: input.newValue, defaultValue, evidenceRefs: input.evidenceRefs, observationCount: input.observationCount ?? input.evidenceRefs.length, reason: input.reason, rollbackData, status: "active", createdAt: now, updatedAt: now }).returning();
  await db.insert(eventLog).values({
    eventType: "OperationalAdaptationApplied",
    aggregateType: "operational_adaptation",
    aggregateId: adaptation.id,
    sourceRef: "self-improvement-owner-request",
    occurredAt: now,
    payload: { adaptationId: adaptation.id, category: input.category, parameter: input.parameter, previousValue, newValue: input.newValue, evidenceRefs: input.evidenceRefs, observationCount: input.observationCount ?? input.evidenceRefs.length, reason: input.reason, rollbackData },
  });
  return adaptation;
}

export async function runSelfImprovementCycle() {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000);
  const events = await db.select().from(eventLog).where(gte(eventLog.occurredAt, since)).orderBy(desc(eventLog.occurredAt)).limit(2000);
  const signals = events.flatMap((event) => signalsForEvent(event).map((signal) => ({ ...signal, sourceEventId: event.id, observedAt: event.occurredAt })));
  const existingMetrics = await db.select().from(operationalMetric).where(gte(operationalMetric.observedAt, since));
  const existingKeys = new Set(existingMetrics.filter((metric) => metric.sourceEventId).map((metric) => `${metric.category}:${metric.sourceEventId}`));
  const newSignals = signals.filter((signal) => !existingKeys.has(`${signal.category}:${signal.sourceEventId}`));
  if (newSignals.length > 0) {
    await db.insert(operationalMetric).values(newSignals.map((signal) => ({
      category: signal.category,
      observationType: signal.observationType,
      value: signal.value,
      sourceEventId: signal.sourceEventId,
      context: signal.context ?? {},
      observedAt: signal.observedAt,
    })));
  }
  const metrics = [...existingMetrics, ...newSignals.map((signal) => ({ ...signal, id: "", context: signal.context ?? {} }))];
  const adaptations: (typeof operationalAdaptation.$inferSelect)[] = [];
  for (const [category, rule] of Object.entries(RULES)) {
    const categoryMetrics = metrics.filter((metric) => metric.category === category);
    if (categoryMetrics.length < MIN_OBSERVATIONS) continue;
    const rate = categoryMetrics.reduce((sum, metric) => sum + metric.value, 0) / categoryMetrics.length;
    const nextValue = rule.nextValue(rate);
    if (!nextValue) continue;
    const evidenceRefs = categoryMetrics.map((metric) => metric.sourceEventId).filter((id): id is string => Boolean(id)).slice(-50);
    const [current] = await db.select().from(operationalAdaptation)
      .where(eq(operationalAdaptation.parameter, rule.parameter)).orderBy(desc(operationalAdaptation.updatedAt)).limit(1);
    if (current?.status === "disabled") continue;
    if (current?.currentValue === nextValue) continue;
    const now = new Date();
    const rollbackData = { previousValue: current?.currentValue ?? rule.defaultValue, defaultValue: current?.defaultValue ?? rule.defaultValue, evidenceRefs, reason: rule.reason(rate), capturedAt: now.toISOString() };
    const [adaptation] = current
      ? await db.update(operationalAdaptation).set({ previousValue: current.currentValue, currentValue: nextValue, evidenceRefs, observationCount: categoryMetrics.length, reason: rule.reason(rate), rollbackData, updatedAt: now }).where(eq(operationalAdaptation.id, current.id)).returning()
      : await db.insert(operationalAdaptation).values({ category, parameter: rule.parameter, previousValue: rule.defaultValue, currentValue: nextValue, defaultValue: rule.defaultValue, evidenceRefs, observationCount: categoryMetrics.length, reason: rule.reason(rate), rollbackData, status: "active", createdAt: now, updatedAt: now }).returning();
    await db.insert(eventLog).values({
      eventType: "OperationalAdaptationApplied",
      aggregateType: "operational_adaptation",
      aggregateId: adaptation.id,
      sourceRef: "self-improvement-engine",
      occurredAt: now,
      payload: { adaptationId: adaptation.id, category, parameter: rule.parameter, previousValue: adaptation.previousValue, newValue: nextValue, evidenceRefs, observationCount: categoryMetrics.length, reason: rule.reason(rate), rollbackData },
    });
    await db.insert(eventLog).values({
      eventType: "InitiativeCreated",
      aggregateType: "initiative",
      aggregateId: adaptation.id,
      sourceRef: "self-improvement-engine",
      occurredAt: now,
      payload: { kind: "operational_adaptation", adaptationId: adaptation.id, message: `Adapted ${rule.parameter} from ${adaptation.previousValue} to ${nextValue}.`, evidenceRefs },
    });
    adaptations.push(adaptation);
  }
  return { metrics: metrics.length, newMetrics: newSignals.length, adaptations };
}

export async function listSelfImprovement() {
  const rows = await db.select().from(operationalAdaptation).orderBy(desc(operationalAdaptation.updatedAt));
  const latest = new Map<string, typeof rows[number]>();
  for (const row of rows) if (!latest.has(row.parameter)) latest.set(row.parameter, row);
  return [...latest.values()];
}

export async function resetSelfImprovement(id?: string) {
  const rows = id
    ? await db.select().from(operationalAdaptation).where(eq(operationalAdaptation.id, id))
    : await db.select().from(operationalAdaptation).where(eq(operationalAdaptation.status, "active"));
  const reset = [];
  for (const row of rows) {
    const [updated] = await db.update(operationalAdaptation).set({ previousValue: row.currentValue, currentValue: row.defaultValue, status: "disabled", reason: "Reset by owner to the constitutional default.", updatedAt: new Date() }).where(eq(operationalAdaptation.id, row.id)).returning();
    const now = new Date();
    const rollbackData = { previousValue: row.currentValue, defaultValue: row.defaultValue, evidenceRefs: row.evidenceRefs, reason: "Owner reset to default.", capturedAt: now.toISOString() };
    await db.update(operationalAdaptation).set({ rollbackData, updatedAt: now }).where(eq(operationalAdaptation.id, row.id));
    await db.insert(eventLog).values({ eventType: "OperationalAdaptationApplied", aggregateType: "operational_adaptation", aggregateId: row.id, sourceRef: "owner-reset", occurredAt: now, payload: { adaptationId: row.id, parameter: row.parameter, previousValue: row.currentValue, newValue: row.defaultValue, evidenceRefs: row.evidenceRefs, reason: "Owner reset to default.", rollbackData, reset: true } });
    reset.push(updated);
  }
  return reset;
}

export async function getAdaptedParameter(parameter: string, fallback: string) {
  const [row] = await db.select().from(operationalAdaptation).where(and(eq(operationalAdaptation.parameter, parameter), eq(operationalAdaptation.status, "active"))).limit(1);
  return row?.currentValue ?? fallback;
}