---
phase: 07-phi-compliance-hardening-pre-client-gate-deferred-hardening
plan: "02"
subsystem: database
tags: [rls, neon, postgres, migration, security, compliance]
dependency_graph:
  requires:
    - 07-01 (withTenantDb + practitionerSubjectAssignments schema + RED rls-isolation tests)
  provides:
    - remix-app/migrations/0010_practitioner_assignments.sql — CREATE TABLE practitioner_subject_assignments (APPLIED to live Neon)
    - remix-app/migrations/0011_rls_policies.sql — NOBYPASSRLS app_user role + ENABLE+FORCE RLS + policies on 16 PHI tables (APPLIED to live Neon)
    - remix-app/migrations/0012_app_user_set_grant.sql — SET-capable app_user membership for the owner role (APPLIED to live Neon)
    - docs/COMPLIANCE-RUNBOOK.md — Phase 7 engineering-done / Phase 8 envelope-deferred state record
  affects:
    - remix-app/migrations/meta/_journal.json (idx 10 + 11 + 12 entries)
    - live Neon project orange-paper-97068012 (RLS now enforced for app_user)
tech_stack:
  added: []
  patterns:
    - Host-portable GUC RLS via NULLIF(current_setting('app.tenant_id', true), '')::text predicate (D-02)
    - NOBYPASSRLS app_user role (neondb_owner stays for migrations + Better-Auth adapter)
    - ENABLE + FORCE ROW LEVEL SECURITY per-table (FORCE required for owner-role safety, 01-SPIKE-FINDINGS)
    - audit_log immutability via INSERT+SELECT-only RLS policies (no UPDATE/DELETE policy for app_user)
    - Hand-authored migration registered in Drizzle journal (no snapshot needed for DDL-only migrations)
    - PG16+ createrole_self_grant gotcha — creator membership defaults SET FALSE; explicit GRANT ... WITH SET TRUE required for SET ROLE
decisions:
  - "0011 is hand-authored (not Drizzle-generated): RLS DDL (ENABLE ROW LEVEL SECURITY, CREATE POLICY) is not tracked by Drizzle schema diffing; the migration is registered manually in _journal.json (no 0011_snapshot.json needed)"
  - "REVOKE UPDATE, DELETE ON audit_log FROM app_user added as defense-in-depth alongside the RLS INSERT+SELECT-only policy shape (D-08)"
  - "Task 5 (COMPLIANCE-RUNBOOK.md) executed before Tasks 3/4 live-apply: the runbook records what Phase 7 engineering delivers (migration files already authored); it does not depend on live DB state"
  - "0012 fix authored as a NEW migration rather than editing the already-applied 0011 (applied migrations are immutable; drizzle records their hashes)"
  - "GRANT app_user TO CURRENT_USER WITH SET TRUE, INHERIT FALSE — host-portable (CURRENT_USER = whatever owner role runs migrations on any host); INHERIT FALSE keeps the owner from implicitly inheriting the RLS-restricted privilege set"
metrics:
  duration: "~25m across checkpoint resume (Tasks 1-5 complete)"
  completed_date: "2026-06-12"
  tasks_completed: 5
  files_changed: 7
key_files:
  created:
    - remix-app/migrations/0010_practitioner_assignments.sql
    - remix-app/migrations/meta/0010_snapshot.json
    - remix-app/migrations/0011_rls_policies.sql
    - remix-app/migrations/0012_app_user_set_grant.sql
  modified:
    - remix-app/migrations/meta/_journal.json
    - docs/COMPLIANCE-RUNBOOK.md
---

# Phase 7 Plan 02: RLS Migrations Applied to Live Neon — app_user Role + 16-Table Isolation

**One-liner:** NOBYPASSRLS app_user role + atomic ENABLE+FORCE RLS with host-portable GUC policies on 16 PHI tables, rehearsed on a Neon branch then applied to live `orange-paper-97068012`; Plan 01 RED isolation tests now 3/3 GREEN against live.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Generate 0010_practitioner_assignments migration (Drizzle db:generate) | 2185fe0 | remix-app/migrations/0010_practitioner_assignments.sql, meta/0010_snapshot.json, meta/_journal.json |
| 2 | Hand-author 0011_rls_policies.sql + register idx-11 in journal | e060f1c | remix-app/migrations/0011_rls_policies.sql, meta/_journal.json |
| 3 | CHECKPOINT (human-verify): Rehearse 0010+0011 on Neon branch + rollback | b9e01e4 (rollback-doc fix) | remix-app/migrations/0011_rls_policies.sql, docs/COMPLIANCE-RUNBOOK.md |
| 4 | CHECKPOINT (human-action): Apply to live Neon + post-apply verification | 9196e5f (0012 fix) | remix-app/migrations/0012_app_user_set_grant.sql, meta/_journal.json |
| 5 | Record Phase 7/8 boundary state in COMPLIANCE-RUNBOOK.md | 507c7a8 | docs/COMPLIANCE-RUNBOOK.md |

