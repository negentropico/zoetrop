-- Custom migration: Backfill owner's tenant_id/subject_id into all 8 data tables.
-- Runs AFTER the owner seed (npm run db:seed-owner) creates the spine rows.
-- Uses a DO $$ block to resolve the owner's IDs at migration time (no hardcoded UUIDs).
-- Only updates rows where tenant_id IS NULL (idempotent; safe to re-apply).

DO $$
DECLARE
  v_tenant_id text;
  v_subject_id text;
BEGIN
  SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
  SELECT id INTO v_subject_id FROM subjects WHERE tenant_id = v_tenant_id LIMIT 1;

  UPDATE metrics           SET tenant_id = v_tenant_id, subject_id = v_subject_id WHERE tenant_id IS NULL;
  UPDATE protocol_versions SET tenant_id = v_tenant_id, subject_id = v_subject_id WHERE tenant_id IS NULL;
  UPDATE protocol_changes  SET tenant_id = v_tenant_id, subject_id = v_subject_id WHERE tenant_id IS NULL;
  UPDATE milestones        SET tenant_id = v_tenant_id, subject_id = v_subject_id WHERE tenant_id IS NULL;
  UPDATE supplements       SET tenant_id = v_tenant_id, subject_id = v_subject_id WHERE tenant_id IS NULL;
  UPDATE supplement_log    SET tenant_id = v_tenant_id, subject_id = v_subject_id WHERE tenant_id IS NULL;
  UPDATE correlations      SET tenant_id = v_tenant_id, subject_id = v_subject_id WHERE tenant_id IS NULL;
  UPDATE cessation_log     SET tenant_id = v_tenant_id, subject_id = v_subject_id WHERE tenant_id IS NULL;
END $$;
