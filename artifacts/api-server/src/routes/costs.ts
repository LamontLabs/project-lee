import { Router, type IRouter } from "express";
import { GetCostSummaryResponse } from "@workspace/api-zod";
import { costRecord, db } from "@workspace/db";

const router: IRouter = Router();

router.get("/costs/summary", async (_req, res): Promise<void> => {
  const records = await db.select().from(costRecord);
  const byTier = new Map<string, { requestCount: number; totalTokens: number; estimatedCostUsd: number }>();
  let promptTokens = 0;
  let completionTokens = 0;
  let estimatedCostUsd = 0;

  for (const record of records) {
    promptTokens += record.promptTokens;
    completionTokens += record.completionTokens;
    estimatedCostUsd += record.estimatedCostUsd;
    const current = byTier.get(record.tier) ?? {
      requestCount: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
    };
    current.requestCount += 1;
    current.totalTokens += record.totalTokens;
    current.estimatedCostUsd += record.estimatedCostUsd;
    byTier.set(record.tier, current);
  }

  res.json(
    GetCostSummaryResponse.parse({
      requestCount: records.length,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      estimatedCostUsd,
      byTier: [...byTier.entries()].map(([tier, values]) => ({
        tier,
        ...values,
      })),
    }),
  );
});

export default router;