import { Router, type IRouter } from "express";
import { getBootstrapAwareness } from "../lib/bootstrap-awareness";

const router: IRouter = Router();

router.get("/bootstrap-awareness", async (_req, res): Promise<void> => {
  res.json(await getBootstrapAwareness());
});

export default router;