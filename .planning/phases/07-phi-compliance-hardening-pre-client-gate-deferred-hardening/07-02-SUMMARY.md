---
phase: 07-phi-compliance-hardening-pre-client-gate-deferred-hardening
plan: "02"
subsystem: database
tags: [rls, neon, postgres, migration, security, compliance]
dependency_graph:
  requires:
    - 07-01 (withTenantDb + practitionerSubjectAssignments schema)
  provides:
    - remix-app/migrations/0010_practitioner_assignments.sql — CREATE TABLE practitioner_subject_assignments
    - remix-app/migrations/0011_rls_policies.sql — NOBYPASSRLS app_user role + ENABLE+FORCE RLS + policies on 16 PHI tables
    - docs/COMPLIANCE-RUNBOOK.md — Phase 7 engineering-done / Phase 8 envelope-deferred state record
  affects:
    - remix-app/migrations/meta/_journal.json (idx 10 + 11 entries)
tech_stack:
  added: []
  patterns:
    - Host-portable GUC RLS via NULLIF(current_setting('app.tenant_id', true), '')::text predicate (D-02)
    - NOBYPASSRLS app_user role (neondb_owner stays for migrations + Better-Auth adapter)
    - ENABLE + FORCE ROW LEVEL SECURITY per-table (FORCE required for owner-role safety, 01-SPIKE-FINDINGS)
    - audit_log immutability via INSERT+SELECT-only RLS policies (no UPDATE/DELETE policy for app_user)
    - Hand-authored migration registered in Drizzle journal (no snapshot needed for DDL-only migrations)
key_files:
  created:
    - remix-app/migrations/0010_practitioner_assignments.sql
    - remix-app/migrations/meta/0010_snapshot.json
    - remix-app/migrations/0011_rls_policies.sql
  modified:
    - remix-app/migrations/meta/_journal.json
    - docs/COMPLIANCE-RUNBOOK.md
decisions:
  - "0011 is hand-authored (not Drizzle-generated): RLS DDL (ENABLE ROW LEVEL SECURITY, CREATE POLICY) is not tracked by Drizzle schema diffing; the migration is registered manually in _journal.json (no 0011_snapshot.json needed)"
  - "REVOKE UPDATE, DELETE ON audit_log FROM app_user added as defense-in-depth alongside the RLS INSERT+SELECT-only policy shape (D-08)"
  - "Task 5 (COMPLIANCE-RUNBOOK.md) executed before Tasks 3/4 live-apply: the runbook records what Phase 7 engineering delivers (migration files already authored); it does not depend on live DB state"
metrics:
  duration: "~15m (Tasks 1, 2, 5 complete; Tasks 3/4 pending human verification)"
  completed_date: "2026-06-12"
  tasks_completed: 3
  files_changed: 5
---

# Phase 7 Plan 02: RLS Migration Authoring + Compliance Boundary Record

**One-liner:** Hand-authored atomic RLS migration (app_user NOBYPASSRLS role + ENABLE+FORCE+policy on 16 PHI tables) and Drizzle-generated practitioner_subject_assignments table DDL, staged for rehearsal on a Neon branch before live apply.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Generate 0010_practitioner_assignments migration (Drizzle db:generate) | 2185fe0 | remix-app/migrations/0010_practitioner_assignments.sql, remix-app/migrations/meta/0010_snapshot.json, remix-app/migrations/meta/_journal.json |
| 2 | Hand-author 0011_rls_policies.sql + register idx-11 in journal | e060f1c | remix-app/migrations/0011_rls_policies.sql, remix-app/migrations/meta/_journal.json |
| 3 | CHECKPOINT: Rehearse 0010+0011 on Neon branch (Task 3) | — | AWAITING HUMAN ACTION |
| 4 | CHECKPOINT: Apply 0010+0011 to live Neon + run isolation tests GREEN (Task 4) | — | AWAITING HUMAN ACTION |
| 5 | Record Phase 7/8 boundary state in COMPLIANCE-RUNBOOK.md | 507c7a8 | docs/COMPLIANCE-RUNBOOK.md |

## What Was Built

### Task 1 — 0010_practitioner_assignments.sql (Drizzle-generated)

`npm run db:generate` diffed schema.ts (which has `practitionerSubjectAssignments` from Plan 01) against the 0009 snapshot and emitted:
- `CREATE TABLE "practitioner_subject_assignments"` with 8 columns (id text PK, tenant_id, practitioner_id, subject_id, assigned_by, assigned_at notNull+defaultNow, revoked_at nullable, created_at)
- 4 FK constraints (→ tenants.id, → user.id×2, → subjects.id)
- 3 btree indexes (`idx_psa_tenant`, `idx_psa_practitioner`, `idx_psa_subject`) + 1 unique composite index (`idx_psa_active_unique` on tenant_id, practitioner_id, subject_id)
- No collateral diffs (no DROP TABLE or ALTER TABLE on existing tables)
- Renamed from generated name `0010_bumpy_fallen_one.sql` → `0010_practitioner_assignments.sql`
- `_journal.json` tag updated to `0010_practitioner_assignments`

### Task 2 — 0011_rls_policies.sql (hand-authored)

