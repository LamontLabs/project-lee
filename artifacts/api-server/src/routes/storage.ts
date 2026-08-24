import { Router, type IRouter } from "express";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();

router.post("/storage/uploads/request-url", async (req, res): Promise<void> => {
  const { name, size, contentType } = req.body ?? {};
  if (typeof name !== "string" || !name.trim() || !Number.isSafeInteger(size) || size < 0 || typeof contentType !== "string") {
    res.status(400).json({ error: "name, size, and contentType are required." }); return;
  }
  try {
    const result = await storage.requestUpload();
    res.json({ ...result, metadata: { name: name.trim(), size, contentType } });
  } catch (error) {
    req.log.error({ error }, "Storage upload URL failed");
    res.status(500).json({ error: "Unable to prepare storage upload." });
  }
});

router.get("/storage/objects/*path", async (req, res): Promise<void> => {
  try {
    const path = Array.isArray(req.params.path) ? req.params.path.join("/") : req.params.path;
    const result = await storage.read(`/objects/${path}`);
    res.type(result.contentType).set("content-length", String(result.size)).send(result.buffer);
  } catch (error) {
    if (error instanceof ObjectNotFoundError) { res.status(404).json({ error: "Object not found." }); return; }
    req.log.error({ error }, "Storage object read failed");
    res.status(500).json({ error: "Unable to read stored object." });
  }
});

export { storage };
export default router;