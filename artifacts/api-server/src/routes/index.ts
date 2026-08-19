import { Router, type IRouter } from "express";
import healthRouter from "./health";
import understandingRouter from "./understanding";
import reasoningRouter from "./reasoning";
import connectorsRouter from "./connectors";
import costsRouter from "./costs";
import brainVersionsRouter from "./brain-versions";
import schedulerRouter from "./scheduler";
import governanceRouter from "./governance";
import memoryRouter from "./memory";
import graphRouter from "./graph";
import relationshipsRouter from "./relationships";
import reviewsRouter from "./reviews";

const router: IRouter = Router();

router.use(healthRouter);
router.use(understandingRouter);
router.use(reasoningRouter);
router.use(connectorsRouter);
router.use(costsRouter);
router.use(brainVersionsRouter);
router.use(schedulerRouter);
router.use(governanceRouter);
router.use(memoryRouter);
router.use(graphRouter);
router.use(relationshipsRouter);
router.use(reviewsRouter);

export default router;
