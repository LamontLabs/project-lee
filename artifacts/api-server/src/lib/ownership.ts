import { db, eventLog, factLedger, interpretationLedger, person, sourceVault, universalObject } from "@workspace/db";
import { eq } from "drizzle-orm";
import { recordTrustEvent } from "./trust";

export type OwnershipActor = "owner" | "migration" | "system" | string;
export function actor(input: unknown, fallback: OwnershipActor = "owner") {
  return typeof input === "string" && input.trim() ? input.trim() : fallback;
}
export function ownershipSummary(item: any) {
  const verified = item.verifiedBy ? `Verified by ${item.verifiedBy}` : "Never verified";
  const created = item.createdBy === "owner" ? "Owner-created" : `Created by ${item.createdBy ?? "migration"}`;
  return `${created} · ${verified}`;
}
export async function verifyObject(type: string, id: string) {
  const now = new Date();
  if (type === "object") return (await db.update(universalObject).set({ verifiedBy: "owner", verifiedAt: now, lastVerifiedAt: now, modifiedBy: "owner", modifiedAt: now, updatedAt: now, ageState: "FRESH" }).where(eq(universalObject.id, id)).returning())[0];
  if (type === "fact") return (await db.update(factLedger).set({ verifiedBy: "owner", verifiedAt: now, lastVerifiedAt: now, modifiedBy: "owner", modifiedAt: now, updatedAt: now, ageState: "FRESH" }).where(eq(factLedger.id, id)).returning())[0];
  if (type === "interpretation") return (await db.update(interpretationLedger).set({ verifiedBy: "owner", verifiedAt: now, lastVerifiedAt: now, modifiedBy: "owner", modifiedAt: now, updatedAt: now, ageState: "FRESH" }).where(eq(interpretationLedger.id, id)).returning())[0];
  if (type === "person") return (await db.update(person).set({ verifiedBy: "owner", verifiedAt: now, lastVerifiedAt: now, modifiedBy: "owner", modifiedAt: now, updatedAt: now, ageState: "FRESH" }).where(eq(person.id, id)).returning())[0];
  if (type === "source") return (await db.update(sourceVault).set({ verifiedBy: "owner", verifiedAt: now, lastVerifiedAt: now, modifiedBy: "owner", modifiedAt: now, updatedAt: now, ageState: "FRESH" }).where(eq(sourceVault.id, id)).returning())[0];
  return null;
}
export async function getOwnershipObject(type: string, id: string) {
  if (type === "object") return (await db.select().from(universalObject).where(eq(universalObject.id, id)).limit(1))[0];
  if (type === "fact") return (await db.select().from(factLedger).where(eq(factLedger.id, id)).limit(1))[0];
  if (type === "interpretation") return (await db.select().from(interpretationLedger).where(eq(interpretationLedger.id, id)).limit(1))[0];
  if (type === "person") return (await db.select().from(person).where(eq(person.id, id)).limit(1))[0];
  if (type === "source") return (await db.select().from(sourceVault).where(eq(sourceVault.id, id)).limit(1))[0];
  return null;
}
export async function recordVerification(type: string, id: string, item: any) {
  await db.insert(eventLog).values({ eventType: "OwnerVerified", aggregateType: type, aggregateId: id, sourceRef: "owner", occurredAt: new Date(), payload: { verifiedBy: "owner", verifiedAt: item.verifiedAt, ownership: { createdBy: item.createdBy, generatedBy: item.generatedBy, importedFrom: item.importedFrom } } });
  await recordTrustEvent(type === "interpretation" ? "Interpretation Ledger" : type === "fact" ? "Fact Ledger" : "Database", "healed", `Owner verified ${type} ${id}.`, id);
}