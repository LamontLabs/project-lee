import { Router, type IRouter } from "express";
import { bootstrapHistory, bootstrapStatus, runBootstrap } from "../lib/project-bootstrap";
const router: IRouter = Router();
router.post("/internal/bootstrap/run", async (req, res) => {
  const projectId = String(req.body?.projectId ?? req.body?.project_id ?? "workspace");
  const repositoryId = String(req.body?.repositoryId ?? req.body?.repository_id ?? "workspace");
  res.status(201).json(await runBootstrap(projectId, repositoryId));
});
router.get("/internal/bootstrap/status/:bootstrapId", async (req, res) => { const run = await bootstrapStatus(req.params.bootstrapId); if (!run) return res.status(404).json({ error: "Bootstrap run not found." }); return res.json(run); });
router.get("/bootstrap/history", async (req, res) => res.json(await bootstrapHistory(req.query.projectId ? String(req.query.projectId) : undefined)));
export default router;