CREATE TABLE "k6_authority_rehearsal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" varchar(24) DEFAULT 'incomplete' NOT NULL,
	"simulation_only" boolean DEFAULT true NOT NULL,
	"owner_approved" boolean DEFAULT false NOT NULL,
	"rollback_criteria" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"backup_id" varchar(160),
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "k6_authority_rehearsal_status_idx" ON "k6_authority_rehearsal" USING btree ("status","updated_at");
--> statement-breakpoint
CREATE INDEX "k6_authority_rehearsal_created_idx" ON "k6_authority_rehearsal" USING btree ("created_at");