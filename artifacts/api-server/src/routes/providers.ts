import { Router, type IRouter } from "express";
import { listProviders, registerProviders } from "../lib/provider-abstraction";
const router: IRouter = Router();
router.get("/providers", async (_req, res) => res.json(await listProviders()));
router.post("/providers/register", async (_req, res) => res.json(await registerProviders()));
export default router;