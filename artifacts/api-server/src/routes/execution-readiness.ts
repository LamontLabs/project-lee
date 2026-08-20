import { Router, type IRouter } from "express";
import { computeExecutionReadiness, currentExecutionReadiness, readinessHistory } from "../lib/execution-readiness";
const router: IRouter=Router();
router.get("/execution-readiness",async(req,res)=>res.json(await currentExecutionReadiness(typeof req.query.goal==="string"?req.query.goal:"general")));
router.get("/execution-readiness/history",async(req,res)=>res.json(await readinessHistory(typeof req.query.projectId==="string"?req.query.projectId:undefined)));
router.post("/execution-readiness/recompute",async(req,res)=>res.json(await computeExecutionReadiness(typeof req.body?.goal==="string"?req.body.goal:"general")));
router.get("/projects/:id/readiness",async(req,res)=>res.json((await currentExecutionReadiness(typeof req.query.goal==="string"?req.query.goal:"general")).find((item)=>item.projectId===req.params.id)??null));
export default router;