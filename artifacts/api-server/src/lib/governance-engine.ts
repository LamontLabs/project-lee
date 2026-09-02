import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db, governanceRequest, governanceRule } from "@workspace/db";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Verdict = "ALLOW" | "HOLD" | "REJECT";

const riskTable: Record<string, RiskLevel> = {
  "model_call": "MEDIUM",
  "send_email": "HIGH",
  "send_sms": "HIGH",
  "publish_content": "HIGH",
  "share_file": "HIGH",
  "delete_source": "HIGH",
  "mark_belief_canonical": "MEDIUM",
  "change_project_status": "MEDIUM",
  "approve_export": "HIGH",
  "contact_external_person": "HIGH",
  "github_create": "HIGH",
  "drive_share": "HIGH",
  "governed_action": "MEDIUM",
  "connector_write": "HIGH",
};

export function classifyAction(actionType: string, payload: Record<string, unknown> = {}): { riskLevel: RiskLevel; known: boolean } {
  const known = Boolean(riskTable[actionType]);
  if (!known) return { riskLevel: "CRITICAL", known: false };
  const explicit = String(payload.riskLevel ?? "").toUpperCase();
  if (["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(explicit)) return { riskLevel: explicit as RiskLevel, known };
  return { riskLevel: riskTable[actionType], known };
}

export function requiresEvidence(riskLevel: RiskLevel, evidenceRefs: string[] = []) {
  return (riskLevel === "HIGH" || riskLevel === "CRITICAL") && evidenceRefs.length === 0;
}

function expiryFor(risk: RiskLevel) {
  return new Date(Date.now() + (risk === "HIGH" || risk === "CRITICAL" ? 48 : 168) * 60 * 60 * 1000);
}

export async function evaluateRules(actionType: string): Promise<{ verdict: Verdict; ruleId?: string }> {
  const rules = await db.select().from(governanceRule).where(eq(governanceRule.active, true)).orderBy(desc(governanceRule.version));
  const rule = rules.find((candidate) => candidate.actionPattern === "*" || candidate.actionPattern === actionType);
  if (!rule) return { verdict: "HOLD" };
  if (rule.ruleType === "always_allow") return { verdict: "ALLOW", ruleId: rule.id };
  if (rule.ruleType === "always_reject") return { verdict: "REJECT", ruleId: rule.id };
  return { verdict: "HOLD", ruleId: rule.id };
}

export async function registerAction(input: {
  actionType: string;
  payload: Record<string, unknown>;
  reason: string;
  evidenceRefs?: string[];
  affectedObject?: string;
  actor?: string;
}) {
  const classification = classifyAction(input.actionType, input.payload);
  const rule = await evaluateRules(input.actionType);
  const evidenceRefs = input.evidenceRefs ?? [];
  const evidenceRequired = requiresEvidence(classification.riskLevel, evidenceRefs);
  const verdict: Verdict = !classification.known || evidenceRequired ? "HOLD" : rule.verdict;
  const now = new Date();
  const [record] = await db.insert(governanceRequest).values({
    leeRequestId: randomUUID(),
    actionClass: input.actionType,
    targetSystem: String(input.payload.targetSystem ?? "lee"),
    status: verdict,
    verdict,
    riskLevel: classification.riskLevel,
    reason: input.reason,
    evidenceRefs,
    affectedObject: input.affectedObject,
    actor: input.actor ?? "lee",
    requestPayload: input.payload,
    reasonCodes: [
      ...(!classification.known ? ["UNKNOWN_ACTION_TYPE"] : []),
      ...(evidenceRequired ? ["EVIDENCE_REQUIRED"] : []),
    ],
    createdAt: now,
    expiresAt: verdict === "HOLD" ? expiryFor(classification.riskLevel) : null,
    resolvedAt: verdict === "HOLD" ? null : now,
  }).returning();
  return { record, verdict, riskLevel: classification.riskLevel, known: classification.known };
}