import { and, desc, eq } from "drizzle-orm";
import { costRecord, db, eventLog, intentRecord, universalObject } from "@workspace/db";
import { recordCorrection } from "./learning";
const TYPES = ["question_factual", "question_exploratory", "explanation_seeking", "recommendation_request", "simulation_request", "strategy_request", "draft_request", "review_request", "capture_input", "approval_action", "governance_action", "navigation_request", "status_check", "configuration_change"] as const;
function classifyType(text: string) {
  const input = text.toLowerCase();
  if (/explain|why does|how did|walk me through|what led/.test(input)) return "explanation_seeking";
  if (/simulate|scenario|what if|model the outcome/.test(input)) return "simulation_request";
  if (/recommend|should i|what would you suggest/.test(input)) return "recommendation_request";
  if (/strategy|strategic|long.term/.test(input)) return "strategy_request";
  if (/draft|write|compose|email|message/.test(input)) return "draft_request";
  if (/review|critique|audit/.test(input)) return "review_request";
  if (/capture|remember|save this|log this/.test(input)) return "capture_input";
  if (/approve|approval|release|send|execute/.test(input)) return "approval_action";
  if (/configure|settings|policy|change the mode/.test(input)) return "configuration_change";
  if (/status|health|how are we doing|progress/.test(input)) return "status_check";
  if (/\bwhat\b|\bwho\b|\bwhen\b|\bwhere\b|\bhow many\b|\bis there\b/.test(input)) return /related|everything|conversation|mentioned|concern/.test(input) ? "question_exploratory" : "question_factual";
  return "question_exploratory";
}
export async function classifyIntent(rawInput: string, sessionContext: Record<string, unknown> = {}, source = "ask_lee", sessionId?: string) {
  const text = rawInput.trim(); if (!text) throw new Error("rawInput is required.");
  const objects = await db.select({ id: universalObject.id, objectType: universalObject.objectType, name: universalObject.name, description: universalObject.description }).from(universalObject).limit(500);
  const lower = text.toLowerCase(); const matches = objects.filter((object) => lower.includes(object.name.toLowerCase()) || (object.description && lower.includes(object.description.toLowerCase()))); const intentType = classifyType(text);
  const confidence = Math.min(0.98, 0.58 + (matches.length ? 0.15 : 0) + (text.includes("?") ? 0.1 : 0)); const explanation = intentType === "explanation_seeking" ? "object" : null; const retrievalMode = intentType === "question_exploratory" || intentType === "explanation_seeking" ? "semantic" : intentType === "capture_input" ? "none" : "structured"; const complexity = /complex|compare|tradeoff|deep|architecture|strategy/.test(lower) ? "strong" : text.length > 240 ? "mid" : "cheap";
  const [created] = await db.insert(intentRecord).values({ rawInput: text, intentType, intentSubtype: sessionContext.subtype ? String(sessionContext.subtype) : null, detectedProjectIds: matches.filter((item) => /project|initiative/i.test(item.objectType)).map((item) => item.id), detectedPersonIds: matches.filter((item) => /person|relationship/i.test(item.objectType)).map((item) => item.id), detectedObjectIds: matches.map((item) => item.id), audienceProfile: /investor|board/.test(lower) ? "Investor" : /developer|technical|code/.test(lower) ? "Technical" : "Founder", urgency: /urgent|asap|today|critical/.test(lower) ? "time_sensitive" : "routine", requiresModel: !["capture_input", "navigation_request"].includes(intentType), modelComplexityEstimate: complexity, retrievalMode, explanationType: explanation, confidence, source, sessionId }).returning();
  await db.insert(costRecord).values({ correlationId: created.id, engine: "Intent Engine", provider: "local", tier: "T1", model: "local-rule-classifier", promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0, latencyMs: 0, cacheHit: false, metadata: { modelVersion: "intent-rules-v1" } });
  await db.insert(eventLog).values({ eventType: "IntentClassified", aggregateType: "intent", aggregateId: created.id, sourceRef: "intent-engine", occurredAt: new Date(), payload: { intentType, confidence, retrievalMode, source, detectedObjectCount: matches.length } });
  return created;
}
export async function correctIntent(id: string, correctedType: string, requester = "founder") {
  if (!(TYPES as readonly string[]).includes(correctedType)) throw new Error("Invalid intent type.");
  const [current] = await db.select().from(intentRecord).where(eq(intentRecord.id, id)).limit(1); if (!current) return null;
  const [updated] = await db.update(intentRecord).set({ intentType: correctedType, correctionCount: current.correctionCount + 1, confidence: 1 }).where(eq(intentRecord.id, id)).returning();
  await recordCorrection({ engineName: "Intent Engine", originalOutput: current.intentType, correctedOutput: correctedType, correctionType: "classification", category: "intent_type", contextSnapshot: { intentId: id, requester, rawInput: current.rawInput } });
  await db.insert(eventLog).values({ eventType: "IntentCorrected", aggregateType: "intent", aggregateId: id, sourceRef: "intent-engine", occurredAt: new Date(), payload: { from: current.intentType, to: correctedType, requester } }); return updated;
}
export async function intentHistory(limit = 100) { return db.select().from(intentRecord).orderBy(desc(intentRecord.createdAt)).limit(limit); }