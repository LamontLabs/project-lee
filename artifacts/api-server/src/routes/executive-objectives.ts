import { Router, type IRouter } from "express";
import { closeObjective, createObjective, getObjective, listObjectives } from "../lib/executive-objectives";

const router: IRouter = Router();

router.get("/objectives", async (req, res): Promise<void> => {
  res.json(await listObjectives(req.query.includeArchived === "true"));
});

router.get("/objectives/:id", async (req, res): Promise<void> => {
  const objective = await getObjective(req.params.id);
  if (!objective) { res.status(404).json({ error: "Objective not found." }); return; }
  res.json(objective);
});

router.post("/objectives", async (req, res): Promise<void> => {
  try {
    res.status(201).json(await createObjective(req.body ?? {}));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Objective creation failed." });
  }
});

router.post("/objectives/:id/close", async (req, res): Promise<void> => {
  const state = req.body?.state;
  if (state !== "achieved" && state !== "abandoned") { res.status(400).json({ error: "state must be achieved or abandoned." }); return; }
  try {
    const objective = await closeObjective(req.params.id, state, req.body.reason);
    if (!objective) { res.status(404).json({ error: "Objective not found." }); return; }
    res.json(objective);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Objective close failed." });
  }
});

export default router;