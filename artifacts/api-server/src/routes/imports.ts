import { desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, sourceChunk, sourceVault, understandingReviewItem, understandingRun } from "@workspace/db";
import { importSource, listReviewItems } from "../lib/understanding-pipeline";
import { ObjectNotFoundError } from "../lib/objectStorage";
import { storage } from "./storage";

const router: IRouter = Router();

router.post("/imports", async (req, res): Promise<void> => {
  const { filename, mimeType, content, objectPath, metadata, importedFrom } = req.body ?? {};
  if (typeof filename !== "string" || typeof mimeType !== "string" || (typeof content !== "string" && typeof objectPath !== "string")) {
    res.status(400).json({ error: "filename, mimeType, and either content or objectPath are required." });
    return;
  }
  try {
    const stored = typeof objectPath === "string" ? await storage.read(objectPath) : null;
    const result = await importSource({
      filename, mimeType, content: stored ? stored.buffer.toString("utf8") : content,
      storagePath: objectPath, metadata: { ...(metadata && typeof metadata === "object" ? metadata : {}), byteSize: stored?.size ?? Buffer.byteLength(content), storageBacked: Boolean(stored) },
      importedFrom: importedFrom && typeof importedFrom === "object" ? importedFrom : undefined,
    });
    res.status(result.duplicate ? 200 : 201).json(result);
  } catch (error) {
    req.log.error({ error }, "Import pipeline failed");
    if (error instanceof ObjectNotFoundError) { res.status(404).json({ error: "The imported object is no longer available. No source was created." }); return; }
    res.status(500).json({ error: error instanceof Error ? error.message : "Import pipeline failed." });
  }
});

router.get("/imports", async (_req, res) => {
  const sources = await db.select().from(sourceVault).orderBy(desc(sourceVault.updatedAt)).limit(200);
  const runs = await db.select().from(understandingRun).orderBy(desc(understandingRun.startedAt)).limit(200);
  res.json(sources.map((source) => ({ ...source, runs: runs.filter((run) => run.sourceRef === source.id) })));
});

router.get("/imports/:sourceId/chunks", async (req, res) => {
  res.json(await db.select().from(sourceChunk).where(eq(sourceChunk.sourceId, req.params.sourceId)).orderBy(sourceChunk.chunkIndex));
});

router.get("/imports/review", async (req, res) => {
  res.json(await listReviewItems(typeof req.query.status === "string" ? req.query.status : "needs_review"));
});

router.patch("/imports/review/:id", async (req, res): Promise<void> => {
  const status = req.body?.status;
  if (!["approved", "rejected", "edited", "needs_review"].includes(status)) {
    res.status(400).json({ error: "status must be approved, rejected, edited, or needs_review." });
    return;
  }
  const [item] = await db.update(understandingReviewItem).set({ status, resolution: typeof req.body?.resolution === "string" ? req.body.resolution : null, proposedValue: req.body?.proposedValue ?? undefined, resolvedAt: status === "needs_review" ? null : new Date() }).where(eq(understandingReviewItem.id, req.params.id)).returning();
  if (!item) { res.status(404).json({ error: "Review item not found." }); return; }
  res.json(item);
});

router.post("/imports/:sourceId/retry", async (req, res): Promise<void> => {
  const [source] = await db.select().from(sourceVault).where(eq(sourceVault.id, req.params.sourceId)).limit(1);
  if (!source) { res.status(404).json({ error: "Source not found." }); return; }
  try {
    const stored = source.rawContent ? null : await storage.read(source.storagePath);
    if (!source.rawContent && !stored) { res.status(404).json({ error: "Source content not available for retry." }); return; }
    const result = await importSource({ filename: source.originalFilename, mimeType: source.mimeType, content: stored?.buffer.toString("utf8") ?? source.rawContent!, storagePath: stored ? source.storagePath : undefined, metadata: source.metadata, importedFrom: source.importedFrom ?? undefined, sourceId: source.id });
    res.json(result);
  } catch (error) {
    req.log.error({ error, sourceId: source.id, storagePath: source.storagePath }, "Import retry failed");
    if (error instanceof ObjectNotFoundError) { res.status(404).json({ error: "The stored object is unavailable. The source remains available for recovery when storage is restored." }); return; }
    res.status(502).json({ error: error instanceof Error ? error.message : "Unable to read source content for retry." });
  }
});

export default router;