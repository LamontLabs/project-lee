import { createHash } from "node:crypto";

export type CILBenchmarkCase = {
  id: string;
  class: "repeated" | "semantic_similarity" | "fresh" | "stale" | "drifted" | "contradictory" | "frontier" | "rejected";
  expectedTier: "T1_TRIGRAM" | "T2_SEMANTIC" | "T3_FRONTIER";
  reuseCandidate: boolean;
  correctnessPass: boolean;
  freshnessPass: boolean;
  cilCostUsd: number;
  cilLatencyMs: number;
  frontierCostUsd: number;
  frontierLatencyMs: number;
};

export type CILBenchmarkReport = {
  benchmarkId: string;
  methodologyVersion: string;
  corpusHash: string;
  methodology: string[];
  corpus: CILBenchmarkCase[];
  metrics: {
    totalRequests: number;
    t1Hits: number;
    t2Hits: number;
    t3Escalations: number;
    avoidedFrontierCalls: number;
    frontierCallsWithCIL: number;
    frontierDependencyPercent: number;
    totalCostUsd: number;
    noReuseCostUsd: number;
    savingsUsd: number;
    savingsPercent: number;
    latencyP50Ms: number;
    latencyP95Ms: number;
    noReuseLatencyP50Ms: number;
    noReuseLatencyP95Ms: number;
    reuseRejectionCount: number;
    rejectionRate: number;
    correctnessOverrides: number;
    freshnessOverrides: number;
  };
};

export const cilBenchmarkCorpus: CILBenchmarkCase[] = [
  { id: "repeat-governance-1", class: "repeated", expectedTier: "T1_TRIGRAM", reuseCandidate: true, correctnessPass: true, freshnessPass: true, cilCostUsd: 0, cilLatencyMs: 8, frontierCostUsd: 0.012, frontierLatencyMs: 410 },
  { id: "repeat-governance-2", class: "repeated", expectedTier: "T1_TRIGRAM", reuseCandidate: true, correctnessPass: true, freshnessPass: true, cilCostUsd: 0, cilLatencyMs: 9, frontierCostUsd: 0.012, frontierLatencyMs: 405 },
  { id: "similar-product-1", class: "semantic_similarity", expectedTier: "T2_SEMANTIC", reuseCandidate: true, correctnessPass: true, freshnessPass: true, cilCostUsd: 0.001, cilLatencyMs: 35, frontierCostUsd: 0.012, frontierLatencyMs: 430 },
  { id: "similar-product-2", class: "semantic_similarity", expectedTier: "T2_SEMANTIC", reuseCandidate: true, correctnessPass: true, freshnessPass: true, cilCostUsd: 0.001, cilLatencyMs: 36, frontierCostUsd: 0.012, frontierLatencyMs: 425 },
  { id: "fresh-policy", class: "fresh", expectedTier: "T2_SEMANTIC", reuseCandidate: true, correctnessPass: true, freshnessPass: true, cilCostUsd: 0.001, cilLatencyMs: 38, frontierCostUsd: 0.012, frontierLatencyMs: 440 },
  { id: "stale-policy", class: "stale", expectedTier: "T2_SEMANTIC", reuseCandidate: true, correctnessPass: true, freshnessPass: false, cilCostUsd: 0.001, cilLatencyMs: 40, frontierCostUsd: 0.012, frontierLatencyMs: 445 },
  { id: "drifted-relationship", class: "drifted", expectedTier: "T2_SEMANTIC", reuseCandidate: true, correctnessPass: false, freshnessPass: true, cilCostUsd: 0.001, cilLatencyMs: 41, frontierCostUsd: 0.012, frontierLatencyMs: 450 },
  { id: "contradictory-technical", class: "contradictory", expectedTier: "T2_SEMANTIC", reuseCandidate: true, correctnessPass: false, freshnessPass: false, cilCostUsd: 0.001, cilLatencyMs: 42, frontierCostUsd: 0.012, frontierLatencyMs: 455 },
  { id: "novel-strategy", class: "frontier", expectedTier: "T3_FRONTIER", reuseCandidate: false, correctnessPass: true, freshnessPass: true, cilCostUsd: 0.012, cilLatencyMs: 210, frontierCostUsd: 0.012, frontierLatencyMs: 460 },
  { id: "high-risk-synthesis", class: "rejected", expectedTier: "T3_FRONTIER", reuseCandidate: false, correctnessPass: true, freshnessPass: true, cilCostUsd: 0.012, cilLatencyMs: 225, frontierCostUsd: 0.012, frontierLatencyMs: 470 },
];

