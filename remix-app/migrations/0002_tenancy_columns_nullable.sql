-- Custom migration: Add nullable tenant_id/subject_id to all 8 data tables
-- + Drop global protocol_versions_version_unique constraint
-- Part of the expand-contract sequence: columns are nullable here;
-- backfill lands in Plan 04 migration 0003, NOT NULL + composite unique in Plan 04 migration 0004.
-- Pitfall 6: DROP old UNIQUE before the composite UNIQUE is added (Plan 04) to avoid two constraints.

ALTER TABLE "protocol_versions" DROP CONSTRAINT "protocol_versions_version_unique";--> statement-breakpoint
ALTER TABLE "cessation_log" ADD COLUMN "tenant_id" text;--> statement-breakpoint
ALTER TABLE "cessation_log" ADD COLUMN "subject_id" text;--> statement-breakpoint
ALTER TABLE "correlations" ADD COLUMN "tenant_id" text;--> statement-breakpoint
ALTER TABLE "correlations" ADD COLUMN "subject_id" text;--> statement-breakpoint
ALTER TABLE "metrics" ADD COLUMN "tenant_id" text;--> statement-breakpoint
ALTER TABLE "metrics" ADD COLUMN "subject_id" text;--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "tenant_id" text;--> statement-breakpoint
ALTER TABLE "milestones" ADD COLUMN "subject_id" text;--> statement-breakpoint
ALTER TABLE "protocol_changes" ADD COLUMN "tenant_id" text;--> statement-breakpoint
ALTER TABLE "protocol_changes" ADD COLUMN "subject_id" text;--> statement-breakpoint
ALTER TABLE "protocol_versions" ADD COLUMN "tenant_id" text;--> statement-breakpoint
ALTER TABLE "protocol_versions" ADD COLUMN "subject_id" text;--> statement-breakpoint
ALTER TABLE "supplement_log" ADD COLUMN "tenant_id" text;--> statement-breakpoint
ALTER TABLE "supplement_log" ADD COLUMN "subject_id" text;--> statement-breakpoint
ALTER TABLE "supplements" ADD COLUMN "tenant_id" text;--> statement-breakpoint
ALTER TABLE "supplements" ADD COLUMN "subject_id" text;--> statement-breakpoint
ALTER TABLE "cessation_log" ADD CONSTRAINT "cessation_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cessation_log" ADD CONSTRAINT "cessation_log_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "correlations" ADD CONSTRAINT "correlations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "correlations" ADD CONSTRAINT "correlations_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_changes" ADD CONSTRAINT "protocol_changes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_changes" ADD CONSTRAINT "protocol_changes_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_versions" ADD CONSTRAINT "protocol_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_versions" ADD CONSTRAINT "protocol_versions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplement_log" ADD CONSTRAINT "supplement_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplement_log" ADD CONSTRAINT "supplement_log_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplements" ADD CONSTRAINT "supplements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplements" ADD CONSTRAINT "supplements_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;
