import { Router, type IRouter } from "express";
import { generateManifest } from "../lib/system-manifest";
import { buildSystemContract } from "../lib/system-contract";

const router: IRouter = Router();

async function sendContract(_req: unknown, res: { json: (value: unknown) => void }): Promise<void> {
  const manifest = await generateManifest();
  res.json(buildSystemContract(manifest));
}

router.get("/contract", sendContract);
router.get("/system-contract", sendContract);
router.get("/contract.json", async (_req, res): Promise<void> => {
  const manifest = await generateManifest();
  const contract = buildSystemContract(manifest);
  res.setHeader("content-disposition", "attachment; filename=lee-system-contract.json");
  res.json(contract);
});

export default router;