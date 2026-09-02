import { desc, eq } from "drizzle-orm";
import {
  GenerateOperationalReviewBody,
  GenerateOperationalReviewResponse,
  GetOperationalReviewParams,
  GetOperationalReviewResponse,
  ListOperationalReviewsQueryParams,
  ListOperationalReviewsResponse,
} from "@workspace/api-zod";
import { db, operationalReview } from "@workspace/db";
import { Router, type IRouter } from "express";
import { generateOperationalReview } from "../lib/operational-review";

const router: IRouter = Router();

function serializeReview(review: typeof operationalReview.$inferSelect) {
  return {
    ...review,
    reasoningCorrelationId: review.reasoningCorrelationId ?? undefined,
    reasoningCostUsd: review.reasoningCostUsd ?? undefined,
  };
}

router.post("/reviews/generate", async (req, res): Promise<void> => {
  const parsed = GenerateOperationalReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const result = await generateOperationalReview({
    cadence: parsed.data.cadence,
    periodStart: new Date(parsed.data.periodStart),
    periodEnd: new Date(parsed.data.periodEnd),
  });
  res.status(201).json(GenerateOperationalReviewResponse.parse(serializeReview(result.review)));
});

router.get("/reviews", async (req, res): Promise<void> => {
  const parsed = ListOperationalReviewsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const reviews = await db.select().from(operationalReview).orderBy(desc(operationalReview.generatedAt));
  const filtered = parsed.data.cadence ? reviews.filter((review) => review.cadence === parsed.data.cadence) : reviews;
  res.json(ListOperationalReviewsResponse.parse(filtered.map(serializeReview)));
});

router.get("/reviews/:id", async (req, res): Promise<void> => {
  const parsed = GetOperationalReviewParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [review] = await db.select().from(operationalReview).where(eq(operationalReview.id, parsed.data.id)).limit(1);
  if (!review) {
    res.status(404).json({ error: "Operational review not found." });
    return;
  }
  res.json(GetOperationalReviewResponse.parse(serializeReview(review)));
});

export default router;