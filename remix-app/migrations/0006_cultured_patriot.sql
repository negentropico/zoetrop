CREATE TABLE "subject_genotypes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subject_genotypes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"gene" varchar(100) NOT NULL,
	"rsid" varchar(20),
	"genotype" varchar(50) NOT NULL,
	"assay_source" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"tenant_id" text NOT NULL,
	"subject_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "supplements" ALTER COLUMN "is_active" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "supplements" ALTER COLUMN "is_active" SET DATA TYPE boolean USING is_active::boolean;--> statement-breakpoint
ALTER TABLE "supplements" ALTER COLUMN "is_active" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "subject_genotypes" ADD CONSTRAINT "subject_genotypes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_genotypes" ADD CONSTRAINT "subject_genotypes_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_subject_genotypes_tenant_subject" ON "subject_genotypes" USING btree ("tenant_id","subject_id");--> statement-breakpoint
ALTER TABLE "metrics" DROP COLUMN "sync_status";--> statement-breakpoint
ALTER TABLE "metrics" DROP COLUMN "sync_version";--> statement-breakpoint
DROP TYPE "public"."sync_status";