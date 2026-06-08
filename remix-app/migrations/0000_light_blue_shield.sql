CREATE TYPE "public"."cessation_phase" AS ENUM('acute', 'stabilization', 'clearing', 'optimization');--> statement-breakpoint
CREATE TYPE "public"."data_source" AS ENUM('manual', 'whoop', 'dexa', 'bloodwork', 'csv', 'vault');--> statement-breakpoint
CREATE TYPE "public"."metric_category" AS ENUM('vitamins', 'minerals', 'inflammatory', 'metabolic', 'hormones', 'autonomic', 'bodyComposition', 'lipids', 'hematology');--> statement-breakpoint
CREATE TYPE "public"."metric_status" AS ENUM('optimal', 'borderline', 'deficient', 'excess');--> statement-breakpoint
CREATE TYPE "public"."protocol_change_type" AS ENUM('added', 'removed', 'dosage_changed', 'timing_changed', 'frequency_changed');--> statement-breakpoint
CREATE TYPE "public"."supplement_tier" AS ENUM('tier1', 'tier2', 'tier3', 'as_needed');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('local', 'synced', 'pending');--> statement-breakpoint
CREATE TABLE "cessation_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "cessation_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"start_date" timestamp NOT NULL,
	"current_phase" "cessation_phase" DEFAULT 'acute' NOT NULL,
	"end_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "correlations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "correlations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"supplement_id" integer NOT NULL,
	"metric_name" varchar(255) NOT NULL,
	"correlation" real NOT NULL,
	"lag_days" integer DEFAULT 0 NOT NULL,
	"sample_size" integer NOT NULL,
	"p_value" real,
	"calculated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "metrics" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"value" real NOT NULL,
	"unit" varchar(50) NOT NULL,
	"category" "metric_category" NOT NULL,
	"subcategory" varchar(100),
	"timestamp" timestamp NOT NULL,
	"description" text,
	"improvement" varchar(50) NOT NULL,
	"reference_min" real,
	"reference_max" real,
	"optimal_min" real,
	"optimal_max" real,
	"source" "data_source" NOT NULL,
	"sync_status" "sync_status" DEFAULT 'local' NOT NULL,
	"sync_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "milestones_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"date" timestamp NOT NULL,
	"description" text NOT NULL,
	"protocol_version" varchar(10),
	"biometric_snapshot" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "protocol_changes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "protocol_changes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"version_id" integer NOT NULL,
	"supplement_name" varchar(255) NOT NULL,
	"change_type" "protocol_change_type" NOT NULL,
	"old_dosage" varchar(100),
	"new_dosage" varchar(100),
	"rationale" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "protocol_versions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "protocol_versions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"version" varchar(10) NOT NULL,
	"effective_date" timestamp NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "protocol_versions_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "supplement_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "supplement_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"supplement_id" integer NOT NULL,
	"taken_at" timestamp NOT NULL,
	"dosage" real,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supplements" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "supplements_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"dosage" real NOT NULL,
	"unit" varchar(50) NOT NULL,
	"frequency" varchar(100) NOT NULL,
	"tier" "supplement_tier" NOT NULL,
	"genetic_basis" text,
	"timing" varchar(100),
	"notes" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "correlations" ADD CONSTRAINT "correlations_supplement_id_supplements_id_fk" FOREIGN KEY ("supplement_id") REFERENCES "public"."supplements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_changes" ADD CONSTRAINT "protocol_changes_version_id_protocol_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."protocol_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplement_log" ADD CONSTRAINT "supplement_log_supplement_id_supplements_id_fk" FOREIGN KEY ("supplement_id") REFERENCES "public"."supplements"("id") ON DELETE no action ON UPDATE no action;