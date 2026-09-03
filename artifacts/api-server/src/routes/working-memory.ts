import { Router, type IRouter } from "express";
import { buildContextPacket } from "../lib/context-engine";
import { getWorkingMemory, persistWorkingMemory } from "../lib/working-memory";

const router: IRouter = Router();

router.get("/memory-architecture/working-memory", async (req, res): Promise<void> => {
  const scopeKey = typeof req.query.scopeKey === "string" ? req.query.scopeKey.trim() : undefined;
  const record = await getWorkingMemory(scopeKey || undefined);
  if (!record) {
    res.status(404).json({ error: "Working Memory has not been assembled for this scope yet." });
    return;
  }
  res.json(record);
});

router.post("/memory-architecture/working-memory/rebuild", async (req, res): Promise<void> => {
  const scopeKey = String(req.body?.scopeKey ?? "console:default").trim();
  const existing = await getWorkingMemory(scopeKey);
  const envelope = existing?.envelope as Record<string, any> | undefined;
  const query = String(req.body?.query ?? envelope?.activeConversation?.query ?? "current operating state").trim();
  const mode = String(req.body?.mode ?? envelope?.activeConversation?.mode ?? "normal");
  const budgetTokens = Math.max(128, Math.min(3000, Number(req.body?.budgetTokens ?? envelope?.selectionAudit?.budgetTokens ?? 1200)));
  const packet = await buildContextPacket(query, mode as any, budgetTokens, { intentType: envelope?.activeConversation?.intentType ?? "status_check" }, {
    workingMemoryScope: scopeKey,
    workingMemorySessionId: envelope?.sessionId ?? null,
    workingMemoryObjectiveId: envelope?.objectiveId ?? null,
    persistWorkingMemory: false,
  });
  const projection = await persistWorkingMemory({
    scopeKey,
    sessionId: envelope?.sessionId ?? null,
    objectiveId: envelope?.objectiveId ?? null,
    query,
    mode,
    intentType: envelope?.activeConversation?.intentType ?? null,
    budgetTokens,
    selected: packet.items,
    excluded: packet.excluded,
    reason: "Owner-requested deterministic rebuild from canonical retrieval and Event Log evidence.",
    rebuilt: true,
  });
  res.json(projection.record);
});

export default router;