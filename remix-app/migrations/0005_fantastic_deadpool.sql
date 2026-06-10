-- Migration 0005: Add user.tenant_id (nullable) + create invites table
--
-- The 8 health-data tables (metrics, protocol_versions, protocol_changes,
-- milestones, supplements, supplement_log, correlations, cessation_log) already
-- have tenant_id/subject_id columns from migrations 0002–0004. Drizzle kit snapshot
-- drift means those columns were not tracked in the snapshot — this migration
-- corrects only the genuinely new additions.
--
-- Threat model: invites stores ONLY token_hash (SHA-256 hex of the raw token)
-- — no raw_token column exists (D-06 / T-031-INV-2).

-- Add nullable tenant_id to user table.
-- MUST be nullable: the live table already has the seeded owner row; NOT NULL
-- would fail with "column contains null values" before any backfill (Phase 3.1
-- expand-contract approach mirrors 0002 pattern).
ALTER TABLE "user" ADD COLUMN "tenant_id" text;
--> statement-breakpoint

-- Create the invites table (hand-rolled per D-06 — NOT the Better-Auth org plugin).
CREATE TABLE "invites" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"role" "app_role" NOT NULL,
	"tenant_id" text NOT NULL,
	"created_by" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"consumed_at" timestamp,
	"consumed_by" text,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "invites_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_consumed_by_user_id_fk" FOREIGN KEY ("consumed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_invites_tenant" ON "invites" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_invites_token_hash" ON "invites" USING btree ("token_hash");