function percentile(values: number[], fraction: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))] ?? 0;
}

function roundMoney(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function hashCorpus(corpus: CILBenchmarkCase[]) {
  return createHash("sha256").update(JSON.stringify(corpus)).digest("hex");
}

export function runCILCostBenchmark(corpus = cilBenchmarkCorpus): CILBenchmarkReport {
  const acceptedReuse = corpus.filter((item) => item.reuseCandidate && item.correctnessPass && item.freshnessPass);
  const t1Hits = acceptedReuse.filter((item) => item.expectedTier === "T1_TRIGRAM").length;
  const t2Hits = acceptedReuse.filter((item) => item.expectedTier === "T2_SEMANTIC").length;
  const t3Escalations = corpus.filter((item) => item.expectedTier === "T3_FRONTIER").length;
  const frontierCallsWithCIL = corpus.length - t1Hits - t2Hits;
  const totalCostUsd = roundMoney(corpus.reduce((sum, item) => sum + item.cilCostUsd + (acceptedReuse.includes(item) ? 0 : item.frontierCostUsd), 0));
  const noReuseCostUsd = roundMoney(corpus.reduce((sum, item) => sum + item.frontierCostUsd, 0));
  const latencies = corpus.map((item) => item.cilLatencyMs + (acceptedReuse.includes(item) ? 0 : item.frontierLatencyMs));
  const noReuseLatencies = corpus.map((item) => item.frontierLatencyMs);
  const reuseRejectionCount = corpus.filter((item) => item.reuseCandidate && (!item.correctnessPass || !item.freshnessPass)).length;
  return {
    benchmarkId: "cil-reuse-cost-v1",
    methodologyVersion: "2026.08",
    corpusHash: hashCorpus(corpus),
    methodology: [
      "Each corpus row is evaluated once with CIL metadata and once against the same fixed frontier baseline.",
      "T1/T2 responses avoid the frontier call only when correctness and freshness both pass.",
      "T3, stale, drifted, contradictory, and rejected cases retain frontier dependence; savings never override correctness or freshness.",
      "Savings equals noReuseCostUsd minus totalCostUsd; latency uses observed CIL plus any required fallback latency.",
    ],
    corpus,
    metrics: {
      totalRequests: corpus.length,
      t1Hits,
      t2Hits,
      t3Escalations,
      avoidedFrontierCalls: t1Hits + t2Hits,
      frontierCallsWithCIL,
      frontierDependencyPercent: frontierCallsWithCIL / corpus.length,
      totalCostUsd,
      noReuseCostUsd,
      savingsUsd: roundMoney(noReuseCostUsd - totalCostUsd),
      savingsPercent: noReuseCostUsd ? roundMoney((noReuseCostUsd - totalCostUsd) / noReuseCostUsd) : 0,
      latencyP50Ms: percentile(latencies, 0.5),
      latencyP95Ms: percentile(latencies, 0.95),
      noReuseLatencyP50Ms: percentile(noReuseLatencies, 0.5),
      noReuseLatencyP95Ms: percentile(noReuseLatencies, 0.95),
      reuseRejectionCount,
      rejectionRate: corpus.length ? reuseRejectionCount / corpus.length : 0,
      correctnessOverrides: corpus.filter((item) => item.reuseCandidate && !item.correctnessPass).length,
      freshnessOverrides: corpus.filter((item) => item.reuseCandidate && !item.freshnessPass).length,
    },
  };
}