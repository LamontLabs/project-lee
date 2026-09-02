import { Router, type IRouter } from "express";
import { db, economicPriceEvidence, economicUsageRecord } from "@workspace/db";
import { getSystemEconomicsSummary, resolveEconomicEvidence, runSystemEconomicsCycle, systemEconomicsContract } from "../lib/system-economics";
import { runCILCostBenchmark } from "../lib/cil-cost-benchmark";
import { z } from "zod";

const router: IRouter = Router();
const economicTimestamp = z.union([z.string().min(1), z.number().finite()]).pipe(z.coerce.date());
const economicUsageRequestSchema = z.object({
  operation: z.string().min(1).max(64),
  category: z.enum(["storage", "backup", "embedding", "network"]),
  quantity: z.number().finite().nonnegative(),
  unit: z.string().min(1).max(32),
  provider: z.string().min(1).max(96),
  sourceRef: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).default({}),
  recordedAt: economicTimestamp.default(() => new Date().toISOString()),
});
const economicPriceRequestSchema = z.object({
  operation: z.string().min(1).max(64),
  category: z.enum(["storage", "backup", "embedding", "network"]),
  unit: z.string().min(1).max(32),
  priceUsd: z.number().finite().nonnegative(),
  provider: z.string().min(1).max(96),
  sourceRef: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).default({}),
  effectiveAt: economicTimestamp,
  recordedAt: economicTimestamp.default(() => new Date().toISOString()),
});

router.get("/economics/summary", async (_req, res): Promise<void> => {
  res.json(await getSystemEconomicsSummary());
});

router.post("/economics/cycle", async (_req, res): Promise<void> => {
  res.status(201).json(await runSystemEconomicsCycle());
});

router.get("/economics/cil-benchmark", (_req, res): void => {
  res.json(runCILCostBenchmark());
});
router.get("/economics/contract", (_req, res): void => {
  res.json(systemEconomicsContract());
});

router.post("/economics/usage", async (req, res): Promise<void> => {
  const parsed = economicUsageRequestSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid measured usage record.", details: parsed.error.flatten() }); return; }
  try {
    const evidence = await resolveEconomicEvidence(parsed.data.sourceRef, parsed.data.provider);
    const [record] = await db.insert(economicUsageRecord).values({ ...parsed.data, evidenceRef: evidence.evidenceRef }).returning();
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Economic usage provenance is invalid." });
  }
});

router.post("/economics/prices", async (req, res): Promise<void> => {
  const parsed = economicPriceRequestSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid price evidence.", details: parsed.error.flatten() }); return; }
  try {
    const evidence = await resolveEconomicEvidence(parsed.data.sourceRef, parsed.data.provider);
    const [record] = await db.insert(economicPriceEvidence).values({ ...parsed.data, evidenceRef: evidence.evidenceRef }).returning();
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Price provenance is invalid." });
  }
});

router.get("/economics/ledger", async (_req, res): Promise<void> => {
  const [usage, prices] = await Promise.all([
    db.select().from(economicUsageRecord),
    db.select().from(economicPriceEvidence),
  ]);
  res.json({ usage, prices });
});

export default router;