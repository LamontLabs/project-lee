import { Router, type IRouter } from "express";
import healthRouter from "./health";
import understandingRouter from "./understanding";
import reasoningRouter from "./reasoning";
import connectorsRouter from "./connectors";
import costsRouter from "./costs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(understandingRouter);
router.use(reasoningRouter);
router.use(connectorsRouter);
router.use(costsRouter);

export default router;
