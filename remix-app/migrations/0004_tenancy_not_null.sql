-- Custom migration: Set tenant_id/subject_id NOT NULL on all 8 data tables,
-- add composite (tenant_id, subject_id) index on each (TEN-01),
-- and add the per-subject UNIQUE(tenant_id, subject_id, version) on protocol_versions (TEN-04).
--
-- Prerequisites (must run BEFORE this migration):
--   0003_tenancy_backfill.sql — all rows must have non-null tenant_id/subject_id.
--   The SET NOT NULL below will fail loudly if any row is still NULL (the guardrail).
--
-- NOTE: drizzle-kit migrate runs in a transaction; standard index creation
--   (not the non-transactional variant) is used to keep the migration atomic.

ALTER TABLE "metrics"           ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "metrics"           ALTER COLUMN "subject_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "protocol_versions" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "protocol_versions" ALTER COLUMN "subject_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "protocol_changes"  ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "protocol_changes"  ALTER COLUMN "subject_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "milestones"        ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "milestones"        ALTER COLUMN "subject_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "supplements"       ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "supplements"       ALTER COLUMN "subject_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "supplement_log"    ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "supplement_log"    ALTER COLUMN "subject_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "correlations"      ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "correlations"      ALTER COLUMN "subject_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cessation_log"     ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cessation_log"     ALTER COLUMN "subject_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_metrics_tenant_subject"           ON "metrics"("tenant_id","subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_protocol_versions_tenant_subject" ON "protocol_versions"("tenant_id","subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_protocol_changes_tenant_subject"  ON "protocol_changes"("tenant_id","subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_milestones_tenant_subject"        ON "milestones"("tenant_id","subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_supplements_tenant_subject"       ON "supplements"("tenant_id","subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_supplement_log_tenant_subject"    ON "supplement_log"("tenant_id","subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_correlations_tenant_subject"      ON "correlations"("tenant_id","subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cessation_log_tenant_subject"     ON "cessation_log"("tenant_id","subject_id");--> statement-breakpoint
ALTER TABLE "protocol_versions" ADD CONSTRAINT "protocol_versions_tenant_subject_version_unique" UNIQUE ("tenant_id", "subject_id", "version");