Atomic RLS DDL migration with `--> statement-breakpoint` separators. Structure:
1. **app_user role** (idempotent DO block): `CREATE ROLE app_user NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT LOGIN`
2. **Grants**: `GRANT USAGE ON SCHEMA public`, `GRANT SELECT/INSERT/UPDATE/DELETE ON ALL TABLES IN SCHEMA public`, `GRANT USAGE ON ALL SEQUENCES IN SCHEMA public` + `REVOKE UPDATE, DELETE ON audit_log FROM app_user` (defense-in-depth)
3. **12 tenant+subject tables** (metrics, protocol_versions, protocol_changes, milestones, supplements, supplement_log, correlations, cessation_log, subject_genotypes, lab_documents, lab_extractions, reports): each gets `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `ALTER TABLE ... FORCE ROW LEVEL SECURITY` + `CREATE POLICY "tenant_subject_isolation" ... FOR ALL TO app_user USING (...) WITH CHECK (...)` using both tenant_id and subject_id GUC predicates
4. **subjects** (tenant-only): ENABLE+FORCE+tenant-only policy
5. **practitioner_subject_assignments** (tenant-only): ENABLE+FORCE+`psa_tenant_isolation` policy
6. **consent_log** (subject-only, no tenant_id column): ENABLE+FORCE+`subject_isolation` policy using subject_id GUC only
7. **audit_log** (immutable AUTH-04): ENABLE+FORCE + `audit_immutable_select` (SELECT only) + `audit_insert_only` (INSERT only) — no UPDATE/DELETE policy for app_user
- GUC predicate: `NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id` (host-portable D-02, empty-claims fail-closed)
- Journal idx-11 entry added manually (no 0011_snapshot.json — hand-authored non-schema migration)
- Excluded tables documented in header: user/session/account/verification/invites (Better-Auth Pitfall 4) + genetic_variants/variant_protocol_map/metric_protocol_map (non-PHI corpus) + tenants (admin-only)
- Rollback procedure documented in header (DISABLE RLS per table + DROP POLICY + DROP ROLE app_user)
- Total: 16 ENABLE ROW LEVEL SECURITY statements (verified by acceptance criteria check)

### Task 5 — COMPLIANCE-RUNBOOK.md Phase 7 status section

Added a "Phase 7 Status — RLS + Isolation Engineering (2026-06-12)" section recording:
- What is DONE: app_user role, 16-table RLS, host-portable GUC policies, withTenantDb wrapper, audit_log immutability, practitioner_subject_assignments, isolation tests in CI, excluded tables
- What is DEFERRED to Phase 8: all BAAs (Neon/Vercel/Anthropic), HIPAA tiers, pgAudit SELECT-logging, PITR/SSL/network hardening, host cost comparison + possible migration
- Self-hosted droplet option explicitly rejected (D-03) to prevent relitigating
- Compliant-envelope cost today = $0 (n=1 owner data, no BAA obligation — D-06)
- No connection strings or secret values present

## Checkpoint State (Tasks 3 + 4 — PENDING)

**Task 3 (checkpoint:human-verify):** Rehearse 0010+0011 on a disposable Neon branch from `orange-paper-97068012`. Apply migrations, run pg_roles/pg_class/pg_policies introspection, verify rollback, delete branch.

**Task 4 (checkpoint:human-action):** With DATABASE_URL_UNPOOLED set to the live direct URL, run `npm run db:migrate` to apply 0010+0011 to live Neon. Re-run introspection. Run `npm test -- tests/db/rls-isolation.test.ts` to confirm RED tests go GREEN.

## Deviations from Plan

### Auto-fixed Issues

None.

### Order Deviation: Task 5 before Tasks 3/4

**Found during:** Plan execution — Task 5 (COMPLIANCE-RUNBOOK.md update) is purely documentary and does not depend on live DB state.
**Deviation:** Executed Task 5 before the Task 3/4 blocking checkpoints so the compliance record is committed regardless of when the human-gated live apply happens.
**Impact:** None — the runbook accurately records the migration files as authored (not yet applied to live); the live apply details are captured by the Task 4 checkpoint.

## Known Stubs

None — no placeholder data or hardcoded empty values introduced in this plan.

## Threat Flags

No new threat surface beyond what is described in the plan's threat model. All surfaces (app_user role, RLS policies, audit_log immutability) are covered by T-07-04 through T-07-09.

## Self-Check

**Checking created files exist:**
- `remix-app/migrations/0010_practitioner_assignments.sql` — exists (git tracked, committed 2185fe0)
- `remix-app/migrations/meta/0010_snapshot.json` — exists (committed 2185fe0)
- `remix-app/migrations/0011_rls_policies.sql` — exists (committed e060f1c)

**Checking commits exist:**
- 2185fe0 — chore(07-02): generate 0010_practitioner_assignments migration + update journal
- e060f1c — chore(07-02): hand-author 0011_rls_policies.sql + register idx-11 in journal
- 507c7a8 — docs(07-02): record Phase 7 RLS-done / Phase 8 envelope-deferred in COMPLIANCE-RUNBOOK.md

## Self-Check: PASSED (Tasks 1, 2, 5 — Tasks 3/4 pending live DB verification)
