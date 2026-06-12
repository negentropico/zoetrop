CREATE TYPE "public"."evidence_tier" AS ENUM('k1', 'k2', 'k3', 'k4');--> statement-breakpoint
CREATE TABLE "genetic_variants" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "genetic_variants_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"gene" varchar(100) NOT NULL,
	"rsid" varchar(20),
	"genotype_pattern" varchar(50),
	"category" varchar(50) NOT NULL,
	"impact" varchar(50) NOT NULL,
	"clinical_implication" text NOT NULL,
	"knowledge_source" varchar(255),
	"corpus_version" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "metric_protocol_map" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "metric_protocol_map_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"metric_name" varchar(255) NOT NULL,
	"condition_status" varchar(50) NOT NULL,
	"category" "metric_category" NOT NULL,
	"evidence_tier" "evidence_tier" NOT NULL,
	"recommendation_text" text NOT NULL,
	"evidence_citation" text,
	"action_detail" text,
	"corpus_version" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"generated_by" text NOT NULL,
	"corpus_version" varchar(50) NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "variant_protocol_map" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "variant_protocol_map_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"variant_id" integer NOT NULL,
	"evidence_tier" "evidence_tier" NOT NULL,
	"recommendation_text" text NOT NULL,
	"evidence_citation" text,
	"action_detail" text,
	"corpus_version" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_generated_by_user_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_protocol_map" ADD CONSTRAINT "variant_protocol_map_variant_id_genetic_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."genetic_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_genetic_variants_gene" ON "genetic_variants" USING btree ("gene");--> statement-breakpoint
CREATE INDEX "idx_metric_protocol_map_name" ON "metric_protocol_map" USING btree ("metric_name");--> statement-breakpoint
CREATE INDEX "idx_metric_protocol_map_category" ON "metric_protocol_map" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_reports_tenant_subject" ON "reports" USING btree ("tenant_id","subject_id");--> statement-breakpoint
CREATE INDEX "idx_variant_protocol_map_variant" ON "variant_protocol_map" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_variant_protocol_map_tier" ON "variant_protocol_map" USING btree ("evidence_tier");