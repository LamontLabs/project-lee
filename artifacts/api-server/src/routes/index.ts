import { Router, type IRouter } from "express";
import healthRouter from "./health";
import understandingRouter from "./understanding";
import reasoningRouter from "./reasoning";
import connectorsRouter from "./connectors";

const router: IRouter = Router();

router.use(healthRouter);
router.use(understandingRouter);
router.use(reasoningRouter);
router.use(connectorsRouter);

export default router;
