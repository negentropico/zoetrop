-- 0011_rls_policies.sql
-- Phase 7: Atomic RLS enable + policies for all tenant/subject-scoped PHI tables.
-- Hand-authored — RLS DDL is not tracked by Drizzle's schema diffing.
--
-- REHEARSE on a Neon branch before applying to the live project (D-10).
-- See Task 3 checkpoint in 07-02-PLAN.md for the rehearsal + rollback procedure.
--
-- =============================================================================
-- TABLES INTENTIONALLY EXCLUDED FROM RLS
-- =============================================================================
-- Better-Auth managed tables — adapter queries run pre-context (Pitfall 4):
--   user, session, account, verification, invites
-- Non-PHI corpus tables — population-level knowledge, no tenant scoping needed:
--   genetic_variants, variant_protocol_map, metric_protocol_map
-- Admin-only table — no app_user access path:
--   tenants
--
-- =============================================================================
-- ROLLBACK PROCEDURE
-- =============================================================================
-- If this migration needs to be reversed, run the following SQL (on the target
-- Neon project or branch) after connecting as neondb_owner:
--
--   ALTER TABLE metrics DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE protocol_versions DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE protocol_changes DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE milestones DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE supplements DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE supplement_log DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE correlations DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE cessation_log DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE subject_genotypes DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE lab_documents DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE lab_extractions DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE practitioner_subject_assignments DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE consent_log DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;
--
--   DROP POLICY IF EXISTS "tenant_subject_isolation" ON metrics;
--   DROP POLICY IF EXISTS "tenant_subject_isolation" ON protocol_versions;
--   DROP POLICY IF EXISTS "tenant_subject_isolation" ON protocol_changes;
--   DROP POLICY IF EXISTS "tenant_subject_isolation" ON milestones;
--   DROP POLICY IF EXISTS "tenant_subject_isolation" ON supplements;
--   DROP POLICY IF EXISTS "tenant_subject_isolation" ON supplement_log;
--   DROP POLICY IF EXISTS "tenant_subject_isolation" ON correlations;
--   DROP POLICY IF EXISTS "tenant_subject_isolation" ON cessation_log;
--   DROP POLICY IF EXISTS "tenant_subject_isolation" ON subject_genotypes;
--   DROP POLICY IF EXISTS "tenant_subject_isolation" ON lab_documents;
--   DROP POLICY IF EXISTS "tenant_subject_isolation" ON lab_extractions;
--   DROP POLICY IF EXISTS "tenant_subject_isolation" ON reports;
--   DROP POLICY IF EXISTS "tenant_isolation" ON subjects;
--   DROP POLICY IF EXISTS "psa_tenant_isolation" ON practitioner_subject_assignments;
--   DROP POLICY IF EXISTS "subject_isolation" ON consent_log;
--   DROP POLICY IF EXISTS "audit_immutable_select" ON audit_log;
--   DROP POLICY IF EXISTS "audit_insert_only" ON audit_log;
--
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM app_user;
--   REVOKE USAGE ON ALL SEQUENCES IN SCHEMA public FROM app_user;
--   REVOKE USAGE ON SCHEMA public FROM app_user;
--   DROP ROLE IF EXISTS app_user;
--
-- =============================================================================

-- =============================================================================
-- STEP 1: Create the NOBYPASSRLS app_user role (idempotent)
-- 01-SPIKE-FINDINGS line 24: app DB role MUST be NOBYPASSRLS;
-- neondb_owner has rolbypassrls=true and silently bypasses RLS.
-- =============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT LOGIN;
  END IF;
END $$;--> statement-breakpoint

-- =============================================================================
-- STEP 2: Grant DML (not ownership) to app_user
-- app_user gets SELECT/INSERT/UPDATE/DELETE on all tables — RLS policies are
-- the enforcement layer. Revoke UPDATE/DELETE on audit_log as defense-in-depth.
-- =============================================================================
GRANT USAGE ON SCHEMA public TO app_user;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;--> statement-breakpoint
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;--> statement-breakpoint
-- Defense-in-depth: audit_log immutability enforced at both GRANT and RLS levels (D-08)
REVOKE UPDATE, DELETE ON audit_log FROM app_user;--> statement-breakpoint

-- =============================================================================
-- STEP 3: Enable + Force RLS on the 12 tenant+subject-scoped tables
-- FORCE ROW LEVEL SECURITY is required so the table owner (neondb_owner) is
-- also subject to RLS when SET LOCAL ROLE app_user is active.
-- (01-SPIKE-FINDINGS line 26)
-- GUC predicate pattern (host-portable, D-02):
--   NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
--   NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
-- Empty-claims guard: NULLIF(...,'') returns NULL when unset → fail-closed.
-- (01-SPIKE-FINDINGS line 32)
-- =============================================================================

ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE metrics FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_subject_isolation" ON metrics
  FOR ALL TO app_user
  USING (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  )
  WITH CHECK (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  );--> statement-breakpoint

