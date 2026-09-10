CREATE TABLE "personality_evolution_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"personality_id" uuid NOT NULL,
	"from_version" integer,
	"to_version" integer NOT NULL,
	"action" varchar(24) NOT NULL,
	"reason" text NOT NULL,
	"evidence_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"actor" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personality_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_key" varchar(64) DEFAULT 'primary' NOT NULL,
	"version" integer NOT NULL,
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"sections" jsonb NOT NULL,
	"provenance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"change_reason" text NOT NULL,
	"proposed_by" varchar(120) NOT NULL,
	"reviewed_by" varchar(120),
	"reviewed_at" timestamp with time zone,
	"confirmed_by_owner" boolean DEFAULT false NOT NULL,
	"safety_status" varchar(24) DEFAULT 'passed' NOT NULL,
	"checksum" varchar(128) NOT NULL,
	"supersedes_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "personality_evolution_history_version_idx" ON "personality_evolution_history" USING btree ("personality_id","to_version","created_at");--> statement-breakpoint
CREATE INDEX "personality_memory_profile_version_idx" ON "personality_memory" USING btree ("profile_key","version");--> statement-breakpoint
CREATE INDEX "personality_memory_status_idx" ON "personality_memory" USING btree ("profile_key","status");