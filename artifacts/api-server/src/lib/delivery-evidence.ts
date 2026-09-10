import { createHmac, timingSafeEqual } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { connector, db, eventLog } from "@workspace/db";

export const DELIVERY_SIGNALS = ["build", "tests", "deployment", "packaging"] as const;
export type DeliverySignal = typeof DELIVERY_SIGNALS[number];
export type DeliveryStatus = "healthy" | "partial" | "blocked" | "unverified";

type Evidence = {
  source: string;
  observedAt: string | null;
  detail: string;
  refs?: string[];
};

export type DeliveryItem = {
  id: DeliverySignal;
  label: string;
  status: DeliveryStatus;
  detail: string;
  evidence: Evidence[];
  ownerActionRequired?: boolean;
};

type RecordedEvidence = {
  signal: DeliverySignal;
  status: DeliveryStatus;
  source: string;
  observedAt: string;
  detail: string;
  refs?: string[];
  freshnessSeconds?: number;
};

const freshnessSeconds: Record<DeliverySignal, number> = {
  build: 24 * 60 * 60,
  tests: 24 * 60 * 60,
  deployment: 24 * 60 * 60,
  packaging: 30 * 24 * 60 * 60,
};
const GITHUB_EVIDENCE_TIMEOUT_MS = 2_000;

const labels: Record<DeliverySignal, string> = {
  build: "Build status",
  tests: "Test status",
  deployment: "Deployment status",
  packaging: "Desktop release status",
};

const connectors = new ReplitConnectors();
let githubCache: { expiresAt: number; items: Partial<Record<DeliverySignal, DeliveryItem>> } | undefined;

function validSignal(value: unknown): value is DeliverySignal {
  return typeof value === "string" && (DELIVERY_SIGNALS as readonly string[]).includes(value);
}

function validStatus(value: unknown): value is DeliveryStatus {
  return value === "healthy" || value === "partial" || value === "blocked" || value === "unverified";
}

function evidence(source: string, detail: string, observedAt: string | null, refs?: string[]): Evidence {
  return { source, detail, observedAt, ...(refs?.length ? { refs } : {}) };
}

