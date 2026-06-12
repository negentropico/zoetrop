CREATE TABLE "practitioner_subject_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"practitioner_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"assigned_by" text NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "practitioner_subject_assignments" ADD CONSTRAINT "practitioner_subject_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practitioner_subject_assignments" ADD CONSTRAINT "practitioner_subject_assignments_practitioner_id_user_id_fk" FOREIGN KEY ("practitioner_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practitioner_subject_assignments" ADD CONSTRAINT "practitioner_subject_assignments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practitioner_subject_assignments" ADD CONSTRAINT "practitioner_subject_assignments_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_psa_tenant" ON "practitioner_subject_assignments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_psa_practitioner" ON "practitioner_subject_assignments" USING btree ("practitioner_id");--> statement-breakpoint
CREATE INDEX "idx_psa_subject" ON "practitioner_subject_assignments" USING btree ("subject_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_psa_active_unique" ON "practitioner_subject_assignments" USING btree ("tenant_id","practitioner_id","subject_id");