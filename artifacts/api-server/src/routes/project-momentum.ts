import { Router, type IRouter } from "express";
import { computeProjectMomentum, currentProjectMomentum, projectMomentumHistory } from "../lib/project-momentum";
const router: IRouter = Router();
router.get("/projects/momentum", async (_req, res) => res.json(await currentProjectMomentum()));
router.get("/projects/:projectId/momentum", async (req, res) => res.json(await currentProjectMomentum(req.params.projectId)));
router.get("/projects/:projectId/momentum/history", async (req, res) => res.json(await projectMomentumHistory(req.params.projectId)));
router.post("/internal/projects/momentum/recompute", async (req, res) => res.json(await computeProjectMomentum(typeof req.body?.projectId === "string" ? req.body.projectId : undefined)));
export default router;