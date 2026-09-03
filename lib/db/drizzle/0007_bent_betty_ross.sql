CREATE TABLE "archive_manifest" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_hash" varchar(128) NOT NULL,
	"checksum_algorithm" varchar(32) DEFAULT 'sha256' NOT NULL,
	"source_id" uuid,
	"source_kind" varchar(48) NOT NULL,
	"source_owner" varchar(96) NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" varchar(160) NOT NULL,
	"byte_size" bigint,
	"source_path" text,
	"archive_path" text,
	"storage_tier" varchar(32) DEFAULT 'active' NOT NULL,
	"integrity_state" varchar(24) DEFAULT 'pending' NOT NULL,
	"retention_class" varchar(24) DEFAULT 'cold' NOT NULL,
	"retention_state" varchar(32) DEFAULT 'retained' NOT NULL,
	"protected_record" boolean DEFAULT false NOT NULL,
	"protection_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"retention_policy_key" varchar(64) NOT NULL,
	"backup_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"restore_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_verified_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "archive_manifest_content_hash_unique" UNIQUE("content_hash")
);
--> statement-breakpoint
CREATE TABLE "archive_representation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"archive_manifest_id" uuid NOT NULL,
	"layer_type" varchar(32) NOT NULL,
	"object_id" uuid,
	"storage_path" text,
	"content_hash" varchar(128),
	"checksum_algorithm" varchar(32) DEFAULT 'sha256' NOT NULL,
	"byte_size" bigint,
	"retention_state" varchar(32) DEFAULT 'retained' NOT NULL,
	"provenance_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retention_decision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"archive_manifest_id" uuid NOT NULL,
	"action" varchar(24) NOT NULL,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"reason" text NOT NULL,
	"requested_by" text DEFAULT 'retention-engine' NOT NULL,
	"decided_by" text,
	"decision_evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"decided_at" timestamp with time zone,
	"applied_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retention_policy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_key" varchar(64) NOT NULL,
	"source_kind" varchar(48) NOT NULL,
	"source_owner" varchar(96) NOT NULL,
	"hot_days" integer DEFAULT 7 NOT NULL,
	"warm_days" integer DEFAULT 30 NOT NULL,
	"cold_days" integer DEFAULT 365 NOT NULL,
	"preserve_original" boolean DEFAULT true NOT NULL,
	"preserve_derived" boolean DEFAULT true NOT NULL,
	"protected_by_default" boolean DEFAULT false NOT NULL,
	"reason" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "retention_policy_policy_key_unique" UNIQUE("policy_key")
);
--> statement-breakpoint
CREATE TABLE "storage_pressure_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage" varchar(40) DEFAULT 'normal' NOT NULL,
	"stage_order" integer DEFAULT 0 NOT NULL,
	"pressure_score" real DEFAULT 0 NOT NULL,
	"used_bytes" bigint,
	"tracked_bytes" bigint,
	"available_bytes" bigint,
	"action_summary" text NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "archive_manifest_source_idx" ON "archive_manifest" USING btree ("source_kind","source_id");--> statement-breakpoint
CREATE INDEX "archive_manifest_state_idx" ON "archive_manifest" USING btree ("storage_tier","integrity_state","retention_state");--> statement-breakpoint
CREATE INDEX "archive_manifest_retention_idx" ON "archive_manifest" USING btree ("retention_class","protected_record");--> statement-breakpoint
CREATE UNIQUE INDEX "archive_representation_manifest_layer_unique" ON "archive_representation" USING btree ("archive_manifest_id","layer_type");--> statement-breakpoint
CREATE INDEX "archive_representation_object_idx" ON "archive_representation" USING btree ("object_id","layer_type");--> statement-breakpoint
CREATE INDEX "retention_decision_manifest_idx" ON "retention_decision" USING btree ("archive_manifest_id","status");--> statement-breakpoint
CREATE INDEX "retention_decision_pending_idx" ON "retention_decision" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "retention_policy_source_idx" ON "retention_policy" USING btree ("source_kind","active");--> statement-breakpoint
CREATE INDEX "storage_pressure_observed_idx" ON "storage_pressure_snapshot" USING btree ("observed_at");--> statement-breakpoint
CREATE INDEX "storage_pressure_stage_idx" ON "storage_pressure_snapshot" USING btree ("stage_order","observed_at");