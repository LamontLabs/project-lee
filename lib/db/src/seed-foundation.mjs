import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const provisions = [
  ["provenance_non_negotiable", "Provenance is non-negotiable", "ABSOLUTE"],
  ["internal_namespace_private", "The internal namespace is never exposed externally", "ABSOLUTE"],
  ["embeddings_local", "Semantic Index embeddings remain local", "ABSOLUTE"],
  ["no_silent_failures", "Failures must be explicit", "ABSOLUTE"],
  ["event_log_append_only", "The Event Log is append-only", "ABSOLUTE"],
  ["facts_interpretations_separate", "Facts and Interpretations are never mixed", "ABSOLUTE"],
  ["provider_abstraction", "Engine code does not reference providers by name", "ABSOLUTE"],
  ["bootstrap_no_secrets", "Bootstrap never reads secret values", "ABSOLUTE"],
  ["governance_fail_closed", "CerbaSeal is fail-closed", "ABSOLUTE"],
  ["service_databases_private", "LEE never directly accesses CIL or CerbaSeal databases", "ABSOLUTE"],
  ["credentials_never_logged", "Capability-service credentials are never logged or persisted", "ABSOLUTE"],
  ["anchors_not_contradicted", "Strategic Anchors are never silently contradicted", "ABSOLUTE"],
  ["identity_first", "Identity is consulted before Constitution on every request", "ABSOLUTE"],
  ["owner_confirmation", "Owner confirmation is required for consequential profile changes", "GOVERNED"],
  ["external_writes_authorized", "External writes require explicit governance authorization", "GOVERNED"],
  ["recommendations_explainable", "Recommendations include evidence and rationale", "GOVERNED"],
  ["working_memory_decay", "Working memory may age when evidence becomes stale", "CONFIGURABLE"],
  ["brief_item_limit", "Daily Brief presentation adapts to operational capacity", "CONFIGURABLE"],
  ["connector_sync_interval", "Connector freshness intervals are configurable", "CONFIGURABLE"],
  ["session_timeout", "Private sessions expire after a bounded interval", "CONFIGURABLE"],
];

try {
  for (const [key, title, tier] of provisions) {
    await pool.query(
      `INSERT INTO constitution_provision (key, title, tier, machine_readable_rule, applies_to_engines)
       VALUES ($1, $2, $3, '{}'::jsonb, '[]'::jsonb)
       ON CONFLICT (key) DO NOTHING`,
      [key, title, tier],
    );
  }
  console.info(`Seeded ${provisions.length} constitutional provisions.`);
} finally {
  await pool.end();
}