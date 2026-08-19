import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { contextPacket, db, eventLog, factLedger, interpretationLedger, universalObject, waitingLoop } from "@workspace/db";
import { constructContextPacket, type SelectedContext } from "./context-economy";

export type ConversationMode = "normal" | "deep_think" | "build" | "write" | "review" | "pilot" | "low_cost" | "private" | "no_model" | "governed_action";

export async function buildContextPacket(query: string, mode: ConversationMode, budgetTokens = 3000) {
  const [objects, facts, interpretations, waiting, events] = await Promise.all([
    db.select().from(universalObject).orderBy(desc(universalObject.updatedAt)).limit(40),
    db.select().from(factLedger).orderBy(desc(factLedger.updatedAt)).limit(30),
    db.select().from(interpretationLedger).orderBy(desc(interpretationLedger.updatedAt)).limit(20),
    db.select().from(waitingLoop).where(eq(waitingLoop.status, "open")).limit(20),
    db.select().from(eventLog).orderBy(desc(eventLog.occurredAt)).limit(20),
  ]);
  const items = [
    ...objects.map((item) => ({ id: item.id, text: `${item.name}: ${item.description ?? item.status}`, kind: item.objectType, confidence: item.confidence, recencyDays: Math.max(0, (Date.now() - item.updatedAt.getTime()) / 86400000), strategicAnchor: item.canonLevel === "canonical" })),
    ...facts.map((item) => ({ id: item.id, text: `${item.subject} ${item.predicate} ${item.object}`, kind: "fact", confidence: item.confidence, recencyDays: Math.max(0, item.updatedAt ? (Date.now() - item.updatedAt.getTime()) / 86400000 : 0), strategicAnchor: item.canonLevel === "canonical" })),
    ...interpretations.map((item) => ({ id: item.id, text: item.statement, kind: "interpretation", confidence: item.confidence, recencyDays: Math.max(0, item.updatedAt ? (Date.now() - item.updatedAt.getTime()) / 86400000 : 0), strategicAnchor: item.canonLevel === "canonical" })),
    ...waiting.map((item) => ({ id: item.id, text: `Waiting: ${item.subject} (${item.owner ?? "unassigned"})`, kind: "waiting", confidence: 0.8, recencyDays: Math.max(0, (Date.now() - item.updatedAt.getTime()) / 86400000), strategicAnchor: false })),
    ...events.map((item) => ({ id: item.id, text: `${item.eventType}: ${JSON.stringify(item.payload)}`, kind: "event", confidence: 0.7, recencyDays: Math.max(0, (Date.now() - item.occurredAt.getTime()) / 86400000), strategicAnchor: false })),
  ];
  const fingerprint = createHash("sha256").update(JSON.stringify({ query: query.trim().toLowerCase(), mode, ids: items.map((item) => item.id) })).digest("hex");
  const [cached] = await db.select().from(contextPacket).where(eq(contextPacket.fingerprint, fingerprint)).orderBy(desc(contextPacket.createdAt)).limit(1);
  if (cached && cached.expiresAt > new Date()) return { id: cached.id, fingerprint, reused: true, items: (cached.packet.items as SelectedContext[]) ?? [], tokens: cached.tokenEstimate, excludedRefs: cached.excludedRefs };
  const selected = constructContextPacket(query, items, budgetTokens);
  const excludedRefs = items.filter((item) => !selected.items.some((chosen) => chosen.id === item.id)).map((item) => item.id);
  return { id: null, fingerprint, reused: false, items: selected.items, tokens: selected.tokens, excludedRefs };
}