ALTER TABLE protocol_versions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE protocol_versions FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_subject_isolation" ON protocol_versions
  FOR ALL TO app_user
  USING (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  )
  WITH CHECK (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  );--> statement-breakpoint

ALTER TABLE protocol_changes ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE protocol_changes FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_subject_isolation" ON protocol_changes
  FOR ALL TO app_user
  USING (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  )
  WITH CHECK (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  );--> statement-breakpoint

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE milestones FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_subject_isolation" ON milestones
  FOR ALL TO app_user
  USING (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  )
  WITH CHECK (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  );--> statement-breakpoint

ALTER TABLE supplements ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE supplements FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_subject_isolation" ON supplements
  FOR ALL TO app_user
  USING (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  )
  WITH CHECK (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  );--> statement-breakpoint

ALTER TABLE supplement_log ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE supplement_log FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_subject_isolation" ON supplement_log
  FOR ALL TO app_user
  USING (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  )
  WITH CHECK (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  );--> statement-breakpoint

ALTER TABLE correlations ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE correlations FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_subject_isolation" ON correlations
  FOR ALL TO app_user
  USING (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  )
  WITH CHECK (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  );--> statement-breakpoint

ALTER TABLE cessation_log ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE cessation_log FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_subject_isolation" ON cessation_log
  FOR ALL TO app_user
  USING (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  )
  WITH CHECK (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  );--> statement-breakpoint

ALTER TABLE subject_genotypes ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE subject_genotypes FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_subject_isolation" ON subject_genotypes
  FOR ALL TO app_user
  USING (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  )
  WITH CHECK (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  );--> statement-breakpoint

ALTER TABLE lab_documents ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE lab_documents FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_subject_isolation" ON lab_documents
  FOR ALL TO app_user
  USING (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  )
  WITH CHECK (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  );--> statement-breakpoint

ALTER TABLE lab_extractions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE lab_extractions FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_subject_isolation" ON lab_extractions
  FOR ALL TO app_user
  USING (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  )
  WITH CHECK (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  );--> statement-breakpoint

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE reports FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_subject_isolation" ON reports
  FOR ALL TO app_user
  USING (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  )
  WITH CHECK (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
    AND NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  );--> statement-breakpoint

-- =============================================================================
-- STEP 4: subjects — tenant-only policy (no subject_id self-scope needed;
-- subjects rows are scoped by tenant_id only — a practitioner sees all subjects
-- within their tenant)
-- =============================================================================
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE subjects FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON subjects
  FOR ALL TO app_user
  USING (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
  )
  WITH CHECK (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
  );--> statement-breakpoint

-- =============================================================================
-- STEP 5: practitioner_subject_assignments — tenant-only policy
-- Assignments are scoped by tenant_id; owner sees all within the tenant.
-- =============================================================================
ALTER TABLE practitioner_subject_assignments ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE practitioner_subject_assignments FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "psa_tenant_isolation" ON practitioner_subject_assignments
  FOR ALL TO app_user
  USING (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
  )
  WITH CHECK (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
  );--> statement-breakpoint

-- =============================================================================
-- STEP 6: consent_log — subject-only policy
-- consent_log has NO tenant_id column (it is subject-level consent);
-- scope by app.subject_id only.
-- =============================================================================
ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE consent_log FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "subject_isolation" ON consent_log
  FOR ALL TO app_user
  USING (
    NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  )
  WITH CHECK (
    NULLIF(current_setting('app.subject_id', true), '')::text = subject_id
  );--> statement-breakpoint

-- =============================================================================
-- STEP 7: audit_log — INSERT+SELECT only (AUTH-04 / D-08 immutability)
-- No UPDATE or DELETE policy for app_user → those operations are DENIED by RLS.
-- The REVOKE in STEP 2 provides defense-in-depth at the grant level.
-- =============================================================================
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "audit_immutable_select" ON audit_log
  FOR SELECT TO app_user
  USING (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
  );--> statement-breakpoint
CREATE POLICY "audit_insert_only" ON audit_log
  FOR INSERT TO app_user
  WITH CHECK (
    NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id
  );
-- No UPDATE or DELETE policy for app_user on audit_log.
-- With RLS ENABLED + FORCED and no permissive UPDATE/DELETE policy, those
-- operations are blocked for app_user at the DB layer (AUTH-04 / D-08).
