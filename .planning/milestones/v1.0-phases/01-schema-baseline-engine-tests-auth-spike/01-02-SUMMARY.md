---
phase: 01-schema-baseline-engine-tests-auth-spike
plan: 02
subsystem: database
tags: [drizzle, drizzle-kit, neon, postgres, migrations]

requires:
  - phase: none
    provides: db/schema.ts (8 tables, 7 enums) + drizzle.config.ts
provides:
  - Committed Drizzle migrations baseline (remix-app/migrations/0000_light_blue_shield.sql + meta)
  - Baseline APPLIED to the zoetrop production Neon DB (8 tables + 7 enums created)
  - drizzle.__drizzle_migrations tracking row recorded (hash b475bf51…)
  - Migrations workflow is now the source of truth for all future schema change
affects: [03-auth, 04-engine, 05-lab-ingest, database, schema]

tech-stack:
  added: []
  patterns: ["All schema change flows through committed drizzle-kit migrations (no more push/manual DDL)"]

key-files:
  created:
    - remix-app/migrations/0000_light_blue_shield.sql
    - remix-app/migrations/meta/_journal.json
    - remix-app/migrations/meta/0000_snapshot.json
  modified: []

key-decisions:
  - "Production Neon was EMPTY (schema never deployed), not populated as the plan assumed — so reconciliation was a real `drizzle-kit migrate` (creates tables + records tracking), NOT the planned manual __drizzle_migrations INSERT (Rule 4 deviation, user-approved)"
  - "drizzle-kit (0.31.8) has no --dry-run flag — validated the baseline instead via a transactional rollback dry-run (all 17 DDL statements in one transaction + sentinel error → full ROLLBACK, nothing persisted)"
  - "Used the unpooled NETLIFY_DATABASE_URL for the migrate (correct for DDL); pulled both URLs from Netlify (the ngtops/.env DATABASE_URL was a different project)"
  - "Left the drizzle-chosen tag 0000_light_blue_shield as-is (journal references it); pure as-is snapshot — vestigial sync_status/sync_version + isActive:int preserved per D-08/D-09"

patterns-established:
  - "Throwaway validation when no disposable branch is available: run DDL inside BEGIN…(sentinel error)…ROLLBACK to prove it applies cleanly with zero persistence"

requirements-completed: [DATA-03]

duration: ~110 min (incl. DB-target investigation)
completed: 2026-06-08
---

# Phase 01 Plan 02: Drizzle Migrations Baseline (DATA-03) Summary

**Committed Drizzle baseline (8 tables, 7 enums) generated and applied to the zoetrop production Neon DB via a real `drizzle-kit migrate` — which the empty-DB reality required instead of the plan's assumed mark-as-applied INSERT — with drizzle.__drizzle_migrations now tracking the baseline (hash b475bf51…).**

## Performance

- **Duration:** ~110 min (much of it diagnosing the DB-target surprises below)
- **Completed:** 2026-06-08T01:48Z
- **Tasks:** 3 (2 auto + 1 human-action checkpoint, re-shaped by reality)
- **Files created:** 3 (migration + meta)

## Accomplishments
- Generated the first committed migration baseline from `db/schema.ts`: all 8 tables + 7 enums, pure as-is snapshot (vestiges intact per D-08/D-09).
- Proved the baseline DDL applies cleanly against the real Neon engine via a transactional rollback dry-run (no `--dry-run` flag exists in this drizzle-kit).
- Applied the baseline to the (empty) production Neon DB with `drizzle-kit migrate`; verified all 8 tables + 7 enums now exist and `drizzle.__drizzle_migrations` holds the baseline row.
- Confirmed the recorded hash (`b475bf51b4801d7edafdda4151a9973a850f72d89124198bd624654fd97b0244`) matches the independently computed SHA-256 of the SQL file.

## Task Commits