## What Was Built

### Task 1 — 0010_practitioner_assignments.sql (Drizzle-generated)

`npm run db:generate` diffed schema.ts (which has `practitionerSubjectAssignments` from Plan 01) against the 0009 snapshot and emitted:
- `CREATE TABLE "practitioner_subject_assignments"` with 8 columns (id text PK, tenant_id, practitioner_id, subject_id, assigned_by, assigned_at notNull+defaultNow, revoked_at nullable, created_at)
- 4 FK constraints (→ tenants.id, → user.id×2, → subjects.id)
- 3 btree indexes (`idx_psa_tenant`, `idx_psa_practitioner`, `idx_psa_subject`) + 1 unique composite index (`idx_psa_active_unique` on tenant_id, practitioner_id, subject_id)
- No collateral diffs (no DROP TABLE or ALTER TABLE on existing tables)
- Renamed from generated name `0010_bumpy_fallen_one.sql` → `0010_practitioner_assignments.sql`; `_journal.json` tag updated

### Task 2 — 0011_rls_policies.sql (hand-authored)

Atomic RLS DDL migration with `--> statement-breakpoint` separators:
1. **app_user role** (idempotent DO block): `CREATE ROLE app_user NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT LOGIN`
2. **Grants**: `GRANT USAGE ON SCHEMA public`, `GRANT SELECT/INSERT/UPDATE/DELETE ON ALL TABLES`, `GRANT USAGE ON ALL SEQUENCES` + `REVOKE UPDATE, DELETE ON audit_log FROM app_user` (defense-in-depth)
3. **12 tenant+subject tables** (metrics, protocol_versions, protocol_changes, milestones, supplements, supplement_log, correlations, cessation_log, subject_genotypes, lab_documents, lab_extractions, reports): ENABLE + FORCE RLS + `tenant_subject_isolation` policy (USING + WITH CHECK, both tenant_id and subject_id GUC predicates)
4. **subjects** + **practitioner_subject_assignments**: tenant-only isolation policies
5. **consent_log** (no tenant_id column): subject-only isolation policy
6. **audit_log** (AUTH-04/D-08 immutable): `audit_immutable_select` (SELECT) + `audit_insert_only` (INSERT) — no UPDATE/DELETE policy
- GUC predicate: `NULLIF(current_setting('app.tenant_id', true), '')::text = tenant_id` (host-portable D-02, empty-claims fail-closed)
- Excluded tables documented in header: user/session/account/verification/invites (Better-Auth Pitfall 4) + genetic_variants/variant_protocol_map/metric_protocol_map (non-PHI corpus) + tenants (admin-only)
- 16 ENABLE ROW LEVEL SECURITY statements total

### Task 3 — Neon branch rehearsal (CHECKPOINT, approved 2026-06-12)

Orchestrator-run rehearsal on a disposable Neon branch (deleted after):
- Both migrations applied cleanly via drizzle-kit migrate
- app_user: `rolbypassrls = false`
- All 16 tables: `relrowsecurity = t` AND `relforcerowsecurity = t`
- user/genetic_variants/tenants: RLS off
- audit_log policies: SELECT + INSERT only
- Rollback rehearsed to fully clean state (0 RLS tables, 0 policies, role dropped)

**Rehearsal defect found + fixed (b9e01e4):** the originally documented rollback was incomplete — `DROP ROLE app_user` fails ("role cannot be dropped because some objects depend on it") unless ALL grants are revoked first, and `DROP OWNED BY app_user` is permission-denied on Neon as neondb_owner. The VERIFIED rollback order (now in the 0011 header + COMPLIANCE-RUNBOOK.md): (1) DISABLE + NO FORCE RLS on all 16 tables, (2) DROP POLICY for every policy, (3) `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM app_user`, (4) `REVOKE ALL ON ALL SEQUENCES`, (5) `REVOKE USAGE ON SCHEMA public`, (6) `REVOKE ALL ON DATABASE neondb`, (7) `DROP ROLE IF EXISTS app_user`.

### Task 4 — Live apply + post-apply verification (CHECKPOINT, applied 2026-06-12)

- `npm run db:migrate` applied 0010 + 0011 to live `orange-paper-97068012` cleanly (then 0012 after the fix below)
- Live introspection (via @neondatabase/serverless, PG 17.10):
  - app_user: `rolbypassrls=false, rolsuper=false, rolcanlogin=true`
  - ALL 16 PHI tables: `relrowsecurity=t` AND `relforcerowsecurity=t`
  - All 9 excluded tables (user, session, account, verification, invites, genetic_variants, variant_protocol_map, metric_protocol_map, tenants): RLS off
  - audit_log pg_policies: `audit_immutable_select` (SELECT) + `audit_insert_only` (INSERT) only
