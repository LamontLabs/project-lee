import { randomUUID } from "node:crypto";
import { buildContextPacket, type ContextBuildOptions, type ConversationMode } from "./context-engine";
import { checkConstitution } from "./constitution";
import { consultIdentity } from "./identity";
import { classifyIntent } from "./intent";
import { emitEvent } from "./foundation-events";
import type { ConnectedEmailProvider } from "./email-provider";

export const REQUEST_PIPELINE_STAGES = ["identity", "constitution", "intent", "context"] as const;
export type RequestPipelineStage = typeof REQUEST_PIPELINE_STAGES[number];
export type RequestOrigin = "console" | "android" | "api" | "executive_loop" | "scheduled" | "internal" | "proactive";
export type RequestPipelineInput = {
  text: string;
  origin: RequestOrigin;
  actionType?: string;
  engineName?: string;
  payload?: Record<string, unknown>;
  mode?: ConversationMode;
  budgetTokens?: number;
  sessionId?: string;
  correlationId?: string;
};
export type RequestPipelineDependencies = {
  context?: ContextBuildOptions;
};
export type RequestPipelineSuccess = {
  ok: true;
  correlationId: string;
  identity: Awaited<ReturnType<typeof consultIdentity>>;
  constitution: Awaited<ReturnType<typeof checkConstitution>>;
  intent: Awaited<ReturnType<typeof classifyIntent>>;
  context: Awaited<ReturnType<typeof buildContextPacket>>;
  stages: RequestPipelineStage[];
};
export type RequestPipelineFailure = {
  ok: false;
  correlationId: string;
  failedStage: RequestPipelineStage;
  error: string;
  stages: RequestPipelineStage[];
};
export type RequestPipelineResult = RequestPipelineSuccess | RequestPipelineFailure;

class PipelineStageFailure extends Error {
  constructor(public readonly stage: RequestPipelineStage, message: string) {
    super(message);
  }
}

async function pipelineEvent(eventType: "RequestPipelineStageStarted" | "RequestPipelineStageCompleted" | "RequestPipelineFailed", input: RequestPipelineInput, payload: Record<string, unknown>) {
  try {
    const sessionId = input.sessionId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.sessionId) ? input.sessionId : undefined;
    await emitEvent({
      eventType,
      aggregateType: "request_pipeline",
      aggregateId: input.correlationId ?? "request-pipeline",
      correlationId: input.correlationId,
      sessionId,
      sourceRef: `request-pipeline:${input.origin}`,
      payload: { origin: input.origin, actionType: input.actionType ?? "request", ...payload },
    });
  } catch (error) {
    throw new Error(`Pipeline audit write failed for ${eventType}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function runRequestPipeline(input: RequestPipelineInput, dependencies: RequestPipelineDependencies = {}): Promise<RequestPipelineResult> {
  const text = input.text.trim();
  const correlationId = input.correlationId ?? randomUUID();
  const stages: RequestPipelineStage[] = [];
  const request = { ...input, text, correlationId };
  const runStage = async <T>(stage: RequestPipelineStage, operation: () => Promise<T>): Promise<T> => {
    await pipelineEvent("RequestPipelineStageStarted", request, { stage, stageNumber: REQUEST_PIPELINE_STAGES.indexOf(stage) + 1 });
    try {
      const value = await operation();
      stages.push(stage);
      await pipelineEvent("RequestPipelineStageCompleted", request, { stage, stageNumber: REQUEST_PIPELINE_STAGES.indexOf(stage) + 1 });
      return value;
    } catch (error) {
      throw new PipelineStageFailure(stage, error instanceof Error ? error.message : String(error));
    }
  };

  try {
    if (!text) throw new PipelineStageFailure("identity", "Request text is required.");
    const identity = await runStage("identity", () => consultIdentity());
    const constitution = await runStage("constitution", async () => {
      const result = await checkConstitution(input.actionType ?? "request", input.payload ?? {}, input.engineName ?? input.origin);
      if (!result.permitted) throw new Error("Constitution blocked this request.");
      return result;
    });
    const intent = await runStage("intent", () => classifyIntent(text, { origin: input.origin }, input.origin, input.sessionId));
    const context = await runStage("context", () => buildContextPacket(text, input.mode ?? "normal", input.budgetTokens ?? 3000, intent, dependencies.context));
    return { ok: true, correlationId, identity, constitution, intent, context, stages };
  } catch (error) {
    const failedStage = error instanceof PipelineStageFailure ? error.stage : stages.length < REQUEST_PIPELINE_STAGES.length ? REQUEST_PIPELINE_STAGES[stages.length] : "identity";
    const message = error instanceof Error ? error.message : String(error);
    await pipelineEvent("RequestPipelineFailed", request, { failedStage, completedStages: stages, error: message });
    return { ok: false, correlationId, failedStage, error: message, stages };
  }
}

export function pipelineFailureResponse(result: RequestPipelineFailure) {
  return { error: "Request stopped by the universal processing pipeline.", pipeline: { correlationId: result.correlationId, failedStage: result.failedStage, completedStages: result.stages, reason: result.error } };
}