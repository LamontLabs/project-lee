CREATE TABLE "constitution_consultation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_type" varchar(120) NOT NULL,
	"engine_name" varchar(120) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"permitted" boolean NOT NULL,
	"override_required" boolean DEFAULT false NOT NULL,
	"applicable_provision_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"constraints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "constitution_violation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consultation_id" uuid NOT NULL,
	"action_type" varchar(120) NOT NULL,
	"reason" text NOT NULL,
	"severity" varchar(16) DEFAULT 'CRITICAL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_chunk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"run_id" uuid,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"start_char" integer NOT NULL,
	"end_char" integer NOT NULL,
	"token_estimate" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"checksum" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "understanding_review_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"run_id" uuid,
	"chunk_id" uuid,
	"item_type" varchar(48) NOT NULL,
	"status" varchar(24) DEFAULT 'needs_review' NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"proposed_value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"evidence_excerpt" text,
	"resolution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "anchor_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"statement" text NOT NULL,
	"source_ref" text NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assumption_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"statement" text NOT NULL,
	"rationale" text,
	"source_ref" text NOT NULL,
	"assumption_type" varchar(24) DEFAULT 'structural' NOT NULL,
	"evidence_basis" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_by_engine" varchar(120) DEFAULT 'unknown' NOT NULL,
	"used_in" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"validated_at" timestamp with time zone,
	"invalidated_at" timestamp with time zone,
	"invalidation_source" text,
	"superseded_by" uuid,
	"review_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assumption_use" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assumption_id" uuid NOT NULL,
	"conclusion_type" varchar(32) NOT NULL,
	"conclusion_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_heuristic_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"rule" text NOT NULL,
	"rationale" text,
	"source_ref" text NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"exception_count" integer DEFAULT 0 NOT NULL,
	"first_observed" timestamp with time zone,
	"last_reinforced" timestamp with time zone,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_delivery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"dead_lettered_at" timestamp with time zone,
	"last_error" text,
	"correlation_id" uuid,
	"causation_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_delivery_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"status" varchar(24) NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"error" text,
	"correlation_id" uuid,
	"causation_id" uuid
);
--> statement-breakpoint
CREATE TABLE "event_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(160) NOT NULL,
	"event_version" varchar(24) DEFAULT '1.0.0' NOT NULL,
	"aggregate_type" varchar(160) NOT NULL,
	"aggregate_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"actor" text DEFAULT 'lee' NOT NULL,
	"source_ref" text,
	"sequence_number" integer DEFAULT 1 NOT NULL,
	"causation_id" uuid,
	"correlation_id" uuid,
	"session_id" uuid,
	"brain_version" varchar(128),
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscriber_id" varchar(160) NOT NULL,
	"event_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"cursor_created_at" timestamp with time zone,
	"cursor_event_id" uuid,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"dead_letter_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_subscription_subscriber_id_unique" UNIQUE("subscriber_id")
);
--> statement-breakpoint
CREATE TABLE "executive_objective" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(240) NOT NULL,
	"description" text,
	"purpose" text DEFAULT '' NOT NULL,
	"source_ref" text NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"health_status" varchar(32) DEFAULT 'ON_TRACK' NOT NULL,
	"progress_narrative" text DEFAULT 'No progress evidence has been recorded yet.' NOT NULL,
	"current_blockers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"success_metrics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_projects" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expected_completion" text,
	"current_owner" text DEFAULT 'Founder' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"target_date" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "executive_objective_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"objective_id" uuid NOT NULL,
	"event_id" uuid,
	"evidence_type" varchar(64) NOT NULL,
	"direction" varchar(16) DEFAULT 'neutral' NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_event_id" uuid NOT NULL,
	"significance_classification" varchar(32) NOT NULL,
	"observation" text NOT NULL,
	"domain" varchar(120) DEFAULT 'operations' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "experience_record_source_event_id_unique" UNIQUE("source_event_id")
);
--> statement-breakpoint
CREATE TABLE "explanation_audience_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(32) NOT NULL,
	"vocabulary_level" varchar(32) NOT NULL,
	"depth" varchar(32) NOT NULL,
	"tone" varchar(48) NOT NULL,
	"emphasis" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sentence_length_preference" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "explanation_audience_profile_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "fact_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text NOT NULL,
	"predicate" text NOT NULL,
	"object" text NOT NULL,
	"source_ref" text NOT NULL,
	"fact_type" varchar(16) DEFAULT 'observed' NOT NULL,
	"source_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"propagated_confidence" real,
	"confidence_lineage" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"canon_level" varchar(16) DEFAULT 'working' NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"observed_at" timestamp with time zone,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"last_confirmed" timestamp with time zone,
	"freshness_score" real DEFAULT 1 NOT NULL,
	"superseded_by" uuid,
	"related_projects" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_people" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verified_at" timestamp with time zone,
	"age_state" varchar(16) DEFAULT 'FRESH' NOT NULL,
	"last_verified_at" timestamp with time zone,
	"verifiable" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'migration' NOT NULL,
	"modified_by" text,
	"modified_at" timestamp with time zone,
	"verified_by" text,
	"imported_from" jsonb,
	"generated_by" jsonb,
	"current_owner" text DEFAULT 'owner' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identity_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_key" varchar(64) DEFAULT 'primary' NOT NULL,
	"display_name" varchar(200),
	"values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"mission" text,
	"source_ref" text,
	"confidence" real DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identity_profile_profile_key_unique" UNIQUE("profile_key")
);
--> statement-breakpoint
CREATE TABLE "identity_profile_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"values" jsonb NOT NULL,
	"change_reason" text NOT NULL,
	"confirmed_by_owner" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institutional_knowledge_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"statement" text NOT NULL,
	"evidence_count" integer DEFAULT 0 NOT NULL,
	"source_ref" text NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"confidence_tier" varchar(16) DEFAULT 'MEDIUM' NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_window_start" timestamp with time zone,
	"evidence_window_end" timestamp with time zone,
	"exception_count" integer DEFAULT 0 NOT NULL,
	"first_established" timestamp with time zone,
	"last_reinforced" timestamp with time zone,
	"owner_reviewed" boolean DEFAULT false NOT NULL,
	"status" varchar(32) DEFAULT 'candidate' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interpretation_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"statement" text NOT NULL,
	"basis" text NOT NULL,
	"source_ref" text NOT NULL,
	"interpretation_type" varchar(24) DEFAULT 'inference' NOT NULL,
	"input_facts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"input_interpretations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generated_by_engine" varchar(120) DEFAULT 'unknown' NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"propagated_confidence" real,
	"confidence_lineage" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"why_chain" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"canon_level" varchar(16) DEFAULT 'working' NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"acknowledged_at" timestamp with time zone,
	"acted_on_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"promoted_to" uuid,
	"needs_review" boolean DEFAULT false NOT NULL,
	"audience_profile" varchar(32),
	"explanation_type" varchar(32),
	"source_object_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"explanation_brief" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"quality_feedback" varchar(24),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'migration' NOT NULL,
	"modified_by" text,
	"modified_at" timestamp with time zone,
	"verified_by" text,
	"verified_at" timestamp with time zone,
	"age_state" varchar(16) DEFAULT 'FRESH' NOT NULL,
	"last_verified_at" timestamp with time zone,
	"imported_from" jsonb,
	"generated_by" jsonb,
	"current_owner" text DEFAULT 'owner' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"statement" text NOT NULL,
	"pattern_key" varchar(200) NOT NULL,
	"experience_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"extracted_by" varchar(32) DEFAULT 'reflection' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestone_marker" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "milestone_marker_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "operational_adaptation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar(48) NOT NULL,
	"parameter" varchar(120) NOT NULL,
	"previous_value" text NOT NULL,
	"current_value" text NOT NULL,
	"default_value" text NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"observation_count" integer DEFAULT 0 NOT NULL,
	"reason" text NOT NULL,
	"rollback_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operational_metric" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar(48) NOT NULL,
	"observation_type" varchar(80) NOT NULL,
	"value" real NOT NULL,
	"source_event_id" uuid,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizational_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_key" varchar(64) NOT NULL,
	"legal_name" varchar(240) NOT NULL,
	"structure" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"people_categories" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"infrastructure_ownership" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"technology_ownership" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"revenue_model" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"legal_compliance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"shared_services" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_ref" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizational_profile_profile_key_unique" UNIQUE("profile_key")
);
--> statement-breakpoint
CREATE TABLE "organizational_resource" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"resource_type" varchar(48) NOT NULL,
	"name" varchar(240) NOT NULL,
	"owner_ref" text NOT NULL,
	"project_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dependency_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"source_ref" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projection_checkpoint" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projection_name" varchar(120) NOT NULL,
	"last_created_at" timestamp with time zone,
	"last_event_id" uuid,
	"processed_count" integer DEFAULT 0 NOT NULL,
	"conflict_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(24) DEFAULT 'ready' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projection_checkpoint_projection_name_unique" UNIQUE("projection_name")
);
--> statement-breakpoint
CREATE TABLE "projection_event_receipt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projection_name" varchar(120) NOT NULL,
	"event_id" uuid NOT NULL,
	"event_hash" varchar(64) NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "query_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cache_key" text NOT NULL,
	"result" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cached_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ttl_seconds" integer NOT NULL,
	"invalidated_at" timestamp with time zone,
	CONSTRAINT "query_cache_cache_key_unique" UNIQUE("cache_key")
);
--> statement-breakpoint
CREATE TABLE "query_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query_id" uuid NOT NULL,
	"requester_engine" varchar(120) NOT NULL,
	"purpose" varchar(80) NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"filter_spec" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ranking_policy" varchar(80) NOT NULL,
	"result_count" integer DEFAULT 0 NOT NULL,
	"cache_hit" boolean DEFAULT false NOT NULL,
	"execution_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "semantic_index" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_id" text NOT NULL,
	"object_type" varchar(64) NOT NULL,
	"embedding" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"indexed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_updated_at" timestamp with time zone NOT NULL,
	"model_version" varchar(64) DEFAULT 'local-hash-v1' NOT NULL,
	"excerpt" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_event_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(160) NOT NULL,
	"timeline_type" varchar(48) NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"significance" real DEFAULT 0.5 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "timeline_event_config_event_type_unique" UNIQUE("event_type")
);
--> statement-breakpoint
CREATE TABLE "provenance_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"record_type" varchar(32) NOT NULL,
	"record_id" uuid NOT NULL,
	"source_ref" text NOT NULL,
	"excerpt" text,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "understanding_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" varchar(64) NOT NULL,
	"source_ref" text NOT NULL,
	"source_reliability" varchar(16) DEFAULT 'medium' NOT NULL,
	"raw_content" text NOT NULL,
	"status" varchar(32) DEFAULT 'completed' NOT NULL,
	"fact_count" integer DEFAULT 0 NOT NULL,
	"interpretation_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "android_pairing_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "android_pairing_token_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "connection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" varchar(160) NOT NULL,
	"target_type" varchar(32) NOT NULL,
	"method" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"auth_status" varchar(32) DEFAULT 'not_connected' NOT NULL,
	"base_url" varchar(500),
	"health_endpoint" varchar(240),
	"credential_ref" varchar(160),
	"contract_version" varchar(32),
	"permissions" jsonb DEFAULT '["OBSERVE"]'::jsonb NOT NULL,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_health_check" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connector" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(64) NOT NULL,
	"access_mode" varchar(16) DEFAULT 'read' NOT NULL,
	"status" varchar(32) DEFAULT 'unconfigured' NOT NULL,
	"auth_status" varchar(32) DEFAULT 'not_connected' NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_sync_at" timestamp with time zone,
	"last_error" text,
	"consecutive_failure_count" integer DEFAULT 0 NOT NULL,
	"event_count" integer DEFAULT 0 NOT NULL,
	"error_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connector_provider_unique" UNIQUE("provider")
);
--> statement-breakpoint
CREATE TABLE "connector_sync" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connector_id" uuid NOT NULL,
	"provider" varchar(64) NOT NULL,
	"status" varchar(32) NOT NULL,
	"received_count" integer DEFAULT 0 NOT NULL,
	"normalized_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "normalized_connector_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sync_id" uuid NOT NULL,
	"provider" varchar(64) NOT NULL,
	"external_id" text NOT NULL,
	"event_type" varchar(128) NOT NULL,
	"source_ref" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_credential" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"provider" varchar(64) NOT NULL,
	"encrypted_value" text NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_credential_connection_id_unique" UNIQUE("connection_id")
);
--> statement-breakpoint
CREATE TABLE "cost_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"correlation_id" text NOT NULL,
	"engine" varchar(96) NOT NULL,
	"provider" varchar(64) NOT NULL,
	"tier" varchar(16) NOT NULL,
	"model" varchar(96) NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost_usd" real DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"cache_hit" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "economic_price_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation" varchar(64) NOT NULL,
	"category" varchar(32) NOT NULL,
	"unit" varchar(32) NOT NULL,
	"price_usd" real NOT NULL,
	"provider" varchar(96) NOT NULL,
	"source_ref" text NOT NULL,
	"effective_at" timestamp with time zone NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "economic_usage_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation" varchar(64) NOT NULL,
	"category" varchar(32) NOT NULL,
	"quantity" real NOT NULL,
	"unit" varchar(32) NOT NULL,
	"provider" varchar(96) NOT NULL,
	"source_ref" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_economics_cycle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"total_cost_usd" real DEFAULT 0 NOT NULL,
	"projected_monthly_cost_usd" real DEFAULT 0 NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"alerts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brain_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_name" varchar(160) NOT NULL,
	"schema_version" varchar(32) DEFAULT '1' NOT NULL,
	"status" varchar(32) DEFAULT 'verified' NOT NULL,
	"checksum" varchar(128) NOT NULL,
	"payload" jsonb NOT NULL,
	"record_counts" jsonb NOT NULL,
	"total_records" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "scheduled_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_type" varchar(96) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"run_at" timestamp with time zone NOT NULL,
	"recurrence" varchar(160),
	"dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "governance_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lee_request_id" uuid NOT NULL,
	"action_class" varchar(96) NOT NULL,
	"target_system" varchar(96) NOT NULL,
	"status" varchar(32) DEFAULT 'HOLD' NOT NULL,
	"decision_id" text,
	"reason_codes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"request_payload" jsonb NOT NULL,
	"response_payload" jsonb,
	"risk_level" varchar(16) DEFAULT 'MEDIUM' NOT NULL,
	"reason" text,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"affected_object" text,
	"actor" text DEFAULT 'lee' NOT NULL,
	"expires_at" timestamp with time zone,
	"verdict" varchar(16),
	"was_edited" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "governance_request_lee_request_id_unique" UNIQUE("lee_request_id")
);
--> statement-breakpoint
CREATE TABLE "governance_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_type" varchar(24) NOT NULL,
	"action_pattern" varchar(160) NOT NULL,
	"reason" text,
	"version" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" text DEFAULT 'founder' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_conflict" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conflict_key" varchar(128) NOT NULL,
	"left_object_type" varchar(64) NOT NULL,
	"left_object_id" uuid NOT NULL,
	"right_object_type" varchar(64) NOT NULL,
	"right_object_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "memory_conflict_conflict_key_unique" UNIQUE("conflict_key")
);
--> statement-breakpoint
CREATE TABLE "memory_index" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_type" varchar(64) NOT NULL,
	"object_id" uuid NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"project_id" text,
	"entity_id" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "graph_edge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_node_id" uuid NOT NULL,
	"target_node_id" uuid NOT NULL,
	"edge_type" varchar(64) NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"weight" real DEFAULT 0.5 NOT NULL,
	"freshness_score" real DEFAULT 1 NOT NULL,
	"source_ref" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_confirmed_at" timestamp with time zone,
	"is_historical" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "graph_node" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_type" varchar(64) NOT NULL,
	"object_id" uuid NOT NULL,
	"label" text,
	"importance_score" real DEFAULT 0.5 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'migration' NOT NULL,
	"modified_by" text,
	"modified_at" timestamp with time zone,
	"verified_by" text,
	"verified_at" timestamp with time zone,
	"imported_from" jsonb,
	"generated_by" jsonb,
	"current_owner" text DEFAULT 'owner' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "person" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_key" varchar(240) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"email" varchar(320),
	"roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"organizational_role" varchar(64),
	"expertise" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"projects" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"communication_rhythm" varchar(32) DEFAULT 'monthly' NOT NULL,
	"trust_score" real DEFAULT 0.5 NOT NULL,
	"current_state" varchar(32) DEFAULT 'nominal' NOT NULL,
	"relationship_health" varchar(32) DEFAULT 'unknown' NOT NULL,
	"recommended_cadence_days" integer DEFAULT 30 NOT NULL,
	"last_interaction_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'migration' NOT NULL,
	"modified_by" text,
	"modified_at" timestamp with time zone,
	"verified_by" text,
	"verified_at" timestamp with time zone,
	"age_state" varchar(16) DEFAULT 'FRESH' NOT NULL,
	"last_verified_at" timestamp with time zone,
	"imported_from" jsonb,
	"generated_by" jsonb,
	"current_owner" text DEFAULT 'owner' NOT NULL,
	CONSTRAINT "person_identity_key_unique" UNIQUE("identity_key")
);
--> statement-breakpoint
CREATE TABLE "relationship_health_score" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"score" real DEFAULT 50 NOT NULL,
	"momentum" varchar(16) DEFAULT 'dormant' NOT NULL,
	"rationale" text NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationship_interaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"normalized_event_id" uuid,
	"provider" varchar(64),
	"direction" varchar(16) DEFAULT 'unknown' NOT NULL,
	"summary" text NOT NULL,
	"source_ref" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationship_promise" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"direction" varchar(16) DEFAULT 'outgoing' NOT NULL,
	"statement" text NOT NULL,
	"status" varchar(24) DEFAULT 'open' NOT NULL,
	"due_at" timestamp with time zone,
	"source_ref" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationship_question" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"question" text NOT NULL,
	"status" varchar(24) DEFAULT 'open' NOT NULL,
	"source_ref" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operational_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cadence" varchar(16) NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"title" text NOT NULL,
	"summary_narrative" text NOT NULL,
	"sections" jsonb NOT NULL,
	"source_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"key_themes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reasoning_correlation_id" text,
	"reasoning_cost_usd" real,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" varchar(120) NOT NULL,
	"actor" text NOT NULL,
	"target_type" varchar(64),
	"target_id" text,
	"outcome" varchar(32) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brief" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brief_type" varchar(48) NOT NULL,
	"title" text NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sources_used" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"why_chain" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "constitution_provision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(120) NOT NULL,
	"title" text NOT NULL,
	"tier" varchar(16) NOT NULL,
	"machine_readable_rule" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"applies_to_engines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"consultation_count" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "constitution_provision_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "constitution_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" varchar(32) NOT NULL,
	"provisions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"amendment_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "constitution_version_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "impact_edge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_node_id" uuid NOT NULL,
	"target_node_id" uuid NOT NULL,
	"edge_type" varchar(64) NOT NULL,
	"strength" real DEFAULT 0.5 NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"lag_days" integer,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_source" text,
	"created_by" varchar(24) DEFAULT 'engine' NOT NULL,
	"status" varchar(24) DEFAULT 'needs-review' NOT NULL,
	"observed_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impact_node" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_type" varchar(64) NOT NULL,
	"object_id" uuid,
	"label" text NOT NULL,
	"outcome" varchar(32),
	"confidence" real DEFAULT 0.5 NOT NULL,
	"impact_score" real DEFAULT 0 NOT NULL,
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"source_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(64) NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"severity" varchar(16) DEFAULT 'info' NOT NULL,
	"status" varchar(16) DEFAULT 'unread' NOT NULL,
	"target_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	"push_sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "source_vault" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" varchar(160) NOT NULL,
	"byte_size" integer,
	"checksum" varchar(128) NOT NULL,
	"storage_path" text NOT NULL,
	"processing_status" varchar(32) DEFAULT 'pending' NOT NULL,
	"evidence_quality" real DEFAULT 0.5 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"raw_content" text,
	"age_state" varchar(16) DEFAULT 'FRESH' NOT NULL,
	"last_verified_at" timestamp with time zone,
	"created_by" text DEFAULT 'migration' NOT NULL,
	"modified_by" text,
	"modified_at" timestamp with time zone,
	"verified_by" text,
	"verified_at" timestamp with time zone,
	"imported_from" jsonb,
	"generated_by" jsonb,
	"current_owner" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_vault_checksum_unique" UNIQUE("checksum")
);
--> statement-breakpoint
CREATE TABLE "universal_object" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_type" varchar(64) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" varchar(48) DEFAULT 'active' NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"propagated_confidence" real,
	"freshness" real DEFAULT 1 NOT NULL,
	"importance" real DEFAULT 0.5 NOT NULL,
	"source_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_objects" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"canon_level" varchar(16) DEFAULT 'working' NOT NULL,
	"confidence_lineage" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"why_chain" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"memory_tier" varchar(24) DEFAULT 'recent' NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"access_count" integer DEFAULT 0 NOT NULL,
	"relevance_score" real DEFAULT 0.5 NOT NULL,
	"consolidated_at" timestamp with time zone,
	"compression_stage" integer DEFAULT 1 NOT NULL,
	"memory_summary" jsonb,
	"key_entities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"manual_tier_override" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_confirmed_at" timestamp with time zone,
	"age_state" varchar(16) DEFAULT 'FRESH' NOT NULL,
	"last_verified_at" timestamp with time zone,
	"created_by" text DEFAULT 'migration' NOT NULL,
	"modified_by" text,
	"modified_at" timestamp with time zone,
	"verified_by" text,
	"verified_at" timestamp with time zone,
	"imported_from" jsonb,
	"generated_by" jsonb,
	"current_owner" text DEFAULT 'owner' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waiting_loop" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text NOT NULL,
	"owner" text,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"waiting_since" timestamp with time zone DEFAULT now() NOT NULL,
	"next_check_at" timestamp with time zone,
	"source_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "context_packet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fingerprint" varchar(128) NOT NULL,
	"intent" text NOT NULL,
	"mode" varchar(32) NOT NULL,
	"packet" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"excluded_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"token_estimate" integer DEFAULT 0 NOT NULL,
	"estimated_cost_usd" real DEFAULT 0 NOT NULL,
	"selected_tier" varchar(16) NOT NULL,
	"selected_model" varchar(96) NOT NULL,
	"risk_level" varchar(16) DEFAULT 'LOW' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "context_score" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_id" text NOT NULL,
	"intent_id" uuid,
	"context_value_score" real NOT NULL,
	"factor_breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"included" boolean DEFAULT false NOT NULL,
	"exclusion_reason" text,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text DEFAULT 'Ask Lee' NOT NULL,
	"mode" varchar(32) DEFAULT 'normal' NOT NULL,
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" varchar(16) NOT NULL,
	"content" text NOT NULL,
	"context_packet_id" uuid,
	"intent_id" uuid,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_route_decision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"correlation_id" text NOT NULL,
	"request_text" text NOT NULL,
	"mode" varchar(32) NOT NULL,
	"route" varchar(32) NOT NULL,
	"tier" varchar(16) NOT NULL,
	"provider" varchar(32) NOT NULL,
	"model" varchar(96) NOT NULL,
	"reason" text NOT NULL,
	"estimated_cost_usd" real DEFAULT 0 NOT NULL,
	"status" varchar(24) DEFAULT 'selected' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backup_archive" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"backup_id" varchar(160) NOT NULL,
	"format_version" varchar(32) DEFAULT '1' NOT NULL,
	"brain_version" varchar(160) NOT NULL,
	"manifest" jsonb NOT NULL,
	"payload" jsonb NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"encrypted" boolean DEFAULT false NOT NULL,
	"status" varchar(32) DEFAULT 'created' NOT NULL,
	"verified_at" timestamp with time zone,
	"restore_tested_at" timestamp with time zone,
	"restore_test_status" varchar(32),
	"restore_evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "backup_archive_backup_id_unique" UNIQUE("backup_id")
);
--> statement-breakpoint
CREATE TABLE "engine_health" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engine_name" varchar(120) NOT NULL,
	"last_success_at" timestamp with time zone,
	"last_failure_at" timestamp with time zone,
	"error_count" integer DEFAULT 0 NOT NULL,
	"run_count" integer DEFAULT 0 NOT NULL,
	"average_duration_ms" integer DEFAULT 0 NOT NULL,
	"backoff_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "engine_health_engine_name_unique" UNIQUE("engine_name")
);
--> statement-breakpoint
CREATE TABLE "engine_registry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engine_id" varchar(120) DEFAULT '' NOT NULL,
	"name" varchar(120) NOT NULL,
	"version" varchar(32) DEFAULT '1.0.0' NOT NULL,
	"status" varchar(24) DEFAULT 'HEALTHY' NOT NULL,
	"lifecycle_state" varchar(24) DEFAULT 'INITIALIZING' NOT NULL,
	"owner" varchar(80) DEFAULT 'Foundations' NOT NULL,
	"last_heartbeat" timestamp with time zone DEFAULT now() NOT NULL,
	"health_endpoint" varchar(240),
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"inputs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"outputs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"priority_class" varchar(16) DEFAULT 'NORMAL' NOT NULL,
	"frequency" varchar(80),
	"resource_profile" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required_dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"optional_dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"degraded_capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recovery_policy" varchar(32) DEFAULT 'GRACEFUL_DISABLE' NOT NULL,
	"recovery_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_activity_at" timestamp,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "engine_registry_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "orchestration_work_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engine_name" varchar(120) NOT NULL,
	"action" varchar(160) NOT NULL,
	"priority" varchar(16) DEFAULT 'NORMAL' NOT NULL,
	"urgency_score" real DEFAULT 0 NOT NULL,
	"estimated_cost_usd" real DEFAULT 0 NOT NULL,
	"dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(24) DEFAULT 'queued' NOT NULL,
	"delay_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "founder_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_key" varchar(64) DEFAULT 'primary' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"dimensions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "founder_profile_profile_key_unique" UNIQUE("profile_key")
);
--> statement-breakpoint
CREATE TABLE "founder_profile_correction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"dimension" varchar(96) NOT NULL,
	"previous_value" jsonb,
	"corrected_value" jsonb NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "founder_profile_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"dimensions" jsonb NOT NULL,
	"change_reason" text NOT NULL,
	"confirmed_by_owner" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curiosity_setting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_key" varchar(64) DEFAULT 'primary' NOT NULL,
	"observations_per_day" integer DEFAULT 8 NOT NULL,
	"minimum_confidence" varchar(16) DEFAULT 'medium' NOT NULL,
	"enabled_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curiosity_setting_profile_key_unique" UNIQUE("profile_key")
);
--> statement-breakpoint
CREATE TABLE "observation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"observation_type" varchar(64) NOT NULL,
	"headline" text NOT NULL,
	"supporting_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"affected_objects" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" varchar(16) DEFAULT 'low' NOT NULL,
	"propagated_confidence" real,
	"confidence_lineage" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"why_chain" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"relevance_score" real DEFAULT 0.5 NOT NULL,
	"lifecycle" varchar(24) DEFAULT 'new' NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acted_on_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"promoted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "opportunity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_type" varchar(64) NOT NULL,
	"headline" text NOT NULL,
	"supporting_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"affected_objects" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" varchar(16) DEFAULT 'low' NOT NULL,
	"propagated_confidence" real,
	"confidence_lineage" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"why_chain" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"relevance_score" real DEFAULT 0.5 NOT NULL,
	"potential_value" varchar(16) DEFAULT 'low' NOT NULL,
	"action_suggestion" text NOT NULL,
	"lifecycle" varchar(24) DEFAULT 'new' NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acted_on_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"promoted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "trust_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subsystem_name" varchar(120) NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"delta" real NOT NULL,
	"reason" text NOT NULL,
	"evidence_id" uuid,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trust_score" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subsystem_name" varchar(120) NOT NULL,
	"score" real DEFAULT 50 NOT NULL,
	"score_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contributing_signals" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_updated" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trust_score_subsystem_name_unique" UNIQUE("subsystem_name")
);
--> statement-breakpoint
CREATE TABLE "reflection_metric" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dimension" varchar(80) NOT NULL,
	"value" real NOT NULL,
	"period" varchar(24) NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reflection_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" varchar(24) NOT NULL,
	"report_type" varchar(24) NOT NULL,
	"dimensions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"narrative" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"model_used" varchar(120) DEFAULT 'structured-ledger' NOT NULL,
	"sources_used" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"simulation_type" varchar(32) NOT NULL,
	"assumptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reasoning_chain" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"likely_outcomes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"possible_outcomes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"unlikely_outcomes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"risks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"opportunities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended_decision" text,
	"state_changes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"affected_projects" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"objective_impact" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"anchor_stress" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"decisions_to_revisit" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scenario_status" varchar(24) DEFAULT 'active' NOT NULL,
	"evidence_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"propagated_confidence" real,
	"confidence_lineage" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"why_chain" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model_used" varchar(120) DEFAULT 'structured-ledger' NOT NULL,
	"estimated_cost_usd" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategic_objective" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"objective" text NOT NULL,
	"horizon" varchar(24) DEFAULT 'quarter' NOT NULL,
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"progress_evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"blockers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_project_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"key_decision_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"propagated_confidence" real,
	"confidence_lineage" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"why_chain" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"next_action" text,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'migration' NOT NULL,
	"modified_by" text,
	"modified_at" timestamp with time zone,
	"verified_by" text,
	"verified_at" timestamp with time zone,
	"imported_from" jsonb,
	"generated_by" jsonb,
	"current_owner" text DEFAULT 'owner' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"prompt" text NOT NULL,
	"summary" text NOT NULL,
	"objective_ids" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "correction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"engine_name" varchar(120) NOT NULL,
	"original_output" text NOT NULL,
	"corrected_output" text NOT NULL,
	"context_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"correction_type" varchar(64) NOT NULL,
	"category" varchar(120) NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_type" varchar(48) NOT NULL,
	"name" varchar(160) NOT NULL,
	"pattern" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"applied_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(24) DEFAULT 'candidate' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "standing_correction_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar(120) NOT NULL,
	"condition" text NOT NULL,
	"correction" text NOT NULL,
	"status" varchar(24) DEFAULT 'proposed' NOT NULL,
	"confirmed_at" timestamp with time zone,
	"applied_count" integer DEFAULT 0 NOT NULL,
	"correction_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_consultation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_type" varchar(48) NOT NULL,
	"policy_version" integer NOT NULL,
	"action" varchar(120) NOT NULL,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"permitted" boolean NOT NULL,
	"value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"constraints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"requester" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_type" varchar(48) NOT NULL,
	"version" integer NOT NULL,
	"values" jsonb NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'system' NOT NULL,
	"change_reason" text NOT NULL,
	"superseded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "resource_alert" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dimension" varchar(32) NOT NULL,
	"level" varchar(16) NOT NULL,
	"title" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_quota" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(96) NOT NULL,
	"used" real DEFAULT 0 NOT NULL,
	"limit" real DEFAULT 0 NOT NULL,
	"reset_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resource_quota_provider_unique" UNIQUE("provider")
);
--> statement-breakpoint
CREATE TABLE "resource_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sampled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dimension_states" jsonb NOT NULL,
	"overall_state" varchar(16) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intent_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"raw_input" text NOT NULL,
	"intent_type" varchar(48) NOT NULL,
	"intent_subtype" varchar(80),
	"detected_project_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"detected_person_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"detected_object_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"audience_profile" varchar(48) DEFAULT 'Founder' NOT NULL,
	"urgency" varchar(24) DEFAULT 'routine' NOT NULL,
	"requires_model" boolean DEFAULT true NOT NULL,
	"model_complexity_estimate" varchar(16) DEFAULT 'cheap' NOT NULL,
	"retrieval_mode" varchar(16) DEFAULT 'structured' NOT NULL,
	"explanation_type" varchar(48),
	"confidence" real DEFAULT 0.5 NOT NULL,
	"source" varchar(24) DEFAULT 'ask_lee' NOT NULL,
	"session_id" text,
	"correction_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lee_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"current_state" varchar(24) DEFAULT 'Idle' NOT NULL,
	"entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text DEFAULT 'System initialized' NOT NULL,
	"estimated_duration_seconds" integer,
	"active_jobs_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "state_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state" varchar(24) NOT NULL,
	"entered_at" timestamp with time zone NOT NULL,
	"exited_at" timestamp with time zone,
	"duration_seconds" integer,
	"reason" text NOT NULL,
	"triggering_job_id" uuid
);
--> statement-breakpoint
CREATE TABLE "mode_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mode_name" varchar(32) NOT NULL,
	"signal_weights" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"nav_order" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status_bar_slots" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ask_lee_default_mode" varchar(32) DEFAULT 'normal' NOT NULL,
	"notification_threshold" varchar(24) DEFAULT 'normal' NOT NULL,
	"model_routing_override" varchar(32) DEFAULT 'balanced' NOT NULL,
	"governance_strictness_override" varchar(32) DEFAULT 'standard' NOT NULL,
	"graph_traversal_depth" real DEFAULT 2 NOT NULL,
	"connector_sync_override" varchar(32) DEFAULT 'normal' NOT NULL,
	"context_packet_tier_weights" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	CONSTRAINT "mode_config_mode_name_unique" UNIQUE("mode_name")
);
--> statement-breakpoint
CREATE TABLE "mode_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mode_name" varchar(32) NOT NULL,
	"activation_reason" text NOT NULL,
	"activated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_key" varchar(32) DEFAULT 'primary' NOT NULL,
	"current_mode" varchar(32) DEFAULT 'morning' NOT NULL,
	"manual_override" boolean DEFAULT false NOT NULL,
	"adaptive_enabled" boolean DEFAULT true NOT NULL,
	"last_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_state_state_key_unique" UNIQUE("state_key")
);
--> statement-breakpoint
CREATE TABLE "self_test_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_run_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"overall_result" varchar(8) DEFAULT 'WARN' NOT NULL,
	"report" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pass_count" integer DEFAULT 0 NOT NULL,
	"warn_count" integer DEFAULT 0 NOT NULL,
	"fail_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "self_test_run_test_run_id_unique" UNIQUE("test_run_id")
);
--> statement-breakpoint
CREATE TABLE "boot_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"boot_mode" varchar(24) NOT NULL,
	"reason" text NOT NULL,
	"agenda_summary" text,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"engine_states" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"success" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clean_shutdown" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"state_checksum" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "recovery_agenda" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" varchar(24) DEFAULT 'OPEN' NOT NULL,
	"issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" text DEFAULT 'boot' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "age_window_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_type" varchar(64) NOT NULL,
	"fresh_days" real,
	"current_days" real,
	"old_days" real NOT NULL,
	"historical_days" real NOT NULL,
	"stale_days" real,
	"expired_days" real,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "age_window_config_object_type_unique" UNIQUE("object_type")
);
--> statement-breakpoint
CREATE TABLE "aging_transition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_id" uuid NOT NULL,
	"object_type" varchar(64) NOT NULL,
	"from_state" varchar(16),
	"to_state" varchar(16) NOT NULL,
	"age_days" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "manifest_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manifest_version" varchar(32) NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"manifest" jsonb NOT NULL,
	"markdown" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_state_signal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"signal_type" varchar(32) NOT NULL,
	"signal_name" varchar(160) NOT NULL,
	"current_value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text NOT NULL,
	"confidence" real DEFAULT 1 NOT NULL,
	"staleness_threshold_hours" real DEFAULT 24 NOT NULL,
	"refresh_frequency" varchar(32) DEFAULT 'hourly' NOT NULL,
	"configured" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_state_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"signal_id" uuid NOT NULL,
	"value" jsonb NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "behavioral_signal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"signal_type" varchar(48) NOT NULL,
	"entity_ref" text,
	"actor" text DEFAULT 'owner' NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"evidence_event_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operational_pattern" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern_type" varchar(32) NOT NULL,
	"pattern_description" text NOT NULL,
	"confidence" real DEFAULT 0.3 NOT NULL,
	"observation_count" integer DEFAULT 0 NOT NULL,
	"contradiction_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(24) DEFAULT 'candidate' NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_observed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "initiative_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar(48) NOT NULL,
	"observation" text NOT NULL,
	"significance" varchar(16) DEFAULT 'LOW' NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"action_hint" text,
	"acknowledged_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"dedupe_key" varchar(240) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "initiative_limit_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"daily_high_critical" integer DEFAULT 5 NOT NULL,
	"daily_other" integer DEFAULT 10 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operational_context_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"active_priority" jsonb,
	"changed_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"drifting_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"waiting_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"blocked_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"at_risk_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"can_wait_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ignore_today_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scoring_context" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_registration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" varchar(80) NOT NULL,
	"provider_category" varchar(32) NOT NULL,
	"adapter_name" varchar(120) NOT NULL,
	"current_status" varchar(24) DEFAULT 'HEALTHY' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"supported_events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_registration_provider_id_unique" UNIQUE("provider_id")
);
--> statement-breakpoint
CREATE TABLE "bootstrap_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"repository_id" text NOT NULL,
	"status" varchar(24) DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"facts_created_count" integer DEFAULT 0 NOT NULL,
	"interpretations_created_count" integer DEFAULT 0 NOT NULL,
	"graph_nodes_created_count" integer DEFAULT 0 NOT NULL,
	"relationships_detected" integer DEFAULT 0 NOT NULL,
	"questions_generated" integer DEFAULT 0 NOT NULL,
	"issues_flagged" integer DEFAULT 0 NOT NULL,
	"report" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "internal_capability_service" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" varchar(40) NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"category" varchar(32) NOT NULL,
	"base_url" varchar(500),
	"api_version" varchar(24) DEFAULT 'v1' NOT NULL,
	"health_endpoint" varchar(240) NOT NULL,
	"current_health" varchar(24) DEFAULT 'unavailable' NOT NULL,
	"last_health_check" timestamp with time zone,
	"last_call_at" timestamp with time zone,
	"failure_policy" varchar(40) NOT NULL,
	"credential_env_key" varchar(120) NOT NULL,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "internal_capability_service_service_id_unique" UNIQUE("service_id")
);
--> statement-breakpoint
CREATE TABLE "executive_loop" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loop_key" varchar(48) NOT NULL,
	"phase" varchar(24) DEFAULT 'OBSERVE' NOT NULL,
	"cycle_count" integer DEFAULT 0 NOT NULL,
	"phase_entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_transition_at" timestamp with time zone,
	"last_cycle_started_at" timestamp with time zone,
	"average_cycle_duration_ms" integer,
	"interrupted" integer DEFAULT 0 NOT NULL,
	"phase_durations" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_reason" varchar(240),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "executive_loop_loop_key_unique" UNIQUE("loop_key")
);
--> statement-breakpoint
CREATE TABLE "operational_confidence_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"score" integer NOT NULL,
	"explanation" varchar(500) NOT NULL,
	"factors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"threshold" integer DEFAULT 70 NOT NULL,
	"triggered_initiative" varchar(120),
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_momentum" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"classification" varchar(24) NOT NULL,
	"direction" varchar(8) NOT NULL,
	"contributions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_momentum_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"classification" varchar(24) NOT NULL,
	"direction" varchar(8) NOT NULL,
	"contributions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operational_capacity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state" varchar(16) NOT NULL,
	"score" real NOT NULL,
	"signals" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"inferred" boolean DEFAULT true NOT NULL,
	"override_state" varchar(16),
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operational_capacity_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state" varchar(16) NOT NULL,
	"score" real NOT NULL,
	"signals" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" varchar(24) DEFAULT 'inference' NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategic_anchor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anchor_type" varchar(32) NOT NULL,
	"summary" text NOT NULL,
	"full_context" text NOT NULL,
	"project_id" text,
	"source_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"why_chain" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retired_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "portfolio_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"health_score" real NOT NULL,
	"project_count" real NOT NULL,
	"momentum_distribution" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"shared_dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attention_distribution" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cross_project_people" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"alerts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"portfolio_anchors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_state_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_id" uuid NOT NULL,
	"health_score" real NOT NULL,
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_machine_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"target_at" timestamp with time zone NOT NULL,
	"reference" text NOT NULL,
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uncertainty_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_id" varchar(180) NOT NULL,
	"object_type" varchar(64) NOT NULL,
	"outcome_level" varchar(16) NOT NULL,
	"timing_level" varchar(16) NOT NULL,
	"scope_level" varchar(16) NOT NULL,
	"level" varchar(16) NOT NULL,
	"score" real NOT NULL,
	"signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_allocation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"percentage" real NOT NULL,
	"implied_daily_hours" real DEFAULT 0 NOT NULL,
	"implied_weekly_hours" real DEFAULT 0 NOT NULL,
	"why" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"narrative" text NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_allocation_override" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"percentage" real NOT NULL,
	"reason" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_readiness" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"goal" varchar(32) DEFAULT 'general' NOT NULL,
	"overall_score" real NOT NULL,
	"dimensions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"highest_gap" varchar(64),
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "android_pairing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" varchar(120) NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"rotated_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"fcm_token" text,
	"push_platform" varchar(16),
	"push_updated_at" timestamp with time zone,
	CONSTRAINT "android_pairing_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "desktop_setup_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "local_service_contract" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar(64) NOT NULL,
	"provider" varchar(64) NOT NULL,
	"display_name" varchar(160) NOT NULL,
	"description" varchar(240) NOT NULL,
	"target_type" varchar(32) DEFAULT 'service' NOT NULL,
	"port" integer NOT NULL,
	"paths" text[] DEFAULT '{}' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_by" varchar(80) DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "local_service_contract_contract_id_unique" UNIQUE("contract_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "source_chunk_source_index_unique" ON "source_chunk" USING btree ("source_id","chunk_index");--> statement-breakpoint
