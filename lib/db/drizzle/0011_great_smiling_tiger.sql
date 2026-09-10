CREATE TABLE "provider_freshness" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" varchar(80) NOT NULL,
	"state" varchar(24) DEFAULT 'unverified' NOT NULL,
	"last_successful_refresh_at" timestamp with time zone,
	"last_attempted_refresh_at" timestamp with time zone,
	"last_failure_at" timestamp with time zone,
	"evidence_age_ms" bigint,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"active_period_started_at" timestamp with time zone,
	"last_reconnected_at" timestamp with time zone,
	"limitations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_freshness_provider_id_unique" UNIQUE("provider_id")
);
--> statement-breakpoint
CREATE TABLE "provider_freshness_period" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" varchar(80) NOT NULL,
	"state" varchar(24) NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"last_successful_refresh_at" timestamp with time zone,
	"evidence_age_ms" bigint,
	"limitations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "provider_freshness_state_idx" ON "provider_freshness" USING btree ("state");--> statement-breakpoint
CREATE INDEX "provider_freshness_period_provider_idx" ON "provider_freshness_period" USING btree ("provider_id","started_at");