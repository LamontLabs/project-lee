import { createHash } from "node:crypto";
import { desc, eq, inArray } from "drizzle-orm";
import {
  db, eventLog, factLedger, graphEdge, graphNode, interpretationLedger, person, provenanceRecord, sourceChunk, sourceVault, understandingReviewItem, understandingRun, universalObject,
} from "@workspace/db";
import { extractUnderstanding } from "./understanding";

export type ImportInput = {
  filename: string; mimeType: string; content: string; metadata?: Record<string, unknown>;
  storagePath?: string; importedFrom?: Record<string, unknown>; sourceId?: string;
};

function checksum(value: string) { return createHash("sha256").update(value).digest("hex"); }

function parseContent(input: ImportInput) {
  const type = `${input.mimeType} ${input.filename}`.toLowerCase();
  if (type.includes("json")) {
    try {
      const parsed = JSON.parse(input.content) as any;
      const conversations = Array.isArray(parsed) ? parsed : parsed.conversations ?? [parsed];
      return conversations.map((conversation: any) => {
        const title = conversation.title ?? conversation.name ?? "Conversation";
        const messages = conversation.mapping ? Object.values(conversation.mapping).map((item: any) => item.message?.content?.parts?.join(" ")).filter(Boolean) : conversation.messages ?? [];
        return `${title}\n${messages.map((message: any) => typeof message === "string" ? message : `${message.role ?? "message"}: ${message.content ?? message.text ?? ""}`).join("\n")}`;
      }).join("\n\n");
    } catch { return input.content; }
  }
  if (type.includes("html") || type.includes("docx") || type.includes("pdf")) return input.content.replace(/<[^>]+>/g, " ").replace(/[^\S\r\n]+/g, " ");
  return input.content;
}

function chunkText(text: string, maxChars = 2200) {
  const paragraphs = text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs.length ? paragraphs : [text]) {
    if (current && current.length + paragraph.length + 2 > maxChars) { chunks.push(current); current = ""; }
    if (paragraph.length > maxChars) {
      for (let start = 0; start < paragraph.length; start += maxChars) chunks.push(paragraph.slice(start, start + maxChars));
    } else current = current ? `${current}\n\n${paragraph}` : paragraph;
  }
  if (current) chunks.push(current);
  return chunks;
}

async function detectEntities(text: string) {
  const [projects, people] = await Promise.all([
    db.select({ id: universalObject.id, name: universalObject.name }).from(universalObject).where(eq(universalObject.objectType, "project")),
    db.select({ id: person.id, name: person.displayName }).from(person),
  ]);
  const matchedProjects = projects.filter((item) => text.toLowerCase().includes(item.name.toLowerCase()));
  const matchedPeople = people.filter((item) => text.toLowerCase().includes(item.name.toLowerCase()));
  const decisions = [...text.matchAll(/\b(?:decided|decision|we will|approved|rejected)\b[^.!?\n]*/gi)].map((match) => match[0].trim());
  const tasks = [...text.matchAll(/\b(?:TODO|action item|follow up|follow-up|next step)\b[^.!?\n]*/gi)].map((match) => match[0].trim());
  const risks = [...text.matchAll(/\b(?:risk|blocked|concern|uncertain|threat)\b[^.!?\n]*/gi)].map((match) => match[0].trim());
  const opportunities = [...text.matchAll(/\b(?:opportunity|leverage|could|potential)\b[^.!?\n]*/gi)].map((match) => match[0].trim());
  return { projects: matchedProjects, people: matchedPeople, decisions, tasks, risks, opportunities };
}

