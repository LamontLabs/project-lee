CREATE TABLE "android_pairing_invite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pairing_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"encrypted_pairing_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"consumed_device_id" text,
	CONSTRAINT "android_pairing_invite_token_hash_key" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "android_pairing_invite" ADD CONSTRAINT "android_pairing_invite_pairing_id_fkey" FOREIGN KEY ("pairing_id") REFERENCES "public"."android_pairing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "android_pairing_invite_active_idx" ON "android_pairing_invite" USING btree ("expires_at","consumed_at");--> statement-breakpoint
CREATE INDEX "android_pairing_invite_pairing_idx" ON "android_pairing_invite" USING btree ("pairing_id");