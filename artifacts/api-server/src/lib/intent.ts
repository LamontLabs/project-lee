import { and, desc, eq } from "drizzle-orm";
import { costRecord, db, eventLog, intentRecord, universalObject } from "@workspace/db";
import { recordCorrection } from "./learning";
import type { EmailSearchFilters } from "./email-provider";
const TYPES = ["question_factual", "question_exploratory", "explanation_seeking", "recommendation_request", "simulation_request", "strategy_request", "draft_request", "review_request", "capture_input", "approval_action", "governance_action", "navigation_request", "status_check", "configuration_change"] as const;
function classifyType(text: string) {
  const input = text.toLowerCase();
  if (/explain|why does|how did|walk me through|what led/.test(input)) return "explanation_seeking";
  if (/simulate|scenario|what if|model the outcome/.test(input)) return "simulation_request";
  if (/recommend|should i|what would you suggest/.test(input)) return "recommendation_request";
  if (/strategy|strategic|long.term/.test(input)) return "strategy_request";
  if (isEmailSearchRequest(input)) return /related|everything|conversation|mentioned|concern|thread/.test(input) ? "question_exploratory" : "question_factual";
  if (/draft|write|compose|email|message/.test(input)) return "draft_request";
  if (/review|critique|audit/.test(input)) return "review_request";
  if (/capture|remember|save this|log this/.test(input)) return "capture_input";
  if (/approve|approval|release|send|execute/.test(input)) return "approval_action";
  if (/configure|settings|policy|change the mode/.test(input)) return "configuration_change";
  if (/status|health|how are we doing|progress/.test(input)) return "status_check";
  if (/\bwhat\b|\bwho\b|\bwhen\b|\bwhere\b|\bhow many\b|\bis there\b/.test(input)) return /related|everything|conversation|mentioned|concern/.test(input) ? "question_exploratory" : "question_factual";
  return "question_exploratory";
}

function isoDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date.toISOString().slice(0, 10)
    : null;
}

function parseDate(value: string, reference = new Date()) {
  const normalized = value.trim().toLowerCase().replaceAll(",", "");
  if (normalized === "today") return reference.toISOString().slice(0, 10);
  if (normalized === "yesterday") {
    const date = new Date(reference);
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
  }
  const iso = normalized.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) return isoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const numeric = normalized.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (numeric) {
    const year = Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]);
    return isoDate(year, Number(numeric[1]), Number(numeric[2]));
  }
  const named = normalized.match(/^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:\s+(\d{4}))?$/);
  if (named) {
    const month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].findIndex((prefix) => named[1].startsWith(prefix)) + 1;
    return isoDate(Number(named[3] ?? reference.getUTCFullYear()), month, Number(named[2]));
  }
  return null;
}

function dateTokenPattern() {
  return String.raw`(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?)`;
}

function removeStopWords(text: string) {
  return text
    .replace(/[?.,!]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 2 && !/^(what|when|where|which|who|have|has|did|does|can|could|would|please|show|find|search|look|check|tell|about|email|emails|gmail|inbox|mailbox|thread|threads|latest|received|from|with|my|me|the|and|for|between|after|before|since|subject|unread|read|on|to|this|that|is|are)$/i.test(term))
    .join(" ")
    .trim();
}

