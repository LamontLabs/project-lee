import { Router } from "express";
import { bridgeTokenMatches, changeConfirmationSignature, localApplyChanges, localPreviewChanges, localProjectInspect, localReadFile, localRunCheck } from "../lib/mcp-project-bridge";

const router = Router();

function auth(req: any, res: any, next: any) {
  const configured = process.env.PROJECT_BRIDGE_API_KEY ?? process.env.MCP_BRIDGE_API_KEY;
  const supplied = req.header("x-project-bridge-key") ?? req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!bridgeTokenMatches(supplied, configured)) { res.status(401).json({ error: "Project bridge authorization is required." }); return; }
  next();
}

router.use(auth);
router.get("/inspect", async (_req, res) => res.json(await localProjectInspect()));
router.post("/files/read", async (req, res) => {
  try { res.json(await localReadFile(String(req.body?.path ?? ""))); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "File read failed." }); }
});
router.post("/changes/preview", async (req, res) => {
  try { res.json(await localPreviewChanges(req.body?.changes)); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Change preview failed." }); }
});
router.post("/changes/apply", async (req, res) => {
  if (!req.body?.confirmationToken || !Array.isArray(req.body?.changes)) { res.status(400).json({ error: "A confirmation token and changes are required." }); return; }
  const configured = process.env.PROJECT_BRIDGE_API_KEY ?? process.env.MCP_BRIDGE_API_KEY;
  const expected = configured ? changeConfirmationSignature(configured, req.body?.changes) : "";
  if (!bridgeTokenMatches(req.header("x-project-bridge-confirmation"), expected)) { res.status(403).json({ error: "A valid confirmation signature is required." }); return; }
  try { res.json(await localApplyChanges(req.body?.changes)); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Change application failed." }); }
});
router.post("/checks/run", async (req, res) => {
  try { res.json(await localRunCheck(String(req.body?.command ?? ""))); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Project check failed." }); }
});

export default router;