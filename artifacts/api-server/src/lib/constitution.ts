import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { constitutionConsultation, constitutionProvision, constitutionVersion, constitutionViolation, db, eventLog, governanceRequest } from "@workspace/db";
const STARTER = [
  ["security", "Human approval for consequential actions", "Lee never executes a consequential external action without human review.", "ABSOLUTE", ["Governance Engine", "Connector Engine"]],
  ["privacy", "Privacy is absolute", "Private founder data is never exposed to public or external surfaces.", "ABSOLUTE", ["All Engines"]],
  ["evidence", "Raw sources are preserved", "Raw source material is retained permanently and is never silently replaced.", "ABSOLUTE", ["Understanding Pipeline", "Backup Engine"]],
  ["reality", "Reality ledger is append-only", "Facts and reality observations are amended with provenance, not overwritten.", "ABSOLUTE", ["Understanding Pipeline"]],
  ["portability", "Replit-first but portable", "Lee remains exportable and restorable outside any single runtime.", "CONFIGURABLE", ["Backup Engine"]],
  ["models", "Models are interchangeable", "No user-facing behavior may depend on one model provider being permanently available.", "CONFIGURABLE", ["Model Router"]],
  ["cost", "No silent cost accumulation", "Reasoning spend is recorded before or with model execution.", "GOVERNED", ["Model Router", "Cost Engine"]],
  ["governance", "Unavailable governance fails closed", "A missing or unavailable governance verdict cannot release action.", "ABSOLUTE", ["Governance Engine"]],
  ["truth", "Facts and interpretations remain distinct", "Inference must not be presented as a source-backed fact.", "ABSOLUTE", ["Understanding Pipeline", "Context Engine"]],
  ["audit", "Significant actions are auditable", "Consultations, approvals, violations, and amendments are logged.", "GOVERNED", ["All Engines"]],
  ["owner", "Owner controls amendments", "Only the founder can propose and approve constitution amendments.", "ABSOLUTE", ["Governance Engine"]],
  ["memory", "Canon promotion requires evidence", "Canonical status requires explicit provenance and review.", "GOVERNED", ["Memory Architecture Engine"]],
  ["context", "Context is source-backed", "Context packets prefer current, relevant, and provenance-linked material.", "GOVERNED", ["Context Engine"]],
  ["learning", "Learning is owner-specific", "Behavioral learning never crosses owner boundaries.", "ABSOLUTE", ["Learning Engine"]],
  ["connectors", "External writes require authorization", "Connector reads may sync; external writes require explicit authorization.", "ABSOLUTE", ["Connector Engine"]],
  ["backup", "Backups are verified", "A Brain export is not complete without checksum verification.", "GOVERNED", ["Backup Engine"]],
  ["safety", "No silent destructive action", "Deletion or irreversible change requires an explicit governed decision.", "ABSOLUTE", ["All Engines"]],
  ["explanation", "Recommendations show reasoning", "Recommendations expose evidence, uncertainty, and constraints.", "GOVERNED", ["Explanation Engine", "Brief Engine"]],
  ["continuity", "History is retained", "Constitution versions and consultation history are never pruned automatically.", "ABSOLUTE", ["Backup Engine"]],
  ["precedence", "Constitution outranks configuration", "Runtime settings and engine heuristics cannot contradict ABSOLUTE provisions.", "ABSOLUTE", ["All Engines"]],
  ["provenance", "No object appears without provenance", "Nothing appears in the Lee console without a provenance link; unverified legacy records are explicitly flagged.", "ABSOLUTE", ["All Engines"]],
] as const;
export async function ensureConstitution() {
  const existing = await db.select().from(constitutionProvision);
  const legacyCategories: Record<string, string> = { working_memory_decay: "memory", internal_namespace_private: "privacy", event_log_append_only: "audit", anchors_not_contradicted: "strategy", embeddings_local: "models", recommendations_explainable: "explanation", provenance_non_negotiable: "evidence", session_timeout: "privacy", owner_confirmation: "owner", service_databases_private: "privacy", identity_first: "precedence", no_silent_failures: "safety", facts_interpretations_separate: "truth", external_writes_authorized: "connectors", provider_abstraction: "models", brief_item_limit: "context", connector_sync_interval: "connectors", governance_fail_closed: "governance", credentials_never_logged: "security", bootstrap_no_secrets: "security" };
  if (existing.length) {
    if (!existing.some((row) => row.key === "provenance.no_object_without_source")) {
      const provision = STARTER.find((item) => item[0] === "provenance");
      if (provision) await db.insert(constitutionProvision).values({ key: "provenance.no_object_without_source", title: provision[1], tier: provision[3], appliesToEngines: [...provision[4]], machineReadableRule: { category: provision[0], ruleText: provision[2], actionTags: ["provenance"], blocksIf: true } }).onConflictDoNothing();
    }
    for (const row of existing) {
      if (Object.keys(row.machineReadableRule).length === 0) {
        const category = legacyCategories[row.key] ?? "general";
        const starter = STARTER.find((item) => item[0] === category);
        await db.update(constitutionProvision).set({ machineReadableRule: { category, ruleText: starter?.[2] ?? row.title, actionTags: [category] }, appliesToEngines: ["All Engines"], updatedAt: new Date() }).where(eq(constitutionProvision.id, row.id));
      }
    }
    const versions = await db.select({ id: constitutionVersion.id }).from(constitutionVersion).limit(1);
    if (!versions.length) await db.insert(constitutionVersion).values({ version: "1", provisions: existing as unknown as Record<string, unknown>[], amendmentReason: "Initial Lee Constitution", createdAt: new Date() });
    return;
  }
  const now = new Date();
  const rows = await db.insert(constitutionProvision).values(STARTER.map(([category, title, ruleText, tier, engines]) => ({ key: `${category}.${title.toLowerCase().replaceAll(" ", "_")}`, title, tier, appliesToEngines: [...engines], machineReadableRule: { category, ruleText, actionTags: [category], blocksIf: tier === "ABSOLUTE" } }))).returning();
  await db.insert(constitutionVersion).values({ version: "1", provisions: rows as unknown as Record<string, unknown>[], amendmentReason: "Initial Lee Constitution", createdAt: now });
  await db.insert(eventLog).values({ eventType: "ConstitutionSeeded", aggregateType: "constitution", aggregateId: rows[0].id, sourceRef: "constitution-engine", occurredAt: now, payload: { provisionCount: rows.length, version: 1 } });
}
export async function checkConstitution(actionType: string, payload: Record<string, unknown> = {}, engineName = "unknown") {
  await ensureConstitution();
  const provisions = await db.select().from(constitutionProvision).where(eq(constitutionProvision.active, true));
  const tags = `${actionType} ${engineName} ${JSON.stringify(payload)}`.toLowerCase();
  const applicable = provisions.filter((item) => item.appliesToEngines.some((engine) => engine === "All Engines" || engine.toLowerCase().includes(engineName.toLowerCase())) || Object.keys(item.machineReadableRule).some((key) => tags.includes(key.toLowerCase())));
  const blocked = applicable.find((item) => item.tier === "ABSOLUTE" && ((item.machineReadableRule.category === "security" && /external|send|execute/.test(tags)) || (item.machineReadableRule.category === "safety" && /delete|destroy|irreversible/.test(tags))));
  const constraints = applicable.filter((item) => item.tier !== "ABSOLUTE").map((item) => String(item.machineReadableRule.ruleText ?? item.title));
  const [consultation] = await db.insert(constitutionConsultation).values({ actionType, engineName, payload, permitted: !blocked, overrideRequired: applicable.some((item) => item.tier === "GOVERNED"), applicableProvisionIds: applicable.map((item) => item.id), constraints }).returning();
  for (const item of applicable) await db.update(constitutionProvision).set({ consultationCount: item.consultationCount + 1 }).where(eq(constitutionProvision.id, item.id));
  if (blocked) {
    const [violation] = await db.insert(constitutionViolation).values({ consultationId: consultation.id, actionType, reason: String(blocked.machineReadableRule.ruleText ?? blocked.title) }).returning();
    await db.insert(eventLog).values({ eventType: "ConstitutionViolation", aggregateType: "constitution_violation", aggregateId: violation.id, sourceRef: "constitution-engine", occurredAt: new Date(), payload: { actionType, engineName, provisionId: blocked.id, severity: "CRITICAL" } });
  }
  return { permitted: !blocked, applicableProvisions: applicable, constraints, overrideRequired: consultation.overrideRequired, consultationId: consultation.id };
}
export async function constitutionStatus() { await ensureConstitution(); const [provisions, versions, consultations, violations] = await Promise.all([db.select().from(constitutionProvision).where(eq(constitutionProvision.active, true)).orderBy(desc(constitutionProvision.title)), db.select().from(constitutionVersion).orderBy(desc(constitutionVersion.createdAt)), db.select().from(constitutionConsultation).orderBy(desc(constitutionConsultation.createdAt)).limit(100), db.select().from(constitutionViolation).orderBy(desc(constitutionViolation.createdAt)).limit(50)]); return { provisions: provisions.map((item) => ({ ...item, category: String(item.machineReadableRule.category ?? "general"), ruleText: String(item.machineReadableRule.ruleText ?? item.title), version: 1 })), versions, consultations, violations }; }
export async function proposeAmendment(input: { reason: string; provisions: Record<string, unknown> }) {
  const [request] = await db.insert(governanceRequest).values({ leeRequestId: randomUUID(), actionClass: "constitution_amendment", targetSystem: "constitution", status: "HOLD", riskLevel: "CRITICAL", reason: input.reason, requestPayload: input.provisions, actor: "founder", expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) }).returning();
  await db.insert(eventLog).values({ eventType: "ConstitutionAmendmentProposed", aggregateType: "governance_request", aggregateId: request.id, sourceRef: "constitution-engine", occurredAt: new Date(), payload: { reason: input.reason, riskLevel: "CRITICAL" } });
  return request;
}