import { db, provenanceRecord } from "@workspace/db";
export async function recordProvenance(recordType: string, recordId: string, sourceRefs: string[], confidence = 0.5) {
  if (!sourceRefs.length) return [];
  return db.insert(provenanceRecord).values(sourceRefs.map((sourceRef) => ({ runId: crypto.randomUUID(), recordType, recordId, sourceRef, confidence }))).returning();
}