- `npx vitest run tests/db/rls-isolation.test.ts`: **3/3 PASSED against live** (executed, not skipped) — TEN-02 cross-tenant zero-read, TEN-02 WITH CHECK reject, TEN-03 pool non-leak
- `npx tsc --noEmit`: exit 0; `npm run build`: clean (build gate per project memory)

### Task 5 — COMPLIANCE-RUNBOOK.md Phase 7 status section

Added "Phase 7 Status — RLS + Isolation Engineering (2026-06-12)" recording:
- What is DONE: app_user role, 16-table RLS, host-portable GUC policies, withTenantDb wrapper, audit_log immutability, practitioner_subject_assignments, isolation tests in CI, excluded tables, verified rollback procedure
- What is DEFERRED to Phase 8: all BAAs (Neon/Vercel/Anthropic), HIPAA tiers, pgAudit SELECT-logging, PITR/SSL/network hardening, host cost comparison + possible migration
- Self-hosted droplet option explicitly rejected (D-03) to prevent relitigating
- Compliant-envelope cost today = $0 (n=1 owner data, no BAA obligation — D-06)
- No connection strings or secret values present

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Rollback procedure incomplete — grants must be revoked before DROP ROLE**
- **Found during:** Task 3 rehearsal (orchestrator finding)
- **Issue:** documented rollback's `DROP ROLE IF EXISTS app_user` fails while the migration's 98 table grants remain; `DROP OWNED BY` shortcut is permission-denied on Neon
- **Fix:** rewrote the rollback in the 0011 header + COMPLIANCE-RUNBOOK.md to the verified 7-step order (DISABLE+NO FORCE RLS → DROP POLICY → REVOKE tables/sequences/schema/database → DROP ROLE)
- **Files modified:** remix-app/migrations/0011_rls_policies.sql, docs/COMPLIANCE-RUNBOOK.md
- **Commit:** b9e01e4

**2. [Rule 1 - Bug] SET LOCAL ROLE app_user denied — owner membership lacked the SET option (new migration 0012)**
- **Found during:** Task 4 — first live run of rls-isolation.test.ts failed 2/3 with SQLSTATE 42501 `permission denied to set role "app_user"`
- **Issue:** on PostgreSQL 16+ (live is 17.10), CREATE ROLE gives the creating role implicit membership WITH ADMIN OPTION but `SET FALSE, INHERIT FALSE` (createrole_self_grant default) — so neondb_owner could administer app_user but not `SET ROLE` to it; withTenantDb's `SET LOCAL ROLE app_user` failed
- **Fix:** new migration `0012_app_user_set_grant.sql` — `GRANT app_user TO CURRENT_USER WITH SET TRUE, INHERIT FALSE` (host-portable; validated in a rollback transaction before applying). Authored as a new migration rather than editing the already-applied 0011
- **Files modified:** remix-app/migrations/0012_app_user_set_grant.sql, remix-app/migrations/meta/_journal.json
- **Commit:** 9196e5f

### Order Deviation: Task 5 before Tasks 3/4

Task 5 (COMPLIANCE-RUNBOOK.md update) is purely documentary and does not depend on live DB state; executed before the blocking checkpoints so the compliance record was committed regardless of checkpoint timing. No impact — the runbook was then updated again with the rehearsal findings (b9e01e4).

## Known Stubs

None — no placeholder data or hardcoded empty values introduced in this plan.

## Threat Flags

No new threat surface beyond the plan's threat model (T-07-04 … T-07-09 all addressed). Note for the verifier: the 0012 membership grant gives the owner role SET-access to app_user — this is the intended withTenantDb mechanism (T-07-06: FORCE RLS still applies once `SET LOCAL ROLE app_user` is active; INHERIT FALSE prevents implicit privilege merging).

## Self-Check

**Checking created files exist:**
- `remix-app/migrations/0010_practitioner_assignments.sql` — exists (committed 2185fe0)
- `remix-app/migrations/meta/0010_snapshot.json` — exists (committed 2185fe0)
- `remix-app/migrations/0011_rls_policies.sql` — exists (committed e060f1c, fixed b9e01e4)
- `remix-app/migrations/0012_app_user_set_grant.sql` — exists (committed 9196e5f)

**Checking commits exist:**
- 2185fe0 — chore(07-02): generate 0010_practitioner_assignments migration + update journal
- e060f1c — chore(07-02): hand-author 0011_rls_policies.sql + register idx-11 in journal
- 507c7a8 — docs(07-02): record Phase 7 RLS-done / Phase 8 envelope-deferred in COMPLIANCE-RUNBOOK.md
- b9e01e4 — fix(07-02): correct rollback procedure — revoke grants before DROP ROLE (rehearsal finding)
- 9196e5f — fix(07-02): grant SET-capable app_user membership to the owner role (0012)

**Live verification evidence:**
- 13 migrations recorded in drizzle.__drizzle_migrations (0000–0012)
- rls-isolation.test.ts: 3/3 PASSED against live Neon
- tsc --noEmit exit 0; react-router build clean

## Self-Check: PASSED
