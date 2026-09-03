CREATE TABLE "belief_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"belief_key" varchar(200) NOT NULL,
	"conclusion" text NOT NULL,
	"interpretation_id" uuid,
	"prior_belief_id" uuid,
	"state" varchar(24) DEFAULT 'current' NOT NULL,
	"contradiction_state" varchar(24) DEFAULT 'none' NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contradiction_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"revision_reason" text,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"source_ref" text NOT NULL,
	"generated_by_engine" varchar(120) DEFAULT 'unknown' NOT NULL,
	"generated_by" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "causal_claim" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim" text NOT NULL,
	"cause" text NOT NULL,
	"effect" text NOT NULL,
	"relationship_type" varchar(24) DEFAULT 'causal' NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"source_ref" text NOT NULL,
	"explicitness" varchar(16) DEFAULT 'inferred' NOT NULL,
	"alternatives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"interpretation_id" uuid,
	"generated_by_engine" varchar(120) DEFAULT 'unknown' NOT NULL,
	"generated_by" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(24) DEFAULT 'unreviewed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_gap" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"importance" real DEFAULT 0.5 NOT NULL,
	"reason" text NOT NULL,
	"objective_id" text,
	"possible_evidence_sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"affected_object_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_investigated_at" timestamp with time zone,
	"next_allowed_action" varchar(32) DEFAULT 'investigate' NOT NULL,
	"status" varchar(24) DEFAULT 'open' NOT NULL,
	"source_ref" text NOT NULL,
	"created_by_engine" varchar(120) DEFAULT 'unknown' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prediction_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"statement" text NOT NULL,
	"horizon" text NOT NULL,
	"horizon_start" timestamp with time zone,
	"horizon_end" timestamp with time zone,
	"supporting_evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reasoning" text NOT NULL,
	"confidence_lower" real DEFAULT 0 NOT NULL,
	"confidence_upper" real DEFAULT 1 NOT NULL,
	"eventual_outcome" text,
	"outcome_observed_at" timestamp with time zone,
	"accuracy_result" varchar(24) DEFAULT 'pending' NOT NULL,
	"derived_lesson" text,
	"status" varchar(24) DEFAULT 'open' NOT NULL,
	"interpretation_id" uuid,
	"belief_id" uuid,
	"source_ref" text NOT NULL,
	"generated_by_engine" varchar(120) DEFAULT 'unknown' NOT NULL,
	"generated_by" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "belief_state_key_created_idx" ON "belief_state" USING btree ("belief_key","created_at");--> statement-breakpoint
CREATE INDEX "belief_state_state_idx" ON "belief_state" USING btree ("state","updated_at");--> statement-breakpoint
CREATE INDEX "belief_state_prior_idx" ON "belief_state" USING btree ("prior_belief_id");--> statement-breakpoint
CREATE INDEX "belief_state_interpretation_idx" ON "belief_state" USING btree ("interpretation_id");--> statement-breakpoint
CREATE INDEX "causal_claim_status_idx" ON "causal_claim" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "causal_claim_interpretation_idx" ON "causal_claim" USING btree ("interpretation_id");--> statement-breakpoint
CREATE INDEX "knowledge_gap_status_importance_idx" ON "knowledge_gap" USING btree ("status","importance");--> statement-breakpoint
CREATE INDEX "knowledge_gap_objective_idx" ON "knowledge_gap" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "knowledge_gap_updated_idx" ON "knowledge_gap" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "prediction_status_horizon_idx" ON "prediction_record" USING btree ("status","horizon_end");--> statement-breakpoint
CREATE INDEX "prediction_interpretation_idx" ON "prediction_record" USING btree ("interpretation_id");--> statement-breakpoint
CREATE INDEX "prediction_belief_idx" ON "prediction_record" USING btree ("belief_id");