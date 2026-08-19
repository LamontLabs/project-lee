import { Router, type IRouter } from "express";
import healthRouter from "./health";
import understandingRouter from "./understanding";
import reasoningRouter from "./reasoning";

const router: IRouter = Router();

router.use(healthRouter);
router.use(understandingRouter);
router.use(reasoningRouter);

export default router;