export async function importSource(input: ImportInput) {
  const raw = parseContent(input);
  const digest = checksum(raw);
  const now = new Date();
  let source: typeof sourceVault.$inferSelect;
  if (input.sourceId) {
    const [existing] = await db.select().from(sourceVault).where(eq(sourceVault.id, input.sourceId)).limit(1);
    if (!existing) throw new Error("Source not found.");
    source = existing;
  } else {
    const [duplicate] = await db.select().from(sourceVault).where(eq(sourceVault.checksum, digest)).limit(1);
    if (duplicate) return { duplicate: true, source: duplicate, run: null, reviewCount: 0 };
    const [created] = await db.insert(sourceVault).values({
      originalFilename: input.filename, mimeType: input.mimeType, checksum: digest,
      storagePath: input.storagePath ?? `sources/${digest}`, rawContent: input.storagePath ? null : raw,
      metadata: input.metadata ?? {}, importedFrom: input.importedFrom, createdBy: "owner", currentOwner: "owner",
      processingStatus: "parsing",
    }).returning();
    if (!created) throw new Error("Source could not be created.");
    source = created;
  }
  if (input.sourceId) await db.update(sourceVault).set({ processingStatus: "parsing", updatedAt: now }).where(eq(sourceVault.id, source.id));
  await db.insert(eventLog).values({ eventType: input.sourceId ? "UnderstandingPipelineRetryStarted" : "SourceUploaded", aggregateType: "source_vault", aggregateId: source.id, sourceRef: source.id, occurredAt: now, payload: { sourceId: source.id, filename: input.filename, mimeType: input.mimeType, retry: Boolean(input.sourceId) } });
  let run: typeof understandingRun.$inferSelect | undefined;
  try {
  const chunks = chunkText(raw);
  [run] = await db.insert(understandingRun).values({ sourceType: input.mimeType, sourceRef: source.id, rawContent: raw, status: "chunking", startedAt: now, metadata: { filename: input.filename } }).returning();
  if (!run) throw new Error("Understanding run could not be created.");
  const activeRun = run;
  const chunkRows = [];
  let cursor = 0;
  for (let index = 0; index < chunks.length; index += 1) {
    const content = chunks[index];
    const startChar = raw.indexOf(content, cursor);
    const row = { sourceId: source.id, runId: run.id, chunkIndex: index, content, startChar: Math.max(0, startChar), endChar: Math.max(0, startChar) + content.length, tokenEstimate: Math.ceil(content.length / 4), checksum: checksum(content), metadata: { sourceType: input.mimeType } };
    const [chunk] = await db.insert(sourceChunk).values(row).onConflictDoNothing({ target: [sourceChunk.sourceId, sourceChunk.chunkIndex] }).returning();
    if (chunk) chunkRows.push(chunk);
    cursor = Math.max(cursor, startChar + content.length);
  }
  await db.insert(eventLog).values({ eventType: "SourceChunksCreated", aggregateType: "understanding_run", aggregateId: run.id, sourceRef: source.id, occurredAt: new Date(), payload: { runId: run.id, sourceId: source.id, chunkCount: chunkRows.length } });
  await db.update(sourceVault).set({ processingStatus: "extracting", updatedAt: new Date() }).where(eq(sourceVault.id, source.id));
  let reviewCount = 0; let factCount = 0; let interpretationCount = 0;
  const [sourceNode] = await db.insert(graphNode).values({ objectType: "source", objectId: source.id, label: input.filename, metadata: { mimeType: input.mimeType } }).onConflictDoNothing().returning();
  for (const chunk of chunkRows) {
    const entities = await detectEntities(chunk.content);
    const extraction = extractUnderstanding({ sourceType: input.mimeType, sourceRef: source.id, content: chunk.content, sourceReliability: "medium" });
    const facts = await db.insert(factLedger).values(extraction.facts.map((fact) => ({ subject: fact.subject, predicate: fact.predicate, object: fact.object, factType: "extracted", sourceEvidence: [source.id], sourceRef: source.id, confidence: fact.confidence, generatedBy: { engineId: "Understanding Pipeline", runType: "source_extraction" }, observedAt: now, firstSeen: now, status: "active", canonLevel: "candidate" }))).returning();
    const interpretations = await db.insert(interpretationLedger).values(extraction.interpretations.map((item) => ({ statement: item.statement, interpretationType: "inference", inputFacts: facts.map((fact) => fact.id), inputInterpretations: [], basis: source.id, sourceRef: source.id, confidence: item.confidence, whyChain: [{ step_type: "fact_confirmed", statement: "The interpretation is grounded in extracted facts.", evidence_id: facts[0]?.id ?? source.id, confidence: item.confidence, engine_name: "Understanding Pipeline" }, { step_type: "freshness_threshold", statement: "The source is part of the current understanding run.", evidence_id: source.id, confidence: 0.5, engine_name: "Understanding Pipeline" }], generatedBy: { engineId: "Understanding Pipeline", runType: "source_interpretation" }, validFrom: now, status: "active", canonLevel: "working", generatedByEngine: "Understanding Pipeline" }))).returning();
    factCount += facts.length; interpretationCount += interpretations.length;
    await db.insert(provenanceRecord).values([...facts.map((fact) => ({ runId: activeRun.id, recordType: "fact", recordId: fact.id, sourceRef: source.id, excerpt: chunk.content.slice(0, 500), confidence: fact.confidence })), ...interpretations.map((item) => ({ runId: activeRun.id, recordType: "interpretation", recordId: item.id, sourceRef: source.id, excerpt: chunk.content.slice(0, 500), confidence: item.confidence }))]);
    const suggestions = [
      ...entities.projects.map((item) => ({ itemType: "project", proposedValue: { id: item.id, name: item.name }, confidence: 0.9 })),
      ...entities.people.map((item) => ({ itemType: "person", proposedValue: { id: item.id, name: item.name }, confidence: 0.9 })),
      ...entities.decisions.map((value) => ({ itemType: "decision", proposedValue: { statement: value }, confidence: 0.65 })),
      ...entities.tasks.map((value) => ({ itemType: "task", proposedValue: { statement: value }, confidence: 0.6 })),
      ...entities.risks.map((value) => ({ itemType: "risk", proposedValue: { statement: value }, confidence: 0.55 })),
      ...entities.opportunities.map((value) => ({ itemType: "opportunity", proposedValue: { statement: value }, confidence: 0.5 })),
    ];
    const lockedFacts = await db.select({ subject: factLedger.subject, object: factLedger.object }).from(factLedger).where(inArray(factLedger.canonLevel, ["locked", "canonical"]));
    const contradictions = facts.filter((fact) => lockedFacts.some((existing) => existing.subject.toLowerCase() === fact.subject.toLowerCase() && existing.object.toLowerCase() !== fact.object.toLowerCase())).map((fact) => ({ itemType: "contradiction", proposedValue: { statement: `${fact.subject}: ${fact.object}`, contradiction: true }, confidence: 0.8 }));
    suggestions.push(...contradictions);
    if (suggestions.length) {
      await db.insert(understandingReviewItem).values(suggestions.map((suggestion) => ({ sourceId: source.id, runId: activeRun.id, chunkId: chunk.id, itemType: suggestion.itemType, confidence: suggestion.confidence, proposedValue: suggestion.proposedValue, evidenceExcerpt: chunk.content.slice(0, 500) })));
      reviewCount += suggestions.length;
    }
    for (const entity of [...entities.projects.map((item) => ({ type: "project", id: item.id, label: item.name })), ...entities.people.map((item) => ({ type: "person", id: item.id, label: item.name }))]) {
      const [targetNode] = await db.insert(graphNode).values({ objectType: entity.type, objectId: entity.id, label: entity.label }).onConflictDoNothing().returning();
      if (sourceNode && targetNode) await db.insert(graphEdge).values({ sourceNodeId: sourceNode.id, targetNodeId: targetNode.id, edgeType: entity.type === "project" ? "SOURCE_TOUCHES_PROJECT" : "SOURCE_MENTIONS_PERSON", confidence: 0.9, sourceRef: source.id, metadata: { chunkId: chunk.id } }).onConflictDoNothing();
    }
    await db.insert(eventLog).values({ eventType: "ChunkEntitiesDetected", aggregateType: "source_chunk", aggregateId: chunk.id, sourceRef: source.id, occurredAt: new Date(), payload: { chunkId: chunk.id, entities: { projects: entities.projects.length, people: entities.people.length, decisions: entities.decisions.length, tasks: entities.tasks.length, risks: entities.risks.length, opportunities: entities.opportunities.length }, reviewCount: suggestions.length } });
  }
  const status = reviewCount ? "reviewing" : "completed";
  const [updatedRun] = await db.update(understandingRun).set({ status, factCount, interpretationCount, completedAt: reviewCount ? null : new Date() }).where(eq(understandingRun.id, activeRun.id)).returning();
  await db.update(sourceVault).set({ processingStatus: status, updatedAt: new Date() }).where(eq(sourceVault.id, source.id));
  await db.insert(eventLog).values({ eventType: reviewCount ? "ReviewItemsCreated" : "UnderstandingPipelineCompleted", aggregateType: "understanding_run", aggregateId: activeRun.id, sourceRef: source.id, occurredAt: new Date(), payload: { runId: activeRun.id, sourceId: source.id, factCount, interpretationCount, reviewCount } });
  return { duplicate: false, source, run: updatedRun, reviewCount };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Understanding processing failed.";
    const failedAt = new Date();
    if (run) {
      await db.update(understandingRun).set({ status: "failed", completedAt: null, metadata: { ...run.metadata, error: message, failedAt: failedAt.toISOString() } }).where(eq(understandingRun.id, run.id));
    }
    await db.update(sourceVault).set({ processingStatus: "failed", updatedAt: failedAt, metadata: { ...source.metadata, processingError: message, failedAt: failedAt.toISOString() } }).where(eq(sourceVault.id, source.id));
    await db.insert(eventLog).values({ eventType: "UnderstandingPipelineFailed", aggregateType: "understanding_run", aggregateId: run?.id ?? source.id, sourceRef: source.id, occurredAt: failedAt, payload: { sourceId: source.id, runId: run?.id ?? null, error: message, storagePath: source.storagePath, importedFrom: source.importedFrom ?? null } });
    throw error;
  }
}

export async function listReviewItems(status = "needs_review") {
  return db.select().from(understandingReviewItem).where(eq(understandingReviewItem.status, status)).orderBy(desc(understandingReviewItem.createdAt)).limit(200);
}