1. **Task 1: Generate baseline migration** - `1124d3d` (feat)
2. **Task 2: Validate baseline** - no commit (operational: transactional rollback dry-run)
3. **Task 3: Reconcile production** - no commit (operational: `drizzle-kit migrate` against prod)

## Files Created/Modified
- `remix-app/migrations/0000_light_blue_shield.sql` - CREATE TYPE (7) + CREATE TABLE (8) DDL
- `remix-app/migrations/meta/_journal.json` - migration journal (tag 0000_light_blue_shield)
- `remix-app/migrations/meta/0000_snapshot.json` - schema snapshot for future diffs

## Decisions Made
- Reconciled prod by a real migrate (empty DB) rather than the planned manual INSERT — user-approved.
- Validated via transactional rollback dry-run because `--dry-run` does not exist in drizzle-kit 0.31.8.

## Deviations from Plan

### Rule 4 — Architectural (user-approved via checkpoint)

**1. Production Neon was empty; reconciliation became a real migrate**
- **Found during:** Task 3 prep (read-only inspection of the real DB)
- **Issue:** The plan assumed prod already had the 8 tables (so a real migrate would fail "relation already exists" and the fix was a manual `__drizzle_migrations` INSERT). The real zoetrop Neon DB (`NETLIFY_DATABASE_URL`) was **completely empty** — the schema was never deployed (M0 shipped static `real-data.ts`).
- **Fix:** With the DB empty, the canonical and correct reconciliation is a real `drizzle-kit migrate`, which creates the schema AND records the tracking row with the correct hash. Presented the finding and got explicit approval before any production DDL.
- **Verification:** Post-apply read-only check — 8 tables + 7 enums present; `drizzle.__drizzle_migrations` row hash matches the computed SHA-256.

### Auto-fixed / adapted

**2. [Rule 1 — Bug in plan] `drizzle-kit migrate --dry-run` flag does not exist**
- **Found during:** Task 2
- **Issue:** This drizzle-kit (0.31.8) `migrate` supports only `--config`. Running `--dry-run` would pass an unrecognized flag and risk a real migrate.
- **Fix:** Validated the baseline with a transactional rollback dry-run (all DDL in one transaction terminated by a sentinel error → full ROLLBACK; nothing persisted). Result: DDL_VALID_ROLLED_BACK.

**3. [Rule 2 — Missing prerequisite] Correct DB connection not in the provided .env**
- **Found during:** Task 2
- **Issue:** The `DATABASE_URL` in `ngt/ngtops/.env` pointed to a different Neon project (a `proposals` table, none of zoetrop's). The user chose "pull from Netlify."
- **Fix:** Fetched `NETLIFY_DATABASE_URL`/`_UNPOOLED` from the zoetrop Netlify site via the Netlify API; used unpooled for the migrate. Created `.env.example` so future runs use a local `.env` instead of pulling from Netlify.

---

**Total deviations:** 1 architectural (user-approved) + 2 adapted (1 plan bug, 1 missing prerequisite)
**Impact on plan:** DATA-03 fully achieved by a cleaner path than written. No scope creep; vestiges preserved as the plan required.

## Issues Encountered
- A wrong/unrelated DB connection string (with password) from `ngt/ngtops/.env` was printed by a node error during diagnosis — flagged to the user to rotate if desired. The zoetrop production credentials were never echoed (kept in shell vars, error output redacted thereafter).

## User Setup Required
- `.env.example` created at repo root. Fill in `.env` with `DATABASE_URL` / `DATABASE_URL_UNPOOLED` (and the 01-03 spike vars) and symlink/copy to `remix-app/.env` for the tooling.

## Next Phase Readiness
- The migrations workflow is now authoritative; Phases 3–6 add schema via new migrations on top of this baseline.
- 01-03 spike still needs a disposable Neon branch (see `.env.example` → `SPIKE_DATABASE_URL`).

---
*Phase: 01-schema-baseline-engine-tests-auth-spike*
*Completed: 2026-06-08*
