import { Router, type IRouter } from "express";
import { GetCostSummaryResponse } from "@workspace/api-zod";
import { costRecord, db, modelRouteDecision } from "@workspace/db";
import { desc, gte, sql } from "drizzle-orm";

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

router.get("/costs/history", async (req, res): Promise<void> => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50)));
  const records = await db.select().from(costRecord).orderBy(desc(costRecord.recordedAt)).limit(limit);
  const routes = await db.select().from(modelRouteDecision).orderBy(desc(modelRouteDecision.createdAt)).limit(limit);
  res.json({ records, routes });
});

router.get("/costs/budget", async (_req, res): Promise<void> => {
  const now = new Date();
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [day, week, month] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(${costRecord.estimatedCostUsd}), 0)` }).from(costRecord).where(gte(costRecord.recordedAt, dayStart)),
    db.select({ total: sql<number>`coalesce(sum(${costRecord.estimatedCostUsd}), 0)` }).from(costRecord).where(gte(costRecord.recordedAt, weekStart)),
    db.select({ total: sql<number>`coalesce(sum(${costRecord.estimatedCostUsd}), 0)` }).from(costRecord).where(gte(costRecord.recordedAt, monthStart)),
  ]);
  const limits = { daily: Number(process.env.LEE_DAILY_BUDGET_USD ?? 1), weekly: Number(process.env.LEE_WEEKLY_BUDGET_USD ?? 5), monthly: Number(process.env.LEE_MONTHLY_BUDGET_USD ?? 20) };
  const spent = { daily: Number(day[0]?.total ?? 0), weekly: Number(week[0]?.total ?? 0), monthly: Number(month[0]?.total ?? 0) };
  res.json({ spent, limits, limited: spent.daily >= limits.daily || spent.weekly >= limits.weekly || spent.monthly >= limits.monthly });
});

export default router;