function iso(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function statusFromConclusion(conclusion: unknown, status: unknown): DeliveryStatus {
  if (String(status).toLowerCase() !== "completed") return "partial";
  return String(conclusion).toLowerCase() === "success" ? "healthy" : "blocked";
}

function runDetail(workflow: string, run: any) {
  return `${workflow} run ${run.id} on ${run.head_branch ?? run.head_sha ?? "unknown ref"} concluded ${run.conclusion ?? run.status ?? "unknown"}.`;
}

async function githubRepository() {
  const [row] = await db.select().from(connector).where(eq(connector.provider, "github")).limit(1);
  if (!row || row.status === "unconfigured" || row.authStatus !== "connected") return null;
  const configuration = row.configuration ?? {};
  const owner = typeof configuration.owner === "string" ? configuration.owner.trim() : "";
  const repo = typeof configuration.repo === "string" ? configuration.repo.trim() : "";
  if (!owner || !repo) return null;
  return { owner, repo };
}

async function githubJson(path: string) {
  const response = await connectors.proxy("github", path, { method: "GET" });
  if (!response.ok) throw new Error(`GitHub request failed (${response.status}).`);
  return response.json() as Promise<any>;
}

async function latestWorkflowRun(owner: string, repo: string, workflow: string) {
  const data = await githubJson(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/actions/workflows/${encodeURIComponent(workflow)}/runs?per_page=10`);
  return Array.isArray(data.workflow_runs) ? data.workflow_runs[0] : null;
}

async function githubDeliveryEvidence(): Promise<Partial<Record<DeliverySignal, DeliveryItem>>> {
  if (githubCache && githubCache.expiresAt > Date.now()) return githubCache.items;
  const repository = await githubRepository();
  if (!repository) return {};

  const items: Partial<Record<DeliverySignal, DeliveryItem>> = {};
  try {
    const ci = await latestWorkflowRun(repository.owner, repository.repo, "project-lee-ci.yml");
    if (ci) {
      const observedAt = iso(ci.updated_at ?? ci.completed_at ?? ci.created_at);
      const detail = runDetail("Project LEE CI", ci);
      const refs = [`https://github.com/${repository.owner}/${repository.repo}/actions/runs/${ci.id}`];
      items.build = { id: "build", label: labels.build, status: statusFromConclusion(ci.conclusion, ci.status), detail, evidence: [evidence("github-actions:project-lee-ci", detail, observedAt, refs)] };
      items.tests = { id: "tests", label: labels.tests, status: statusFromConclusion(ci.conclusion, ci.status), detail, evidence: [evidence("github-actions:project-lee-ci", "The authoritative CI workflow runs the workspace typecheck, API/console builds, desktop typecheck, and desktop contract checks.", observedAt, refs)] };
    }
  } catch {
    // A missing or unavailable connector must remain unverified below.
  }

  try {
    const release = await latestWorkflowRun(repository.owner, repository.repo, "lee-desktop-release.yml");
    if (release) {
      const observedAt = iso(release.updated_at ?? release.completed_at ?? release.created_at);
      const refs = [`https://github.com/${repository.owner}/${repository.repo}/actions/runs/${release.id}`];
      let status = statusFromConclusion(release.conclusion, release.status);
      let detail = runDetail("Project LEE Desktop Release", release);
      if (String(release.status).toLowerCase() === "completed" && String(release.conclusion).toLowerCase() === "success") {
        try {
          const jobs = await githubJson(`/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/actions/runs/${encodeURIComponent(String(release.id))}/jobs?per_page=100`);
          const validation = (jobs.jobs ?? []).find((job: any) => job.name === "windows-installer-validation");
          if (!validation || String(validation.conclusion).toLowerCase() !== "success") {
            status = validation ? "blocked" : "unverified";
            detail = validation
              ? `Hosted Windows validation concluded ${validation.conclusion ?? validation.status ?? "unknown"}; the desktop release is not verified.`
              : "The release run succeeded, but hosted Windows validation evidence was not present.";
          } else {
            detail = "Hosted Windows installer validation completed successfully in the authoritative desktop release workflow.";
          }
        } catch {
          status = "unverified";
          detail = "The desktop release run exists, but hosted Windows job evidence could not be read.";
        }
      }
      items.packaging = { id: "packaging", label: labels.packaging, status, detail, evidence: [evidence("github-actions:lee-desktop-release", detail, observedAt, refs)] };
    }
  } catch {
    // A missing or unavailable connector must remain unverified below.
  }

  githubCache = { expiresAt: Date.now() + 30_000, items };
  return items;
}

async function recordedDeliveryEvidence(): Promise<Partial<Record<DeliverySignal, DeliveryItem>>> {
  const rows = await db.select().from(eventLog).where(eq(eventLog.eventType, "DeliveryEvidenceRecorded")).orderBy(desc(eventLog.occurredAt)).limit(100);
  const items: Partial<Record<DeliverySignal, DeliveryItem>> = {};
  for (const row of rows) {
    const payload = row.payload as Record<string, unknown>;
    if (!validSignal(payload.signal) || items[payload.signal]) continue;
    const observedAt = iso(payload.observedAt ?? row.occurredAt);
    const age = observedAt ? (Date.now() - new Date(observedAt).getTime()) / 1000 : Number.POSITIVE_INFINITY;
    const stale = age > (Number(payload.freshnessSeconds) || freshnessSeconds[payload.signal]);
    const status = stale ? "unverified" : validStatus(payload.status) ? payload.status : "unverified";
    const detail = stale
      ? `The latest ${labels[payload.signal].toLowerCase()} evidence is stale; the last reported state was ${String(payload.status ?? "unknown")}.`
      : String(payload.detail ?? `Evidence recorded by ${String(payload.source ?? row.sourceRef)}.`);
    items[payload.signal] = {
      id: payload.signal,
      label: labels[payload.signal],
      status,
      detail,
      evidence: [evidence(String(payload.source ?? row.sourceRef), detail, observedAt, Array.isArray(payload.refs) ? payload.refs.map(String) : [row.id])],
      ownerActionRequired: stale || status === "blocked",
    };
  }
  return items;
}