CREATE UNIQUE INDEX "source_chunk_checksum_unique" ON "source_chunk" USING btree ("source_id","checksum");--> statement-breakpoint
CREATE INDEX "source_chunk_run_idx" ON "source_chunk" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "understanding_review_status_created_idx" ON "understanding_review_item" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "understanding_review_source_idx" ON "understanding_review_item" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "anchor_active_priority_idx" ON "anchor_ledger" USING btree ("active","priority");--> statement-breakpoint
CREATE INDEX "assumption_status_review_idx" ON "assumption_ledger" USING btree ("status","review_at");--> statement-breakpoint
CREATE INDEX "assumption_source_idx" ON "assumption_ledger" USING btree ("source_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "assumption_use_unique" ON "assumption_use" USING btree ("assumption_id","conclusion_type","conclusion_id");--> statement-breakpoint
CREATE INDEX "assumption_use_conclusion_idx" ON "assumption_use" USING btree ("conclusion_type","conclusion_id");--> statement-breakpoint
CREATE INDEX "decision_heuristic_source_idx" ON "decision_heuristic_ledger" USING btree ("source_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "event_delivery_subscription_event_unique" ON "event_delivery" USING btree ("subscription_id","event_id");--> statement-breakpoint
CREATE INDEX "event_delivery_due_idx" ON "event_delivery" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "event_delivery_attempt_unique" ON "event_delivery_attempt" USING btree ("delivery_id","attempt_number");--> statement-breakpoint
CREATE INDEX "event_delivery_attempt_event_idx" ON "event_delivery_attempt" USING btree ("event_id","status");--> statement-breakpoint
CREATE INDEX "event_log_type_occurred_idx" ON "event_log" USING btree ("event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "event_log_aggregate_idx" ON "event_log" USING btree ("aggregate_type","aggregate_id");--> statement-breakpoint
CREATE INDEX "event_subscription_status_idx" ON "event_subscription" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "executive_objective_status_priority_idx" ON "executive_objective" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "executive_objective_source_idx" ON "executive_objective" USING btree ("source_ref");--> statement-breakpoint
CREATE INDEX "executive_objective_evidence_objective_idx" ON "executive_objective_evidence" USING btree ("objective_id","created_at");--> statement-breakpoint
CREATE INDEX "executive_objective_evidence_event_idx" ON "executive_objective_evidence" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "experience_domain_created_idx" ON "experience_record" USING btree ("domain","created_at");--> statement-breakpoint
CREATE INDEX "fact_ledger_subject_idx" ON "fact_ledger" USING btree ("subject");--> statement-breakpoint
CREATE INDEX "fact_ledger_source_idx" ON "fact_ledger" USING btree ("source_ref");--> statement-breakpoint
CREATE INDEX "identity_profile_version_profile_idx" ON "identity_profile_version" USING btree ("profile_id","version");--> statement-breakpoint
CREATE INDEX "identity_profile_version_created_idx" ON "identity_profile_version" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "institutional_knowledge_status_idx" ON "institutional_knowledge_ledger" USING btree ("status");--> statement-breakpoint
CREATE INDEX "institutional_knowledge_source_idx" ON "institutional_knowledge_ledger" USING btree ("source_ref");--> statement-breakpoint
CREATE INDEX "interpretation_source_idx" ON "interpretation_ledger" USING btree ("source_ref");--> statement-breakpoint
CREATE INDEX "interpretation_validity_idx" ON "interpretation_ledger" USING btree ("valid_from","valid_until");--> statement-breakpoint
CREATE INDEX "lesson_pattern_status_idx" ON "lesson_record" USING btree ("pattern_key","status");--> statement-breakpoint
CREATE INDEX "lesson_created_idx" ON "lesson_record" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "operational_adaptation_status_idx" ON "operational_adaptation" USING btree ("status");--> statement-breakpoint
CREATE INDEX "operational_adaptation_parameter_idx" ON "operational_adaptation" USING btree ("parameter");--> statement-breakpoint
CREATE INDEX "operational_metric_category_observed_idx" ON "operational_metric" USING btree ("category","observed_at");--> statement-breakpoint
CREATE INDEX "operational_metric_source_idx" ON "operational_metric" USING btree ("source_event_id");--> statement-breakpoint
CREATE INDEX "organizational_profile_source_idx" ON "organizational_profile" USING btree ("source_ref");--> statement-breakpoint
CREATE INDEX "organizational_resource_profile_idx" ON "organizational_resource" USING btree ("profile_id","resource_type");--> statement-breakpoint
CREATE INDEX "organizational_resource_owner_idx" ON "organizational_resource" USING btree ("owner_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "projection_event_receipt_unique" ON "projection_event_receipt" USING btree ("projection_name","event_id");--> statement-breakpoint
CREATE INDEX "query_log_purpose_idx" ON "query_log" USING btree ("purpose","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "semantic_index_object_unique" ON "semantic_index" USING btree ("object_id","object_type");--> statement-breakpoint
CREATE INDEX "semantic_index_object_idx" ON "semantic_index" USING btree ("object_id");--> statement-breakpoint
CREATE INDEX "semantic_index_indexed_idx" ON "semantic_index" USING btree ("indexed_at");--> statement-breakpoint
CREATE INDEX "provenance_run_idx" ON "provenance_record" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "provenance_record_idx" ON "provenance_record" USING btree ("record_type","record_id");--> statement-breakpoint
CREATE INDEX "understanding_run_source_idx" ON "understanding_run" USING btree ("source_ref");--> statement-breakpoint
CREATE INDEX "understanding_run_status_idx" ON "understanding_run" USING btree ("status","started_at");--> statement-breakpoint
CREATE INDEX "android_pairing_token_status_idx" ON "android_pairing_token" USING btree ("status");--> statement-breakpoint
CREATE INDEX "connection_status_idx" ON "connection" USING btree ("status");--> statement-breakpoint
CREATE INDEX "connection_method_idx" ON "connection" USING btree ("method");--> statement-breakpoint
CREATE INDEX "connector_status_idx" ON "connector" USING btree ("status");--> statement-breakpoint
CREATE INDEX "connector_sync_provider_idx" ON "connector_sync" USING btree ("provider","started_at");--> statement-breakpoint
CREATE INDEX "normalized_connector_event_sync_idx" ON "normalized_connector_event" USING btree ("sync_id");--> statement-breakpoint
CREATE INDEX "normalized_connector_event_external_idx" ON "normalized_connector_event" USING btree ("provider","external_id");--> statement-breakpoint
CREATE INDEX "oauth_credential_connection_idx" ON "oauth_credential" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "cost_record_correlation_idx" ON "cost_record" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "cost_record_tier_recorded_idx" ON "cost_record" USING btree ("tier","recorded_at");--> statement-breakpoint
CREATE INDEX "economic_price_operation_effective_idx" ON "economic_price_evidence" USING btree ("operation","unit","effective_at");--> statement-breakpoint
CREATE INDEX "economic_price_category_effective_idx" ON "economic_price_evidence" USING btree ("category","effective_at");--> statement-breakpoint
CREATE INDEX "economic_usage_category_recorded_idx" ON "economic_usage_record" USING btree ("category","recorded_at");--> statement-breakpoint
CREATE INDEX "economic_usage_operation_unit_idx" ON "economic_usage_record" USING btree ("operation","unit");--> statement-breakpoint
CREATE INDEX "system_economics_cycle_period_idx" ON "system_economics_cycle" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "system_economics_cycle_created_idx" ON "system_economics_cycle" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "brain_version_created_idx" ON "brain_version" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "brain_version_status_idx" ON "brain_version" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scheduled_job_due_idx" ON "scheduled_job" USING btree ("status","run_at");--> statement-breakpoint
CREATE INDEX "scheduled_job_type_idx" ON "scheduled_job" USING btree ("job_type","status");--> statement-breakpoint
CREATE INDEX "governance_request_status_created_idx" ON "governance_request" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "governance_request_action_idx" ON "governance_request" USING btree ("action_class","created_at");--> statement-breakpoint
CREATE INDEX "governance_rule_active_pattern_idx" ON "governance_rule" USING btree ("active","action_pattern");--> statement-breakpoint
CREATE INDEX "memory_conflict_status_idx" ON "memory_conflict" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "memory_index_object_unique" ON "memory_index" USING btree ("object_type","object_id");--> statement-breakpoint
CREATE INDEX "memory_index_project_idx" ON "memory_index" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "memory_index_entity_idx" ON "memory_index" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "memory_index_recorded_idx" ON "memory_index" USING btree ("recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "graph_edge_unique" ON "graph_edge" USING btree ("source_node_id","target_node_id","edge_type");--> statement-breakpoint
CREATE INDEX "graph_edge_source_idx" ON "graph_edge" USING btree ("source_node_id","edge_type");--> statement-breakpoint
CREATE INDEX "graph_edge_target_idx" ON "graph_edge" USING btree ("target_node_id","edge_type");--> statement-breakpoint
CREATE INDEX "graph_edge_type_idx" ON "graph_edge" USING btree ("edge_type");--> statement-breakpoint
CREATE UNIQUE INDEX "graph_node_object_unique" ON "graph_node" USING btree ("object_type","object_id");--> statement-breakpoint
CREATE INDEX "graph_node_type_idx" ON "graph_node" USING btree ("object_type");--> statement-breakpoint
CREATE INDEX "person_health_idx" ON "person" USING btree ("relationship_health");--> statement-breakpoint
CREATE INDEX "person_email_idx" ON "person" USING btree ("email");--> statement-breakpoint
CREATE INDEX "person_state_idx" ON "person" USING btree ("current_state");--> statement-breakpoint
CREATE INDEX "relationship_interaction_person_time_idx" ON "relationship_interaction" USING btree ("person_id","occurred_at");--> statement-breakpoint
CREATE INDEX "relationship_interaction_event_idx" ON "relationship_interaction" USING btree ("normalized_event_id");--> statement-breakpoint
CREATE INDEX "operational_review_cadence_generated_idx" ON "operational_review" USING btree ("cadence","generated_at");--> statement-breakpoint
CREATE INDEX "operational_review_period_idx" ON "operational_review" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_log_target_idx" ON "audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "brief_type_generated_idx" ON "brief" USING btree ("brief_type","generated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "impact_edge_unique" ON "impact_edge" USING btree ("source_node_id","target_node_id","edge_type");--> statement-breakpoint
CREATE INDEX "impact_edge_source_idx" ON "impact_edge" USING btree ("source_node_id");--> statement-breakpoint
CREATE INDEX "impact_edge_target_idx" ON "impact_edge" USING btree ("target_node_id");--> statement-breakpoint
CREATE INDEX "impact_node_type_idx" ON "impact_node" USING btree ("node_type");--> statement-breakpoint
CREATE INDEX "impact_node_object_idx" ON "impact_node" USING btree ("object_id");--> statement-breakpoint
CREATE INDEX "impact_node_score_idx" ON "impact_node" USING btree ("impact_score");--> statement-breakpoint
CREATE INDEX "notification_status_created_idx" ON "notification" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "source_vault_status_idx" ON "source_vault" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX "universal_object_type_status_idx" ON "universal_object" USING btree ("object_type","status");--> statement-breakpoint
CREATE INDEX "universal_object_memory_idx" ON "universal_object" USING btree ("memory_tier","relevance_score");--> statement-breakpoint
CREATE INDEX "universal_object_access_idx" ON "universal_object" USING btree ("last_accessed_at");--> statement-breakpoint
CREATE INDEX "waiting_loop_status_check_idx" ON "waiting_loop" USING btree ("status","next_check_at");--> statement-breakpoint
CREATE INDEX "context_packet_fingerprint_idx" ON "context_packet" USING btree ("fingerprint","expires_at");--> statement-breakpoint
CREATE INDEX "context_score_intent_idx" ON "context_score" USING btree ("intent_id","computed_at");--> statement-breakpoint
CREATE INDEX "context_score_object_idx" ON "context_score" USING btree ("object_id","computed_at");--> statement-breakpoint
CREATE INDEX "conversation_message_conversation_idx" ON "conversation_message" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "model_route_decision_created_idx" ON "model_route_decision" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "model_route_decision_correlation_idx" ON "model_route_decision" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "backup_archive_created_idx" ON "backup_archive" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "engine_registry_engine_id_idx" ON "engine_registry" USING btree ("engine_id");--> statement-breakpoint
CREATE INDEX "engine_registry_status_idx" ON "engine_registry" USING btree ("status");--> statement-breakpoint
CREATE INDEX "engine_registry_heartbeat_idx" ON "engine_registry" USING btree ("last_heartbeat");--> statement-breakpoint
CREATE INDEX "orchestration_queue_idx" ON "orchestration_work_item" USING btree ("status","priority","created_at");--> statement-breakpoint
CREATE INDEX "founder_profile_correction_dim_idx" ON "founder_profile_correction" USING btree ("profile_id","dimension","created_at");--> statement-breakpoint
CREATE INDEX "founder_profile_history_idx" ON "founder_profile_history" USING btree ("profile_id","version");--> statement-breakpoint
CREATE INDEX "observation_type_relevance_idx" ON "observation" USING btree ("observation_type","relevance_score");--> statement-breakpoint
CREATE INDEX "observation_generated_idx" ON "observation" USING btree ("generated_at");--> statement-breakpoint
CREATE INDEX "opportunity_type_relevance_idx" ON "opportunity" USING btree ("opportunity_type","relevance_score");--> statement-breakpoint
CREATE INDEX "opportunity_generated_idx" ON "opportunity" USING btree ("generated_at");--> statement-breakpoint
CREATE INDEX "trust_event_subsystem_idx" ON "trust_event" USING btree ("subsystem_name","timestamp");--> statement-breakpoint
CREATE INDEX "reflection_metric_dimension_period_idx" ON "reflection_metric" USING btree ("dimension","period");--> statement-breakpoint
CREATE INDEX "strategic_objective_horizon_status_idx" ON "strategic_objective" USING btree ("horizon","status");--> statement-breakpoint
CREATE INDEX "correction_category_captured_idx" ON "correction" USING btree ("category","captured_at");--> statement-breakpoint
CREATE INDEX "learning_asset_type_status_idx" ON "learning_asset" USING btree ("asset_type","status");--> statement-breakpoint
CREATE INDEX "standing_rule_status_idx" ON "standing_correction_rule" USING btree ("status");--> statement-breakpoint
CREATE INDEX "policy_consultation_type_created_idx" ON "policy_consultation" USING btree ("policy_type","created_at");--> statement-breakpoint
CREATE INDEX "policy_record_type_version_idx" ON "policy_record" USING btree ("policy_type","version");--> statement-breakpoint
CREATE INDEX "policy_record_active_idx" ON "policy_record" USING btree ("policy_type","superseded_at");--> statement-breakpoint
CREATE INDEX "resource_alert_active_idx" ON "resource_alert" USING btree ("level","resolved_at");--> statement-breakpoint
CREATE INDEX "resource_alert_created_idx" ON "resource_alert" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "resource_snapshot_sampled_idx" ON "resource_snapshot" USING btree ("sampled_at");--> statement-breakpoint
CREATE INDEX "resource_snapshot_state_idx" ON "resource_snapshot" USING btree ("overall_state");--> statement-breakpoint
CREATE INDEX "intent_type_created_idx" ON "intent_record" USING btree ("intent_type","created_at");--> statement-breakpoint
CREATE INDEX "intent_session_idx" ON "intent_record" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "intent_projects_idx" ON "intent_record" USING btree ("detected_project_ids");--> statement-breakpoint
CREATE INDEX "intent_people_idx" ON "intent_record" USING btree ("detected_person_ids");--> statement-breakpoint
CREATE INDEX "lee_state_current_idx" ON "lee_state" USING btree ("current_state");--> statement-breakpoint
CREATE INDEX "state_history_state_entered_idx" ON "state_history" USING btree ("state","entered_at");--> statement-breakpoint
CREATE INDEX "state_history_entered_idx" ON "state_history" USING btree ("entered_at");--> statement-breakpoint
CREATE INDEX "self_test_run_started_idx" ON "self_test_run" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "self_test_run_result_idx" ON "self_test_run" USING btree ("overall_result");--> statement-breakpoint
CREATE INDEX "boot_history_started_idx" ON "boot_history" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "aging_transition_object_idx" ON "aging_transition" USING btree ("object_id","created_at");--> statement-breakpoint
CREATE INDEX "world_state_signal_type_idx" ON "world_state_signal" USING btree ("signal_type","enabled");--> statement-breakpoint
CREATE INDEX "world_state_signal_updated_idx" ON "world_state_signal" USING btree ("last_updated_at");--> statement-breakpoint
CREATE INDEX "behavioral_signal_type_time_idx" ON "behavioral_signal" USING btree ("signal_type","occurred_at");--> statement-breakpoint
CREATE INDEX "operational_pattern_type_status_idx" ON "operational_pattern" USING btree ("pattern_type","status");--> statement-breakpoint
CREATE INDEX "initiative_active_idx" ON "initiative_item" USING btree ("dismissed_at","expires_at");--> statement-breakpoint
CREATE INDEX "initiative_dedupe_idx" ON "initiative_item" USING btree ("dedupe_key","generated_at");--> statement-breakpoint
CREATE INDEX "provider_registration_category_idx" ON "provider_registration" USING btree ("provider_category","current_status");--> statement-breakpoint
CREATE INDEX "internal_service_health_idx" ON "internal_capability_service" USING btree ("current_health","category");--> statement-breakpoint
CREATE INDEX "strategic_anchor_active_type_idx" ON "strategic_anchor" USING btree ("active","anchor_type");--> statement-breakpoint
CREATE INDEX "strategic_anchor_project_idx" ON "strategic_anchor" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "android_pairing_active_idx" ON "android_pairing" USING btree ("active","expires_at");--> statement-breakpoint
CREATE INDEX "desktop_setup_run_status_idx" ON "desktop_setup_run" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "local_service_contract_enabled_idx" ON "local_service_contract" USING btree ("enabled","updated_at");