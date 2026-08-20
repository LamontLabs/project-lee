import { Router, type IRouter } from "express";
import { computeExecutionReadiness, currentExecutionReadiness, dimensionsForGoal, readinessHistory, READINESS_GOALS } from "../lib/execution-readiness";
const router: IRouter=Router();
function goalFrom(value: unknown) {
  return typeof value === "string" && (READINESS_GOALS as readonly string[]).includes(value) ? value : "launch";
}
router.get("/execution-readiness",async(req,res)=>res.json(await currentExecutionReadiness(goalFrom(req.query.goal))));
router.get("/execution-readiness/goals",async(_req,res)=>res.json(READINESS_GOALS.map((goal)=>({ goal, dimensions: dimensionsForGoal(goal) }))));
router.get("/execution-readiness/history",async(req,res)=>res.json(await readinessHistory(typeof req.query.projectId==="string"?req.query.projectId:undefined)));
router.post("/execution-readiness/recompute",async(req,res)=>res.json(await computeExecutionReadiness(goalFrom(req.body?.goal))));
router.get("/projects/:id/readiness",async(req,res)=>res.json((await currentExecutionReadiness(goalFrom(req.query.goal))).find((item)=>item.projectId===req.params.id)??null));
export default router;