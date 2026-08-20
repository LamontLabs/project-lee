import { z } from "zod";
export const contractVersion = "v1";
export const engineHealthResponse = z.object({ status: z.enum(["HEALTHY", "DEGRADED", "UNAVAILABLE"]), version: z.string(), last_active: z.coerce.date(), registered_capabilities: z.array(z.string()) });
export const capabilityList = z.object({ engine_id: z.string(), engine_name: z.string(), version: z.string(), status: z.string(), owner: z.string(), capabilities: z.array(z.string()), dependencies: z.array(z.string()), inputs: z.record(z.array(z.string())), outputs: z.record(z.array(z.string())) });
const empty = z.object({}).passthrough();
export const internalContracts: Record<string, Record<string, z.ZodTypeAny>> = {
  memory: { remember: z.object({ input: z.unknown() }), forget: z.object({ object_id: z.string(), reason: z.string() }), retrieve: z.object({ spec: z.record(z.unknown()) }), promote: z.object({ object_id: z.string(), target_tier: z.string() }), archive: z.object({ object_id: z.string(), reason: z.string() }), summarize_tier: z.object({ tier: z.string() }) },
  query: { query: z.object({ spec: z.record(z.unknown()) }), explain_query: z.object({ spec: z.record(z.unknown()) }), flush_cache: z.object({ query_type: z.string() }) },
  strategy: { evaluate: z.object({ objective_id: z.string() }), prioritize: z.object({ objective_ids: z.array(z.string()) }), recommend: z.object({ context: z.record(z.unknown()) }), refresh: z.object({ objective_id: z.string() }) },
  reflection: { compare: z.object({ period_a: z.string(), period_b: z.string() }), summarize: z.object({ period: z.string() }), trend: z.object({ metric: z.string(), period: z.string() }) },
  simulation: { run: z.object({ scenario_spec: z.record(z.unknown()) }), compare_scenarios: z.object({ spec_a: z.record(z.unknown()), spec_b: z.record(z.unknown()) }), what_if: z.object({ assumption_changes: z.record(z.unknown()) }) },
  explanation: { explain: z.object({ object_id: z.string(), explanation_type: z.string(), audience_profile: z.string() }), invalidate: z.object({ object_id: z.string() }) },
  intent: { classify: z.object({ raw_input: z.string(), session_context: z.record(z.unknown()).optional() }), correct: z.object({ intent_id: z.string(), correction: z.record(z.unknown()) }) },
  state: { get_state: empty, transition: z.object({ new_state: z.string(), reason: z.string() }) },
  policy: { check: z.object({ policy_type: z.string(), action: z.string(), context: z.record(z.unknown()) }), get_policy: z.object({ policy_type: z.string() }), update_policy: z.object({ policy_type: z.string(), values: z.record(z.unknown()), reason: z.string() }) },
};