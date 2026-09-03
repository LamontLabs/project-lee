CREATE TABLE "working_memory" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "scope_key" varchar(256) NOT NULL,
  "session_id" text,
  "objective_id" text,
  "version" integer DEFAULT 1 NOT NULL,
  "fingerprint" varchar(128) NOT NULL,
  "envelope" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "selected_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "excluded_refs" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "token_estimate" integer DEFAULT 0 NOT NULL,
  "attention_score" real DEFAULT 0 NOT NULL,
  "last_reason" text DEFAULT 'Context packet refresh' NOT NULL,
  "last_assembled_at" timestamp with time zone DEFAULT now() NOT NULL,
  "rebuilt_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "working_memory_scope_unique" ON "working_memory" USING btree ("scope_key");
--> statement-breakpoint
CREATE INDEX "working_memory_updated_idx" ON "working_memory" USING btree ("updated_at");
--> statement-breakpoint
CREATE INDEX "working_memory_session_idx" ON "working_memory" USING btree ("session_id");