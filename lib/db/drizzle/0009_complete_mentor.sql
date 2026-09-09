CREATE TABLE "commitment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fingerprint" varchar(240) NOT NULL,
	"actor_type" varchar(32) DEFAULT 'unknown' NOT NULL,
	"actor_id" uuid,
	"actor_label" text,
	"recipient_type" varchar(32) DEFAULT 'unknown' NOT NULL,
	"recipient_id" uuid,
	"recipient_label" text,
	"direction" varchar(24) DEFAULT 'uncertain' NOT NULL,
	"commitment_type" varchar(32) DEFAULT 'promise' NOT NULL,
	"statement" text NOT NULL,
	"status" varchar(24) DEFAULT 'open' NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"inferred" boolean DEFAULT true NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completion_evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contradiction_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"person_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"organization_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"project_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"due_at" timestamp with time zone,
	"expected_response_at" timestamp with time zone,
	"last_meaningful_activity_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"importance_score" real DEFAULT 0.5 NOT NULL,
	"project_impact_score" real DEFAULT 0.5 NOT NULL,
	"cadence_days" integer,
	"source_ref" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commitment_fingerprint_unique" UNIQUE("fingerprint")
);
--> statement-breakpoint
CREATE TABLE "change_intelligence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fingerprint" varchar(240) NOT NULL,
	"event_id" uuid NOT NULL,
	"event_type" varchar(160) NOT NULL,
	"aggregate_type" varchar(160) NOT NULL,
	"aggregate_id" text NOT NULL,
	"entity_type" varchar(80) NOT NULL,
	"entity_id" text NOT NULL,
	"source" varchar(80) NOT NULL,
	"source_ref" text,
	"previous_state" jsonb,
	"current_state" jsonb,
	"change_kind" varchar(80) NOT NULL,
	"classification" varchar(16) NOT NULL,
	"significance_score" real NOT NULL,
	"confidence" real NOT NULL,
	"freshness" real NOT NULL,
	"causal_event_id" uuid,
	"correlation_id" uuid,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"explanation" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "change_intelligence_fingerprint_unique" UNIQUE("fingerprint")
);
--> statement-breakpoint
CREATE TABLE "change_intelligence_cursor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_key" varchar(160) NOT NULL,
	"last_opened_at" timestamp with time zone NOT NULL,
	"last_change_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "change_intelligence_cursor_scope_key_unique" UNIQUE("scope_key")
);
--> statement-breakpoint
CREATE TABLE "change_intelligence_projection" (
	"id" varchar(32) PRIMARY KEY DEFAULT 'main' NOT NULL,
	"last_created_at" timestamp with time zone,
	"last_event_id" uuid,
	"processed_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_repair_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"attempt_no" integer NOT NULL,
	"status" varchar(32) NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"retryable" boolean DEFAULT false NOT NULL,
	"error_class" varchar(64),
	"error_message" text,
	"input_hash" varchar(128),
	"output_hash" varchar(128),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "project_repair_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"step_id" uuid,
	"kind" varchar(48) NOT NULL,
	"source_ref" text NOT NULL,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content_hash" varchar(128) NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_repair_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" varchar(64) NOT NULL,
	"status" varchar(32) DEFAULT 'OBSERVED' NOT NULL,
	"requested_by" text DEFAULT 'owner' NOT NULL,
	"request" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"diagnosis" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"plan" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"plan_hash" varchar(128) NOT NULL,
	"evidence_bundle_hash" varchar(128),
	"governance_request_id" uuid,
	"owner_confirmed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "project_repair_step" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"step_key" varchar(96) NOT NULL,
	"operation" varchar(48) NOT NULL,
	"status" varchar(32) DEFAULT 'PENDING' NOT NULL,
	"input" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"depends_on" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"output" jsonb,
	"last_error" text,
	"retry_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_repair_step_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "project_repair_verification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"step_id" uuid,
	"verifier" varchar(96) NOT NULL,
	"expected" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"observed" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" varchar(16) NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"output_hash" varchar(128),
	"attempt_no" integer DEFAULT 0 NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "commitment_status_due_idx" ON "commitment" USING btree ("status","due_at");--> statement-breakpoint
CREATE INDEX "commitment_direction_activity_idx" ON "commitment" USING btree ("direction","last_meaningful_activity_at");--> statement-breakpoint
CREATE INDEX "commitment_actor_idx" ON "commitment" USING btree ("actor_type","actor_id");--> statement-breakpoint
CREATE INDEX "commitment_recipient_idx" ON "commitment" USING btree ("recipient_type","recipient_id");--> statement-breakpoint
CREATE INDEX "change_intelligence_occurred_idx" ON "change_intelligence" USING btree ("occurred_at","significance_score");--> statement-breakpoint
CREATE INDEX "change_intelligence_entity_idx" ON "change_intelligence" USING btree ("entity_type","entity_id","occurred_at");--> statement-breakpoint
CREATE INDEX "change_intelligence_source_idx" ON "change_intelligence" USING btree ("source","occurred_at");--> statement-breakpoint
CREATE INDEX "project_repair_attempt_step_idx" ON "project_repair_attempt" USING btree ("step_id","attempt_no");--> statement-breakpoint
CREATE INDEX "project_repair_attempt_run_idx" ON "project_repair_attempt" USING btree ("run_id","started_at");--> statement-breakpoint
CREATE INDEX "project_repair_evidence_run_idx" ON "project_repair_evidence" USING btree ("run_id","captured_at");--> statement-breakpoint
CREATE INDEX "project_repair_evidence_hash_idx" ON "project_repair_evidence" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "project_repair_run_project_idx" ON "project_repair_run" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "project_repair_run_status_idx" ON "project_repair_run" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "project_repair_step_run_idx" ON "project_repair_step" USING btree ("run_id","ordinal");--> statement-breakpoint
CREATE INDEX "project_repair_step_status_idx" ON "project_repair_step" USING btree ("status","retry_at");--> statement-breakpoint
CREATE INDEX "project_repair_verification_run_idx" ON "project_repair_verification" USING btree ("run_id","verified_at");--> statement-breakpoint
CREATE INDEX "project_repair_verification_result_idx" ON "project_repair_verification" USING btree ("result","verified_at");