function unverified(signal: DeliverySignal, reason: string): DeliveryItem {
  return {
    id: signal,
    label: labels[signal],
    status: "unverified",
    detail: reason,
    evidence: [evidence(`delivery:${signal}`, reason, null)],
    ownerActionRequired: true,
  };
}

function newestCandidate(...candidates: Array<DeliveryItem | undefined>) {
  return candidates
    .filter((candidate): candidate is DeliveryItem => Boolean(candidate))
    .sort((left, right) => {
      const leftAt = left.evidence[0]?.observedAt ? new Date(left.evidence[0].observedAt).getTime() : 0;
      const rightAt = right.evidence[0]?.observedAt ? new Date(right.evidence[0].observedAt).getTime() : 0;
      return rightAt - leftAt;
    })[0];
}

export async function getDeliveryEvidence() {
  const [githubResult, recorded] = await Promise.all([
    Promise.race([
      githubDeliveryEvidence(),
      new Promise<Partial<Record<DeliverySignal, DeliveryItem>>>((resolve) => setTimeout(() => resolve({}), GITHUB_EVIDENCE_TIMEOUT_MS)),
    ]).catch(() => ({})),
    recordedDeliveryEvidence(),
  ]);
  const github = githubResult as Partial<Record<DeliverySignal, DeliveryItem>>;
  const items = Object.fromEntries(DELIVERY_SIGNALS.map((signal) => {
    const candidate = newestCandidate(recorded[signal], github[signal]);
    return [signal, candidate ?? unverified(signal, `No authoritative ${labels[signal].toLowerCase()} evidence is connected to this runtime.`)];
  })) as Record<DeliverySignal, DeliveryItem>;
  return { build: items.build, tests: items.tests, deployment: items.deployment, packaging: items.packaging, evidence: DELIVERY_SIGNALS.flatMap((signal) => items[signal].evidence) };
}

export function deliveryEvidenceSignature(body: string, secret = process.env.DELIVERY_EVIDENCE_HMAC_SECRET) {
  if (!secret) return null;
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function deliveryEvidenceSignatureMatches(body: string, supplied: string | undefined) {
  const expected = deliveryEvidenceSignature(body);
  if (!expected || !supplied) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied.replace(/^sha256=/i, ""));
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function recordDeliveryEvidence(input: Record<string, unknown>) {
  if (!validSignal(input.signal) || !validStatus(input.status) || typeof input.source !== "string" || !input.source || typeof input.detail !== "string" || !input.detail) {
    throw new Error("Delivery evidence requires signal, status, source, and detail.");
  }
  const observedAt = iso(input.observedAt);
  if (!observedAt) throw new Error("Delivery evidence requires a valid observedAt timestamp.");
  const [record] = await db.insert(eventLog).values({
    eventType: "DeliveryEvidenceRecorded",
    aggregateType: "delivery_signal",
    aggregateId: input.signal,
    sourceRef: input.source,
    occurredAt: new Date(observedAt),
    payload: {
      signal: input.signal,
      status: input.status,
      source: input.source,
      detail: input.detail,
      observedAt,
      refs: Array.isArray(input.refs) ? input.refs.map(String).slice(0, 10) : [],
      freshnessSeconds: Number.isFinite(Number(input.freshnessSeconds)) ? Math.max(60, Math.min(90 * 24 * 60 * 60, Number(input.freshnessSeconds))) : freshnessSeconds[input.signal],
    },
  }).returning();
  return record;
}