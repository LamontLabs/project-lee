import { z } from "zod";

export const CONTRACT_VERSION = "1.0.0";
export const universalSystemRegistrationSchema = z.object({
  systemId: z.string().regex(/^[a-z0-9][a-z0-9-]{1,39}$/),
  displayName: z.string().min(1).max(120),
  category: z.string().min(1).max(32),
  baseUrl: z.string().url(),
  apiVersion: z.string().regex(/^v\d+$/).optional(),
  healthEndpoint: z.string().regex(/^\/[a-zA-Z0-9/_-]*$/).optional(),
  failurePolicy: z.enum(["graceful_degradation", "fail_closed"]).optional(),
  credentialEnvKey: z.string().regex(/^[A-Z][A-Z0-9_]{2,119}$/).optional(),
  credentialHeader: z.enum(["authorization", "x-api-key", "x-goog-api-key"]).optional(),
  requestEnvelope: z.enum(["contract", "direct"]).optional(),
  capabilities: z.array(z.string().min(1).max(120)).max(100),
});
export const universalSystemCallSchema = z.object({
  path: z.string().regex(/^\/[a-zA-Z0-9/_-]*$/),
  payload: z.record(z.unknown()).default({}),
  correlationId: z.string().min(1).optional(),
  method: z.enum(["GET", "POST"]).default("POST"),
  timeoutMs: z.number().int().positive().max(120_000).optional(),
});
export const availabilityState = z.enum(["available", "degraded", "unavailable", "offline"]);
export const freshnessState = z.enum(["live", "cached", "uncertain"]);
export const measurementState = z.enum(["MEASURED", "ESTIMATED", "UNAVAILABLE"]);

export const evidenceRef = z.object({
  source: z.string().min(1),
  kind: z.enum(["record", "probe", "event", "schema", "provenance", "derived"]),
  state: freshnessState,
  observedAt: z.string().datetime().nullable(),
});

const posture = z.object({
  state: availabilityState,
  freshness: freshnessState,
  reason: z.string().nullable(),
  evidence: z.array(evidenceRef),
});

export const systemContractSchema = z.object({
  contractVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
  generatedAt: z.string().datetime(),
  identity: z.object({
    name: z.literal("Project LEE"),
    version: z.string().nullable(),
    displayName: z.string().nullable(),
    profileVersion: z.number().nullable(),
  }),
  runtime: posture.extend({
    environment: z.enum(["development", "production", "unknown"]),
    operationalState: z.string().nullable(),
    recoveryMode: z.string().nullable(),
  }),
  health: posture.extend({
    overall: z.enum(["nominal", "degraded", "critical"]),
    dependenciesAvailable: z.number().int().nonnegative(),
    dependenciesTotal: z.number().int().nonnegative(),
  }),
  capabilities: z.array(posture.extend({
    id: z.string(),
    engineId: z.string(),
    name: z.string(),
  })),
  connectedSystems: z.array(posture.extend({
    id: z.string(),
    name: z.string(),
    authority: z.string(),
    contractVersion: z.string(),
  })),
  schemas: z.record(z.unknown()),
  events: z.object({
    version: z.string(),
    catalog: z.array(z.object({ type: z.string(), version: z.string() })),
    appendOnly: z.boolean(),
    source: z.string(),
  }),
  permissions: z.object({
    owner: z.array(z.string()),
    internalServices: z.array(z.string()),
    externalWrites: z.array(z.string()),
    source: z.string(),
  }),
  risk: z.object({
    levels: z.array(z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])),
    actionClasses: z.record(z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])),
    unknownAction: z.enum(["HOLD", "REJECT"]),
    source: z.string(),
  }),
  governance: z.object({
    verdicts: z.array(z.enum(["ALLOW", "HOLD", "REJECT"])),
    failClosed: z.boolean(),
    unavailableVerdict: z.enum(["HOLD", "REJECT"]),
    evidenceRequiredFor: z.array(z.enum(["HIGH", "CRITICAL"])),
    source: z.string(),
  }),
  humanConfirmation: z.object({
    requiredFor: z.array(z.string()),
    methods: z.array(z.string()),
    pendingState: z.literal("HOLD"),
    source: z.string(),
  }),
  economics: z.object({
    statuses: z.record(z.string()),
    dimensions: z.array(z.string()),
    totalCostUsd: z.number().nullable(),
    totalCostStatus: measurementState,
    source: z.string(),
  }),
  dependencies: z.array(posture.extend({
    id: z.string(),
    required: z.boolean(),
  })),
  evidenceMap: z.record(z.array(evidenceRef)),
  validation: z.object({
    result: z.enum(["PASS", "WARN"]),
    checks: z.array(z.object({
      name: z.string(),
      result: z.enum(["PASS", "WARN", "FAIL"]),
      detail: z.string(),
    })),
  }),
});

export type SystemContract = z.infer<typeof systemContractSchema>;