export function parseEmailSearchFilters(rawInput: string, reference = new Date()): EmailSearchFilters {
  let remainder = rawInput.trim();
  const filters: EmailSearchFilters = {};
  const remove = (match: RegExpMatchArray | null) => {
    if (match) remainder = remainder.replace(match[0], " ");
    return match;
  };
  if (/\bunread\b/i.test(remainder)) {
    filters.unread = true;
    remainder = remainder.replace(/\bunread\b/gi, " ");
  } else if (/\b(?:read|already read)\s+(?:emails?|messages?|mail)\b/i.test(remainder)) {
    filters.unread = false;
    remainder = remainder.replace(/\b(?:read|already read)\s+(?:emails?|messages?|mail)\b/gi, " ");
  }

  const datePattern = dateTokenPattern();
  const range = remove(remainder.match(new RegExp(`\\b(?:between|from)\\s+(${datePattern})\\s+(?:and|to|through|-)\\s+(${datePattern})`, "i")));
  if (range) {
    const after = parseDate(range[1], reference);
    const before = parseDate(range[2], reference);
    if (after) filters.after = after;
    if (before) filters.before = before;
  } else {
    const dates = [...remainder.matchAll(new RegExp(datePattern, "gi"))]
      .map((match) => ({ value: match[0], date: parseDate(match[0], reference), index: match.index ?? 0 }))
      .filter((item): item is { value: string; date: string; index: number } => Boolean(item.date));
    if (dates.length >= 2) {
      filters.after = dates[0].date;
      filters.before = dates[1].date;
      remainder = remainder.replace(dates[0].value, " ").replace(dates[1].value, " ");
    } else if (dates.length === 1) {
      const nearby = remainder.slice(Math.max(0, dates[0].index - 12), dates[0].index).toLowerCase();
      if (/\b(?:before|until|through|to)\s*$/.test(nearby)) filters.before = dates[0].date;
      else filters.after = filters.before = dates[0].date;
      remainder = remainder.replace(dates[0].value, " ");
    }
  }

  const sender = remove(remainder.match(/\b(?:from|sent by|sender(?: is)?)\s+(.+?)(?=\s+\b(?:from|between|after|before|since|on|subject|with subject|about|unread|read|to)\b|[?!,]|$)/i));
  if (sender?.[1]) filters.sender = sender[1].trim().replace(/^["']|["']$/g, "");
  const subject = remove(remainder.match(/\b(?:subject|with subject|about)\s*(?:is|=|:)?\s*(?:"([^"]+)"|'([^']+)'|(.+?))(?=\s+\b(?:from|between|after|before|since|on|unread|read)\b|[?!]|$)/i));
  if (subject) filters.subject = (subject[1] ?? subject[2] ?? subject[3] ?? "").trim();
  const text = removeStopWords(remainder);
  if (text) filters.text = text;
  return filters;
}

function isEmailSearchRequest(text: string) {
  const referencesEmail = /\b(email|emails|gmail|inbox|mailbox|thread|threads)\b/.test(text);
  const asksToRead = /\?|what|who|when|where|which|whether|find|search|show|look up|check|latest|unread|received/.test(text);
  const asksToWrite = /\bdraft\b|\bcompose\b|\bwrite\b|\breply\b|\bforward\b|^\s*send\b/.test(text);
  return referencesEmail && asksToRead && !asksToWrite;
}

function persistEmailSearchFilters(filters: EmailSearchFilters | undefined) {
  if (!filters) return null;
  return {
    ...(typeof filters.text === "string" && filters.text ? { text: filters.text } : {}),
    ...(typeof filters.sender === "string" && filters.sender ? { sender: filters.sender } : {}),
    ...(typeof filters.subject === "string" && filters.subject ? { subject: filters.subject } : {}),
    ...(typeof filters.after === "string" && filters.after ? { after: filters.after } : {}),
    ...(typeof filters.before === "string" && filters.before ? { before: filters.before } : {}),
    ...(typeof filters.unread === "boolean" ? { unread: filters.unread } : {}),
  };
}

export async function classifyIntent(rawInput: string, sessionContext: Record<string, unknown> = {}, source = "ask_lee", sessionId?: string) {
  const text = rawInput.trim(); if (!text) throw new Error("rawInput is required.");
  const objects = await db.select({ id: universalObject.id, objectType: universalObject.objectType, name: universalObject.name, description: universalObject.description }).from(universalObject).limit(500);
  const lower = text.toLowerCase(); const matches = objects.filter((object) => lower.includes(object.name.toLowerCase()) || (object.description && lower.includes(object.description.toLowerCase()))); const emailSearch = isEmailSearchRequest(lower); const intentType = classifyType(text);
  const confidence = Math.min(0.98, 0.58 + (matches.length ? 0.15 : 0) + (text.includes("?") ? 0.1 : 0)); const explanation = intentType === "explanation_seeking" ? "object" : null; const retrievalMode = intentType === "question_exploratory" || intentType === "explanation_seeking" ? "semantic" : intentType === "capture_input" ? "none" : "structured"; const complexity = /complex|compare|tradeoff|deep|architecture|strategy/.test(lower) ? "strong" : text.length > 240 ? "mid" : "cheap";
  const subtype = emailSearch ? "email_search" : sessionContext.subtype ? String(sessionContext.subtype) : null;
  const emailFilters = emailSearch ? parseEmailSearchFilters(text) : undefined;
  const persistedEmailFilters = persistEmailSearchFilters(emailFilters);
  const effectiveRetrievalMode = emailSearch ? "semantic" : retrievalMode;
  const [created] = await db.insert(intentRecord).values({ rawInput: text, intentType, intentSubtype: subtype, emailFilters: persistedEmailFilters, detectedProjectIds: matches.filter((item) => /project|initiative/i.test(item.objectType)).map((item) => item.id), detectedPersonIds: matches.filter((item) => /person|relationship/i.test(item.objectType)).map((item) => item.id), detectedObjectIds: matches.map((item) => item.id), audienceProfile: /investor|board/.test(lower) ? "Investor" : /developer|technical|code/.test(lower) ? "Technical" : "Founder", urgency: /urgent|asap|today|critical/.test(lower) ? "time_sensitive" : "routine", requiresModel: !["capture_input", "navigation_request"].includes(intentType), modelComplexityEstimate: complexity, retrievalMode: effectiveRetrievalMode, explanationType: explanation, confidence, source, sessionId }).returning();
  await db.insert(costRecord).values({ correlationId: created.id, engine: "Intent Engine", provider: "local", tier: "T1", model: "local-rule-classifier", promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0, latencyMs: 0, cacheHit: false, metadata: { modelVersion: "intent-rules-v1" } });
  await db.insert(eventLog).values({ eventType: "IntentClassified", aggregateType: "intent", aggregateId: created.id, sourceRef: "intent-engine", occurredAt: new Date(), payload: { intentType, intentSubtype: subtype, confidence, retrievalMode: effectiveRetrievalMode, source, detectedObjectCount: matches.length } });
  return created;
}
export async function correctIntent(id: string, correctedType: string, requester = "founder") {
  if (!(TYPES as readonly string[]).includes(correctedType)) throw new Error("Invalid intent type.");
  const [current] = await db.select().from(intentRecord).where(eq(intentRecord.id, id)).limit(1); if (!current) return null;
  const [updated] = await db.update(intentRecord).set({ intentType: correctedType, correctionCount: current.correctionCount + 1, confidence: 1 }).where(eq(intentRecord.id, id)).returning();
  await recordCorrection({ engineName: "Intent Engine", originalOutput: current.intentType, correctedOutput: correctedType, correctionType: "classification", category: "intent_type", contextSnapshot: { intentId: id, requester, rawInput: current.rawInput } });
  await db.insert(eventLog).values({ eventType: "IntentCorrected", aggregateType: "intent", aggregateId: id, sourceRef: "intent-engine", occurredAt: new Date(), payload: { from: current.intentType, to: correctedType, requester } }); return updated;
}
export async function intentHistory(limit = 100) { return db.select().from(intentRecord).orderBy(desc(intentRecord.createdAt)).limit(limit); }