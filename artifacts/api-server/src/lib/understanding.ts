type UnderstandingInput = {
  sourceType: string;
  sourceRef: string;
  sourceReliability?: "high" | "medium" | "low";
  content: string;
  metadata?: Record<string, unknown>;
};

export type ExtractedFact = {
  subject: string;
  predicate: string;
  object: string;
  excerpt: string;
  confidence: number;
};

export type ExtractedInterpretation = {
  statement: string;
  basis: string;
  excerpt: string;
  confidence: number;
};

export type ExtractionResult = {
  facts: ExtractedFact[];
  interpretations: ExtractedInterpretation[];
};

const reliabilityConfidence = {
  high: 0.9,
  medium: 0.7,
  low: 0.45,
} as const;

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function parseFactLine(line: string, confidence: number): ExtractedFact | null {
  const body = clean(line.replace(/^fact\s*:\s*/i, ""));
  const parts = body.split(/\s*[|—]\s*/).map(clean).filter(Boolean);
  if (parts.length >= 3) {
    return {
      subject: parts[0],
      predicate: parts[1],
      object: parts.slice(2).join(" — "),
      excerpt: line.trim(),
      confidence,
    };
  }

  if (body.length > 0) {
    return {
      subject: "source",
      predicate: "contains",
      object: body,
      excerpt: line.trim(),
      confidence: Math.max(0.35, confidence - 0.1),
    };
  }

  return null;
}

export function extractUnderstanding(input: UnderstandingInput): ExtractionResult {
  const baseConfidence = reliabilityConfidence[input.sourceReliability ?? "medium"];
  const lines = input.content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const facts: ExtractedFact[] = [];
  const interpretations: ExtractedInterpretation[] = [];

  for (const line of lines) {
    if (/^(fact|observation)\s*:/i.test(line)) {
      const fact = parseFactLine(line, baseConfidence);
      if (fact) facts.push(fact);
      continue;
    }

    if (/^(interpretation|inference|meaning)\s*:/i.test(line)) {
      const statement = clean(line.replace(/^(interpretation|inference|meaning)\s*:\s*/i, ""));
      if (statement) {
        interpretations.push({
          statement,
          basis: input.sourceRef,
          excerpt: line,
          confidence: Math.max(0.25, baseConfidence - 0.1),
        });
      }
      continue;
    }

    const fact = parseFactLine(line, Math.max(0.35, baseConfidence - 0.15));
    if (fact) facts.push(fact);
  }

  if (facts.length === 0) {
    facts.push({
      subject: input.sourceRef,
      predicate: "content captured",
      object: `${lines.length} non-empty line${lines.length === 1 ? "" : "s"} received`,
      excerpt: input.content.slice(0, 500),
      confidence: baseConfidence,
    });
  }

  if (interpretations.length === 0) {
    interpretations.push({
      statement: `The source contains material that should be reviewed in context before becoming a stronger conclusion.`,
      basis: input.sourceRef,
      excerpt: input.content.slice(0, 500),
      confidence: Math.max(0.25, baseConfidence - 0.25),
    });
  }

  return { facts, interpretations };
}