import { Router, type IRouter } from "express";
import { getLatestDesktopSetup, runDesktopSetup } from "../lib/desktop-setup";

const router: IRouter = Router();
router.get("/desktop-setup", async (_req, res) => res.json(await getLatestDesktopSetup()));
router.post("/desktop-setup/run", async (_req, res) => res.status(202).json(await runDesktopSetup()));
export default router;