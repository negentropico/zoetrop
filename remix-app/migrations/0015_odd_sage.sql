CREATE TYPE "public"."biological_sex" AS ENUM('male', 'female', 'intersex');--> statement-breakpoint
CREATE TYPE "public"."program_type" AS ENUM('cessation', 'substance_taper', 'lifestyle_modification', 'general');--> statement-breakpoint
DROP INDEX "idx_psa_active_unique";--> statement-breakpoint
ALTER TABLE "audit_log" ALTER COLUMN "subject_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "invites" ADD COLUMN "subject_id" text;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "dob" timestamp;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "biological_sex" "biological_sex";--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "contact_email" varchar(255);--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "contact_phone" varchar(50);--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "goals" text;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "intake_notes" text;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "program_type" "program_type";--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "program_start_date" timestamp;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_psa_active_unique" ON "practitioner_subject_assignments" USING btree ("tenant_id","practitioner_id","subject_id") WHERE revoked_at IS NULL;