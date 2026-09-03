import type { SelectedContext } from "./context-economy";
import type { CILQueryResponse } from "../services/internal-services";

type RouteEvidence = {
  tier: string;
  model: string;
  provider: string;
  routeId: string | null;
  cil?: Pick<CILQueryResponse, "resolution_tier" | "confidence" | "cost_usd" | "latency_ms" | "provenance" | "cognitive_asset_id" | "asset_version" | "drift_detected" | "contradiction_detected" | "freshness_state" | "reuse_eligible" | "recommend_escalation" | "escalation_reason">;
  cilRerouted?: boolean;
  cilRerouteReason?: string;
};

const sensitiveKinds = new Set(["email_thread", "email_status", "credential", "connector_payload"]);

function titleFor(item: SelectedContext) {
  if (item.kind === "fact") return "Source-backed fact";
  if (item.kind === "interpretation") return "Lee interpretation";
  if (item.kind === "assumption") return "Active assumption";
  if (item.kind === "contradiction") return "Open contradiction";
  if (item.kind === "commitment") return "Commitment";
  if (item.kind === "waiting") return "Waiting loop";
  if (item.kind === "strategy") return "Strategic objective";
  if (item.kind === "project") return "Project";
  if (item.kind === "person") return "Person";
  if (item.kind === "cost") return "Cost observation";
  if (item.kind === "governance") return "Governance record";
  if (item.kind === "system") return "System health";
  if (item.kind === "event") return "Event";
  if (item.kind === "email_thread") return "Email thread";
  return item.kind.replaceAll("_", " ");
}

function domainFor(item: SelectedContext) {
  if (["person", "people", "relationship"].includes(item.kind)) return "people";
  if (item.kind === "commitment") return "commitments";
  if (["project", "strategy", "waiting", "initiative"].includes(item.kind)) return "projects";
  if (item.kind === "event" || item.kind === "contradiction" || item.kind === "assumption") return "changes";
  if (item.kind === "cost") return "costs";
  if (item.kind === "governance" || item.kind === "constitution") return "governance";
  if (item.kind === "system") return "systems";
  if (item.kind === "email_thread" || item.kind === "email_status") return "connections";
  return "knowledge";
}

function freshnessFor(item: SelectedContext) {
  const explicit = String(item.ageState ?? "").toLowerCase();
  if (["fresh", "current", "stale", "expired"].includes(explicit)) return explicit;
  if (item.recencyDays > 90) return "expired";
  if (item.recencyDays > 30) return "stale";
  if (item.recencyDays > 7) return "current";
  return "fresh";
}

function confidenceLabel(value: number) {
  if (value >= 0.8) return "high";
  if (value >= 0.55) return "moderate";
  return "low";
}

function safeExcerpt(item: SelectedContext) {
  if (sensitiveKinds.has(item.kind)) return undefined;
  return item.text.length > 280 ? `${item.text.slice(0, 279)}…` : item.text;
}

function evidenceFor(item: SelectedContext) {
  const freshness = freshnessFor(item);
  const sensitive = sensitiveKinds.has(item.kind);
  return {
    id: item.id,
    title: titleFor(item),
    domain: domainFor(item),
    epistemicType: item.kind === "fact" ? "fact" : item.kind === "interpretation" ? "interpretation" : item.kind === "assumption" ? "assumption" : "operational",
    sourceRef: item.sourceRef ?? item.id,
    evidenceRefs: Array.isArray((item as any).evidenceRefs) ? (item as any).evidenceRefs : [item.sourceRef ?? item.id],
    excerpt: safeExcerpt(item),
    confidence: item.confidence,
    confidenceLabel: confidenceLabel(item.confidence),
    freshness,
    freshnessScore: Math.max(0, Math.min(1, 1 / (1 + item.recencyDays / 30))),
    rawContentSuppressed: sensitive,
  };
}

export function sanitizeContextPacket(packet: { id?: string | null; fingerprint: string; reused: boolean; items: SelectedContext[]; excluded?: SelectedContext[]; tokens: number; excludedRefs: string[]; trustAdvisory?: unknown }) {
  const sanitize = (item: SelectedContext) => ({
    id: item.id,
    kind: item.kind,
    provider: item.provider,
    sourceRef: item.sourceRef,
    confidence: item.confidence,
    recencyDays: item.recencyDays,
    ageState: freshnessFor(item),
    text: sensitiveKinds.has(item.kind) ? "Provider content is withheld from the default context preview." : safeExcerpt(item),
    rawContentSuppressed: sensitiveKinds.has(item.kind),
  });
  return {
    id: packet.id ?? null,
    fingerprint: packet.fingerprint,
    reused: packet.reused,
    items: packet.items.map(sanitize),
    excluded: (packet.excluded ?? []).map(sanitize),
    tokens: packet.tokens,
    excludedRefs: packet.excludedRefs,
    trustAdvisory: packet.trustAdvisory,
  };
}

