CREATE TABLE "cognitive_runtime_cycle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"runtime_key" varchar(48) DEFAULT 'primary' NOT NULL,
	"cycle_number" integer DEFAULT 1 NOT NULL,
	"trigger" varchar(48) DEFAULT 'scheduled' NOT NULL,
	"status" varchar(24) DEFAULT 'running' NOT NULL,
	"model_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model_states" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_window_start" timestamp with time zone,
	"evidence_window_end" timestamp with time zone,
	"stale_models" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"degraded_models" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"continuity" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"model_config_fingerprint" varchar(128) NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"next_refresh_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cognitive_runtime_model" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"runtime_key" varchar(48) DEFAULT 'primary' NOT NULL,
	"model_key" varchar(48) NOT NULL,
	"model_type" varchar(80) NOT NULL,
	"source_engine" varchar(120) NOT NULL,
	"engine_version" varchar(48),
	"status" varchar(24) DEFAULT 'unavailable' NOT NULL,
	"freshness" real DEFAULT 0 NOT NULL,
	"evidence_window_start" timestamp with time zone,
	"evidence_window_end" timestamp with time zone,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"degraded_reason" text,
	"last_refreshed_at" timestamp with time zone,
	"next_refresh_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "cognitive_runtime_cycle_number_unique" ON "cognitive_runtime_cycle" USING btree ("runtime_key","cycle_number");--> statement-breakpoint
CREATE INDEX "cognitive_runtime_cycle_created_idx" ON "cognitive_runtime_cycle" USING btree ("runtime_key","created_at");--> statement-breakpoint
CREATE INDEX "cognitive_runtime_cycle_status_idx" ON "cognitive_runtime_cycle" USING btree ("status","next_refresh_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cognitive_runtime_model_key_unique" ON "cognitive_runtime_model" USING btree ("runtime_key","model_key");--> statement-breakpoint
CREATE INDEX "cognitive_runtime_model_status_idx" ON "cognitive_runtime_model" USING btree ("status","next_refresh_at");