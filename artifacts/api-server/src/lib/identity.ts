import { and, desc, eq } from "drizzle-orm";
import { db, eventLog, identityProfile, identityProfileVersion } from "@workspace/db";

export const IDENTITY_DIMENSIONS = [
  "role",
  "purpose",
  "responsibilities",
  "nonNegotiables",
  "protects",
  "priorities",
  "successCriteria",
  "interruptThreshold",
  "silenceThreshold",
  "escalationThreshold",
  "askingThreshold",
  "observeThreshold",
] as const;

export const IDENTITY_ENUMS = {
  interruptThreshold: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
  silenceThreshold: ["LOW", "MEDIUM", "HIGH"],
  escalationThreshold: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
  askingThreshold: ["LOW", "MEDIUM", "HIGH"],
  observeThreshold: ["LOW", "MEDIUM", "HIGH"],
} as const;

export const DEFAULT_IDENTITY: Record<string, unknown> = {
  role: "Persistent operating partner for a solo founder managing a portfolio.",
  purpose: "Protect the founder's thinking, continuity, attention, and judgment.",
  responsibilities: ["Preserve operating continuity", "Prepare decisions", "Surface meaningful changes", "Keep evidence and uncertainty visible"],
  nonNegotiables: ["Never invent evidence", "Never silently change owner commitments", "Never replace the owner's judgment"],
  protects: ["Founder attention", "Decision quality", "Operational continuity", "Provenance"],
  priorities: ["Truth and provenance", "Founder-directed progress", "Reversible action", "Useful silence"],
  successCriteria: ["The owner makes better-informed decisions", "Important context is not lost", "LEE is trusted because her boundaries are visible"],
  interruptThreshold: "HIGH",
  silenceThreshold: "MEDIUM",
  escalationThreshold: "HIGH",
  askingThreshold: "MEDIUM",
  observeThreshold: "LOW",
};

function validateValues(values: Record<string, unknown>) {
  for (const dimension of IDENTITY_DIMENSIONS) {
    if (!(dimension in values)) throw new Error(`Identity dimension is missing: ${dimension}`);
    const allowed = (IDENTITY_ENUMS as Record<string, readonly string[]>)[dimension];
    if (allowed && (typeof values[dimension] !== "string" || !allowed.includes(values[dimension] as string))) {
      throw new Error(`Invalid value for identity dimension: ${dimension}`);
    }
  }
}

export async function getCurrentIdentity() {
  let [profile] = await db.select().from(identityProfile).where(eq(identityProfile.profileKey, "primary")).limit(1);
  if (!profile) {
    const now = new Date();
    [profile] = await db.insert(identityProfile).values({ profileKey: "primary", displayName: "Lee", values: DEFAULT_IDENTITY, mission: String(DEFAULT_IDENTITY.purpose), sourceRef: "identity-onboarding-default", confidence: 0.7, createdAt: now, updatedAt: now }).returning();
    await db.insert(identityProfileVersion).values({ profileId: profile.id, version: 1, values: DEFAULT_IDENTITY, changeReason: "Initial structured identity onboarding profile.", confirmedByOwner: false, createdAt: now });
    await db.insert(eventLog).values({ eventType: "IdentityProfileCreated", aggregateType: "identity_profile", aggregateId: profile.id, sourceRef: "identity-onboarding", occurredAt: now, payload: { profileId: profile.id, version: 1, onboardingRequired: true } });
  }
  return profile;
}

export async function consultIdentity() {
  const profile = await getCurrentIdentity();
  return { profileId: profile.id, role: profile.values.role, priorities: profile.values.priorities, thresholds: Object.fromEntries(Object.keys(IDENTITY_ENUMS).map((key) => [key, profile.values[key]])) };
}

export async function updateIdentity(values: Record<string, unknown>, changeReason: string, confirm: boolean) {
  if (!confirm) throw new Error("Owner confirmation is required to change Identity.");
  validateValues(values);
  const current = await getCurrentIdentity();
  const [latest] = await db.select().from(identityProfileVersion).where(eq(identityProfileVersion.profileId, current.id)).orderBy(desc(identityProfileVersion.version)).limit(1);
  const now = new Date();
  const version = (latest?.version ?? 0) + 1;
  const result = await db.transaction(async (tx) => {
    const [profile] = await tx.update(identityProfile).set({ values, mission: typeof values.purpose === "string" ? values.purpose : current.mission, sourceRef: `owner-confirmation:${version}`, updatedAt: now }).where(eq(identityProfile.id, current.id)).returning();
    const [profileVersion] = await tx.insert(identityProfileVersion).values({ profileId: current.id, version, values, changeReason, confirmedByOwner: true, createdAt: now }).returning();
    const [event] = await tx.insert(eventLog).values({ eventType: "IdentityProfileUpdated", aggregateType: "identity_profile", aggregateId: current.id, sourceRef: `identity-profile-version:${profileVersion.id}`, occurredAt: now, payload: { profileId: current.id, version, changeReason, confirmedByOwner: true, changedDimensions: IDENTITY_DIMENSIONS.filter((key) => JSON.stringify(current.values[key]) !== JSON.stringify(values[key])) } }).returning();
    return { profile, profileVersion, event };
  });
  return result;
}

export async function listIdentityVersions() {
  const profile = await getCurrentIdentity();
  return db.select().from(identityProfileVersion).where(eq(identityProfileVersion.profileId, profile.id)).orderBy(desc(identityProfileVersion.version));
}