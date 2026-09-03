import { db, milestoneMarker } from "@workspace/db";
import { queryMeaningfulChanges, type ChangeQuery } from "./change-intelligence";

export async function queryTimeline(input: ChangeQuery = {}) {
  const result = await queryMeaningfulChanges(input);
  const milestones = await db.select().from(milestoneMarker);
  return result.changes.map((change) => ({
    ...change,
    id: change.eventId,
    changeId: change.id,
    milestone: milestones.find((item) => item.eventId === change.eventId) ?? null,
  }));
}