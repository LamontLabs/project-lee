import { Router, type IRouter } from "express";
import { getOwnershipObject, recordVerification, verifyObject } from "../lib/ownership";

const router: IRouter = Router();
router.get("/ownership/summary/:type/:id", async (req, res) => {
  const item = await getOwnershipObject(req.params.type, req.params.id);
  if (!item) { res.status(404).json({ error: "Ownership object not found." }); return; }
  res.json({ ...item, ownershipSummary: `${item.createdBy === "owner" ? "Owner-created" : `Created by ${item.createdBy}`} · ${item.verifiedBy ? `Verified by ${item.verifiedBy}` : "Never verified"}` });
});
router.post("/ownership/:type/:id/verify", async (req, res) => {
  const item = await verifyObject(req.params.type, req.params.id);
  if (!item) { res.status(404).json({ error: "Ownership object not found." }); return; }
  await recordVerification(req.params.type, req.params.id, item);
  res.json(item);
});
export default router;