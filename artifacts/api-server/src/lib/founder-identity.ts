import { desc, eq } from "drizzle-orm";
import { db, eventLog, founderProfile, founderProfileCorrection, founderProfileHistory } from "@workspace/db";
import { enqueueWork } from "./orchestration";

export const FOUNDER_DIMENSIONS = ["thinkingStyle", "decisionStyle", "writingVoice", "technicalDepth", "documentationPreferences", "riskTolerance", "currentGoals", "currentPriorities", "energyPatterns", "preferredModels", "favoriteWorkflows", "currentLearningGoals", "recurringFriction"] as const;
type Dimension = typeof FOUNDER_DIMENSIONS[number];
type DimensionRecord = { value: unknown; confidence: "low" | "medium" | "high" | "confirmed"; sourceLog: Array<{ source: string; at: string }>; lastConfirmedAt: string | null; correctionCount: number };
const empty = (): Record<string, DimensionRecord> => Object.fromEntries(FOUNDER_DIMENSIONS.map((dimension) => [dimension, { value: null, confidence: "low", sourceLog: [], lastConfirmedAt: null, correctionCount: 0 }]));

export async function getFounderProfile() {
  let [profile] = await db.select().from(founderProfile).where(eq(founderProfile.profileKey, "primary")).limit(1);
  if (!profile) {
    const dimensions = empty(); const now = new Date();
    [profile] = await db.insert(founderProfile).values({ dimensions, createdAt: now, updatedAt: now }).returning();
    await db.insert(founderProfileHistory).values({ profileId: profile.id, version: 1, dimensions, changeReason: "Initial empty Founder Profile; no operating assumptions inferred.", confirmedByOwner: false, createdAt: now });
  }
  return profile;
}
export async function updateFounderDimension(dimension: string, value: unknown, source: string, confidence: DimensionRecord["confidence"] = "confirmed") {
  if (!(FOUNDER_DIMENSIONS as readonly string[]).includes(dimension)) throw new Error(`Unknown Founder Profile dimension: ${dimension}`);
  const current = await getFounderProfile(); const dimensions = { ...current.dimensions } as Record<string, DimensionRecord>;
  const previous = dimensions[dimension]; const now = new Date(); const record = { value, confidence, sourceLog: [...(previous?.sourceLog ?? []), { source, at: now.toISOString() }].slice(-30), lastConfirmedAt: confidence === "confirmed" ? now.toISOString() : previous?.lastConfirmedAt ?? null, correctionCount: (previous?.correctionCount ?? 0) + (confidence === "confirmed" ? 1 : 0) };
  dimensions[dimension] = record;
  const result = await db.transaction(async (tx) => {
    const version = current.version + 1;
    const [profile] = await tx.update(founderProfile).set({ dimensions, version, updatedAt: now }).where(eq(founderProfile.id, current.id)).returning();
    const [history] = await tx.insert(founderProfileHistory).values({ profileId: current.id, version, dimensions, changeReason: source, confirmedByOwner: confidence === "confirmed", createdAt: now }).returning();
    const [correction] = await tx.insert(founderProfileCorrection).values({ profileId: current.id, dimension, previousValue: previous?.value ?? null, correctedValue: value, source, createdAt: now }).returning();
    await tx.insert(eventLog).values({ eventType: "FounderProfileCorrected", aggregateType: "founder_profile", aggregateId: current.id, sourceRef: source, occurredAt: now, payload: { dimension, version, confidence, correctionId: correction.id } });
    return { profile, history, correction };
  });
  return result;
}
export async function founderContext() {
  const profile = await getFounderProfile();
  return Object.fromEntries(Object.entries(profile.dimensions as Record<string, DimensionRecord>).filter(([, record]) => ["high", "confirmed"].includes(record.confidence) && record.value != null));
}
export async function scanFounderPatterns() { return enqueueWork({ engineName: "Identity Engine", action: "behavioral_scan", priority: "LOW", payload: { dimensions: FOUNDER_DIMENSIONS } }); }