export function sanitizeCILResponse(cil: CILQueryResponse) {
  const { answer: _answer, ...safe } = cil;
  return safe;
}

export function buildAskAnswerContract(input: { answer: string; items: SelectedContext[]; cil?: CILQueryResponse; route: RouteEvidence; intentType?: string }) {
  const evidence = input.items.map(evidenceFor);
  const assumptions = evidence.filter((item) => item.epistemicType === "assumption");
  const contradictions = evidence.filter((item) => item.domain === "changes" && input.items.find((candidate) => candidate.id === item.id)?.kind === "contradiction");
  const staleCount = evidence.filter((item) => item.freshness === "stale" || item.freshness === "expired").length;
  const freshnessState = input.cil?.freshness_state ?? (staleCount ? "stale" : "current");
  const domains = [...new Set(evidence.map((item) => item.domain))];
  const domainCards = domains.map((domain) => {
    const domainEvidence = evidence.filter((item) => item.domain === domain);
    return {
      domain,
      title: domain[0].toUpperCase() + domain.slice(1),
      summary: `${domainEvidence.length} grounded item${domainEvidence.length === 1 ? "" : "s"} in this domain.`,
      evidenceIds: domainEvidence.map((item) => item.id),
    };
  });
  const whyChain = [
    { step: "retrieval", statement: `${evidence.length} item${evidence.length === 1 ? "" : "s"} survived Constitution, privacy, freshness, and context-budget checks.`, evidenceIds: evidence.map((item) => item.id) },
    ...(assumptions.length ? [{ step: "assumptions", statement: `${assumptions.length} active assumption${assumptions.length === 1 ? "" : "s"} is labeled separately from source-backed facts.`, evidenceIds: assumptions.map((item) => item.id) }] : []),
    ...(contradictions.length || input.cil?.contradiction_detected ? [{ step: "contradictions", statement: contradictions.length ? `${contradictions.length} open contradiction${contradictions.length === 1 ? "" : "s"} needs attention.` : "CIL flagged a contradiction in the reasoning result.", evidenceIds: contradictions.map((item) => item.id) }] : []),
    { step: "reasoning", statement: `CIL resolved this request at ${input.route.tier} for the ${input.intentType ?? "conversation"} intent.`, evidenceIds: evidence.map((item) => item.id) },
  ];
  const confidence = input.cil?.confidence ?? (evidence.length ? evidence.reduce((sum, item) => sum + item.confidence, 0) / evidence.length : 0);
  return {
    version: "ask-lee.v1",
    presentation: "compact_with_expandable_details",
    compact: {
      conclusion: input.answer,
      confidence,
      confidenceLabel: confidenceLabel(confidence),
      freshness: freshnessState,
      evidenceCount: evidence.length,
      domains,
    },
    conclusion: input.answer,
    evidence,
    freshness: {
      state: freshnessState,
      staleCount,
      currentCount: evidence.filter((item) => item.freshness === "fresh" || item.freshness === "current").length,
      label: freshnessState === "stale" || freshnessState === "expired" ? "Some context is aging" : "Context is current enough for this response",
    },
    assumptions,
    contradictions: {
      detected: Boolean(contradictions.length || input.cil?.contradiction_detected),
      items: contradictions,
      cilFlagged: Boolean(input.cil?.contradiction_detected),
    },
    confidence: { score: confidence, label: confidenceLabel(confidence), source: input.cil ? "CIL" : "evidence aggregate" },
    relevantEntities: evidence.map((item) => ({ id: item.id, label: item.title, domain: item.domain, evidenceIds: [item.id] })),
    domainCards,
    whyChain,
    provenance: {
      evidenceIds: evidence.map((item) => item.id),
      sourceRefs: [...new Set(evidence.flatMap((item) => item.evidenceRefs))],
      cilProvenance: input.cil?.provenance ?? [],
      generatedBy: "LEE via CIL",
    },
    cilRoute: {
      resolutionTier: input.cil?.resolution_tier ?? input.route.tier,
      executionAuthority: "CIL",
      provider: input.route.provider,
      model: input.route.model,
      routeId: input.route.routeId,
      routeSelectedBy: "CIL",
      localModelSelection: false,
      reroutedByCIL: Boolean(input.route.cilRerouted),
      rerouteReason: input.route.cilRerouteReason,
      confidence: input.cil?.confidence,
      costUsd: input.cil?.cost_usd,
      latencyMs: input.cil?.latency_ms,
      cognitiveAssetId: input.cil?.cognitive_asset_id,
      assetVersion: input.cil?.asset_version,
      reuseEligible: input.cil?.reuse_eligible,
      recommendEscalation: input.cil?.recommend_escalation,
      escalationReason: input.cil?.escalation_reason,
    },
  };
}