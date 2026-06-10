CREATE TYPE "public"."confidence_level" AS ENUM('high', 'low');--> statement-breakpoint
CREATE TYPE "public"."lab_doc_status" AS ENUM('uploaded', 'processing', 'pending_review', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."lab_extraction_status" AS ENUM('pending_review', 'approved', 'rejected');--> statement-breakpoint
ALTER TYPE "public"."data_source" ADD VALUE 'lab';--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"role" "app_role" NOT NULL,
	"action" varchar(50) NOT NULL,
	"table_name" varchar(100),
	"operation" varchar(20),
	"tenant_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"entity_id" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "consent_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"subject_id" text NOT NULL,
	"consented_at" timestamp NOT NULL,
	"consent_version" varchar(50) NOT NULL,
	"consented_by_user_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lab_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"uploaded_by" text NOT NULL,
	"status" "lab_doc_status" DEFAULT 'uploaded' NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"pdf_bytes" text,
	"page_count" integer,
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lab_extractions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lab_extractions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"lab_document_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"raw_analyte_name" varchar(255) NOT NULL,
	"raw_value" real NOT NULL,
	"raw_unit" varchar(50) NOT NULL,
	"source_text_snippet" text,
	"page_number" integer,
	"confidence" "confidence_level" DEFAULT 'high' NOT NULL,
	"range_flag" varchar(50),
	"unrecognized" boolean DEFAULT false NOT NULL,
	"resolved_metric_name" varchar(255),
	"resolved_category" "metric_category",
	"resolved_subcategory" varchar(100),
	"resolved_unit" varchar(50),
	"resolved_reference_min" real,
	"resolved_reference_max" real,
	"resolved_optimal_min" real,
	"resolved_optimal_max" real,
	"resolved_improvement" varchar(50),
	"status" "lab_extraction_status" DEFAULT 'pending_review' NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by" text,
	"approved_value" real,
	"approved_unit" varchar(50),
	"committed_metric_id" varchar(36),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_log" ADD CONSTRAINT "consent_log_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_log" ADD CONSTRAINT "consent_log_consented_by_user_id_user_id_fk" FOREIGN KEY ("consented_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_documents" ADD CONSTRAINT "lab_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_documents" ADD CONSTRAINT "lab_documents_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_documents" ADD CONSTRAINT "lab_documents_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_extractions" ADD CONSTRAINT "lab_extractions_lab_document_id_lab_documents_id_fk" FOREIGN KEY ("lab_document_id") REFERENCES "public"."lab_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_extractions" ADD CONSTRAINT "lab_extractions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_extractions" ADD CONSTRAINT "lab_extractions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_extractions" ADD CONSTRAINT "lab_extractions_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_extractions" ADD CONSTRAINT "lab_extractions_committed_metric_id_metrics_id_fk" FOREIGN KEY ("committed_metric_id") REFERENCES "public"."metrics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_log_tenant_subject" ON "audit_log" USING btree ("tenant_id","subject_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_timestamp" ON "audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_consent_log_subject" ON "consent_log" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "idx_lab_documents_tenant_subject" ON "lab_documents" USING btree ("tenant_id","subject_id");--> statement-breakpoint
CREATE INDEX "idx_lab_documents_status" ON "lab_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_lab_extractions_doc" ON "lab_extractions" USING btree ("lab_document_id");--> statement-breakpoint
CREATE INDEX "idx_lab_extractions_tenant_subject" ON "lab_extractions" USING btree ("tenant_id","subject_id");