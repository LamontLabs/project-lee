import { Router, type IRouter } from "express";
import healthRouter from "./health";
import understandingRouter from "./understanding";

const router: IRouter = Router();

router.use(healthRouter);
router.use(understandingRouter);

export default router;
