CREATE TABLE "memory_consolidation_phase" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"phase" varchar(64) NOT NULL,
	"phase_order" integer NOT NULL,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"idempotency_key" varchar(240) NOT NULL,
	"input_evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"output_evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"result_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"skipped_reason" text,
	"failure_reason" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"last_heartbeat_at" timestamp with time zone,
	"attempt" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_consolidation_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_key" varchar(180) NOT NULL,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"current_phase" varchar(64) DEFAULT 'observe_changes' NOT NULL,
	"priority" varchar(16) DEFAULT 'LOW' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"last_heartbeat_at" timestamp with time zone,
	"resumed_from_run_id" uuid,
	"attempt" integer DEFAULT 0 NOT NULL,
	"input_evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"output_evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skipped_work" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"unresolved_conflict_count" integer DEFAULT 0 NOT NULL,
	"failure_phase" varchar(64),
	"failure_reason" text,
	"next_scheduled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memory_consolidation_run_run_key_unique" UNIQUE("run_key")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "memory_consolidation_phase_run_phase_unique" ON "memory_consolidation_phase" USING btree ("run_id","phase");--> statement-breakpoint
CREATE UNIQUE INDEX "memory_consolidation_phase_idempotency_unique" ON "memory_consolidation_phase" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "memory_consolidation_phase_status_idx" ON "memory_consolidation_phase" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "memory_consolidation_run_status_idx" ON "memory_consolidation_run" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "memory_consolidation_run_next_idx" ON "memory_consolidation_run" USING btree ("next_scheduled_at");