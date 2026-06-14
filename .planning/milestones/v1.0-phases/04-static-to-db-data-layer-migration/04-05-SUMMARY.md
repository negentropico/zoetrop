---
phase: "04"
plan: "05"
subsystem: "data-layer"
tags: ["phi-deletion", "d-09", "d-06", "data-04", "static-to-db", "cleanup"]

dependency_graph:
  requires:
    - "04-04: owner visual spot-check APPROVED + 13/13 parity green"
    - "04-03: live Neon seed + parity fixtures captured"
    - "04-02: data.server.ts + db-mappers + genetics-knowledge"
    - "04-01: schema vestige sweep + subject_genotypes"
  provides:
    - "PHI arrays deleted from TypeScript source (D-05/D-09 complete)"
    - "Non-PHI survivors in canonical homes: metrics.ts, correlations.ts, metric-targets.ts, cessation.ts, protocol-data.ts"
    - "DATA-04 satisfied: Vercel build client bundle contains zero PHI strings"
    - "One-shot scripts retired: scripts/seed-data.ts + scripts/capture-fixtures.ts deleted"
    - "D-07 noted: git-history squash deferred to Phase 7 pre-client gate"
  affects:
    - "remix-app/app/lib/real-data.ts (DELETED)"
    - "remix-app/app/lib/seed-data.ts (DELETED)"
    - "remix-app/app/lib/protocol-data.ts (trimmed — PHI real* arrays removed)"
    - "remix-app/scripts/seed-data.ts (DELETED)"
    - "remix-app/scripts/capture-fixtures.ts (DELETED)"
    - "remix-app/package.json (db:seed-data + capture-fixtures scripts removed)"

tech_stack:
  added: []
  patterns:
    - "D-06 relocation: non-PHI survivors split across metric-targets.ts (re-export alias), correlations.ts (pure math helpers), cessation.ts (engine re-export), protocol-data.ts (trimmed survivor file)"

key_files:
  created:
    - "remix-app/app/lib/metric-targets.ts — D-06 artifact: re-exports MetricTarget/METRIC_TARGETS/getMetricTargets/getProjections from metrics.ts"
    - "remix-app/app/lib/correlations.ts — pure correlation helpers: calculatePearsonCorrelation/getCorrelationSignificance/getCorrelationColor"
  modified:
    - "remix-app/app/lib/protocol-data.ts — PHI real* arrays deleted; survivor engine fns retained"
    - "remix-app/app/lib/seed-data.test.ts — import calculatePearsonCorrelation from ~/lib/correlations"
    - "remix-app/package.json — db:seed-data + capture-fixtures entries removed"
  deleted:
    - "remix-app/app/lib/real-data.ts — all PHI arrays removed (realBloodWorkM1/M2, realBodyComposition, realAutonomicData, MILESTONES M1-M4, getRealMetrics, getLatestRealMetrics)"
    - "remix-app/app/lib/seed-data.ts — PHI arrays removed (seedGeneticVariants, seedCorrelations, seedProtocolVersions, seedSupplements, seedCessationLog, seedMilestones, generateSeedMetrics); correlation helpers relocated to correlations.ts"
    - "remix-app/scripts/seed-data.ts — one-shot script retired (Neon is authoritative)"
    - "remix-app/scripts/capture-fixtures.ts — one-shot script retired (fixtures already captured, not re-runnable after source deletion)"

decisions:
  - "metric-targets.ts as re-export alias: METRIC_TARGETS canonical home is metrics.ts (Plan 04 decision); metric-targets.ts created as a re-export layer to satisfy D-06 artifact contract without duplicating data"
  - "correlations.ts for pure math helpers: calculatePearsonCorrelation/getCorrelationSignificance/getCorrelationColor moved to dedicated non-PHI module; routes already had inline implementations so no route import updates needed"
  - "One-shot scripts deleted (not archived): scripts/seed-data.ts + scripts/capture-fixtures.ts are irreversibly unusable after source deletion; Neon is authoritative; deletion is cleaner than keeping dead code"
  - "D-07 deferred: git-history squash (pre-PHI-deletion commits) is on the Phase 7 pre-client gate checklist; no destructive history rewrite in this plan (private n=1 repo)"
  - "getMetricsCountByCategory not relocated: only defined in seed-data.ts, never imported anywhere in app/; dropped with the file"

metrics:
  duration: "~30min"
  completed: "2026-06-10"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 3
  files_deleted: 6

checkpoint:
  task_3_human_verify: "APPROVED 2026-06-10 — owner response: 'approved'. DATA-04 verification PASSED: client-bundle PHI grep clean (zero matches), route-source grep clean, app renders correctly with DB-backed data. Phase 4 cut-over complete; Neon is the single source of truth."
---

# Phase 04 Plan 05: PHI Deletion + D-06 Survivor Relocation Summary

PHI arrays deleted from TypeScript source (D-05/D-09 final step); non-PHI survivors relocated to canonical non-PHI homes (D-06); DATA-04 satisfied — Vercel build client bundle grep returns zero PHI matches.

## What Was Built

### Task 1 — Relocate non-PHI survivors (D-06) [commit: 9d201d4]

**New files created:**

- `app/lib/metric-targets.ts`: Re-export alias satisfying D-06 artifact contract. Exports `MetricTarget` (type), `METRIC_TARGETS`, `getMetricTargets`, `getProjections` from `metrics.ts` (canonical home established in Plan 04). Zero PHI — no measured values, only forward-looking goals.

- `app/lib/correlations.ts`: Pure math / presentation helpers extracted from `seed-data.ts`:
  - `calculatePearsonCorrelation(x, y)` — Pearson r computation
  - `getCorrelationSignificance(r)` — "strong" | "moderate" | "weak" | "none" classifier
  - `getCorrelationColor(significance)` — Tailwind class mapping

**Updated files:**
- `app/lib/seed-data.test.ts`: Import `calculatePearsonCorrelation` from `~/lib/correlations` (was `~/lib/seed-data`)

**Survivor homes confirmed (per 04-04-SUMMARY):**
- `getCessationDay`, `getCurrentCessationPhase`, `CESSATION_START_DATE`, `dailySchedule`, `avoidList` → `cessation.ts` re-export layer (already established in Plan 04)
- `CESSATION_PHASES`, `SUPPLEMENT_TIERS` → `types/protocol.ts` (unchanged)
- `METRIC_TARGETS`, `MetricTarget`, `getMetricTargets`, `getProjections` → `metrics.ts` (established in Plan 04)

Typecheck: exits 0 post-Task 1.

### Task 2 — Delete PHI arrays + retire one-shot scripts (D-05/D-09 gated on Plan 04 approval) [commit: 0f6ef0d]

**Gate check:** Plan 04 owner approval recorded 2026-06-10 — "verified. All values look correct." CLEARED.

**Files deleted:**

| File | Reason |
|------|--------|
| `app/lib/real-data.ts` | All PHI: realBloodWorkM1/M2, realBodyComposition, realAutonomicData, MILESTONES M1-M4, getRealMetrics, getLatestRealMetrics; non-PHI survivors already in metrics.ts |
| `app/lib/seed-data.ts` | PHI arrays (seedGeneticVariants, seedCorrelations, all synthetic seed*); correlation helpers relocated to correlations.ts |
| `scripts/seed-data.ts` | One-shot; source arrays gone; Neon is authoritative |
| `scripts/capture-fixtures.ts` | One-shot; fixtures captured; not re-runnable after source deletion |

**Files trimmed:**
- `app/lib/protocol-data.ts`: Removed `realCessationLog`, `realProtocolVersions`, `realProtocolChanges`, `realSupplements`, `realMilestones`. Survivor engine fns + display constants retained: `CESSATION_START_DATE`, `getCessationDay`, `getCurrentCessationPhase`, `dailySchedule`, `avoidList`, `DailyScheduleSlot`, `AvoidItem`.

**package.json:** Removed `db:seed-data` and `capture-fixtures` script entries.

**Post-deletion verification:**
- `grep -rE "realBloodWork|realProtocolVersions|..." remix-app/app/` → only comments in documentation strings; zero code-level PHI symbols
- `grep -rnE "import.*real-data|import.*seed-data" remix-app/app/` → 0 matches
- `npm run typecheck` → exits 0
- `npm test` → 139 passed / 42 skipped (same as pre-deletion)
- `npm run lint` → exits 0

### Task 3 — DATA-04 build PHI grep (checkpoint:human-verify) [APPROVED]

**Build completed successfully.** React Router production build (`npm run build`) produced `build/client/` (55 JS + 1 CSS assets).

**PHI grep results:**
```
grep -rE "realBloodWork|metabolic-glucose|Cessation Attempt|A1298C|rs324420|153\.13|166\.36|98th percentile" remix-app/build/client/
```
**Result: ZERO matches** — client bundle is clean of PHI strings.

**Route source grep:**
```
grep -rnE "real-data|seed-data" remix-app/app/routes/
```
**Result: ZERO matches** — no route imports the deleted PHI modules.

**build/ gitignore:** Confirmed — `build/` is gitignored; no build artifact committed.

**Checkpoint approval recorded 2026-06-10.** Owner response: **"approved"** — the DATA-04 verification PASSED: client-bundle PHI grep clean (zero matches), route-source grep clean, and the app renders correctly with DB-backed data. The D-09 cut-over is complete; Neon is the single source of truth and no PHI lives in committed TypeScript source.

**D-07 note:** The pre-deletion commits in git history contain PHI. A destructive history rewrite (squash-then-re-push) is NOT done here — this is a private n=1 repo with no external clients. The Phase 7 pre-client gate checklist includes the repo-squash (D-07) as a required step before any external client PHI is handled.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] correlations.ts for test import compatibility**
- **Found during:** Task 1 (pre-analysis)
- **Issue:** `seed-data.test.ts` imported `calculatePearsonCorrelation` from `~/lib/seed-data`. After seed-data.ts deletion, this would break. Routes had inline implementations so no route changes needed, but the test needed a stable import path.
- **Fix:** Created `app/lib/correlations.ts` as the canonical home; updated test import. No route changes required.
- **Files modified:** `app/lib/correlations.ts` (new), `app/lib/seed-data.test.ts`
- **Commit:** 9d201d4

**2. [Rule 1 - Bug] verbatimModuleSyntax: MetricTarget re-export needed `export type`**
- **Found during:** Task 1 typecheck
- **Issue:** `metric-targets.ts` used `export { MetricTarget, ... }` but `verbatimModuleSyntax` requires `export type` for type-only re-exports.
- **Fix:** Changed to `export type { MetricTarget }` + `export { METRIC_TARGETS, getMetricTargets, getProjections }`.
- **Files modified:** `app/lib/metric-targets.ts`
- **Commit:** 9d201d4 (fixed before commit)

## Known Stubs

None — all loaders read live Neon; no placeholder text or hardcoded empty values.

## Threat Flags

None — this plan reduces attack surface by deleting PHI from TypeScript source. No new endpoints, auth paths, or schema changes.

**Threat register status (from plan's threat_model):**
- T-04-BUNDLE: MITIGATED — client-bundle PHI grep returns zero matches
- T-04-SRC-PHI: MITIGATED — PHI arrays deleted; no real*/seed* PHI accessors in app/
- T-04-SURV: MITIGATED — metric-targets.ts grep for DEXA numbers/genotype strings returns 0
- T-04-HIST: ACCEPTED (deferred) — Phase 7 pre-client repo-squash on checklist
- T-04-SC: N/A — no new packages installed

## Self-Check: PASSED

Files confirmed:
- FOUND: remix-app/app/lib/metric-targets.ts
- FOUND: remix-app/app/lib/correlations.ts
- CONFIRMED DELETED: remix-app/app/lib/real-data.ts
- CONFIRMED DELETED: remix-app/app/lib/seed-data.ts
- CONFIRMED DELETED: remix-app/scripts/seed-data.ts
- CONFIRMED DELETED: remix-app/scripts/capture-fixtures.ts

Commits confirmed:
- FOUND: 9d201d4 (Task 1 — D-06 survivor relocation)
- FOUND: 0f6ef0d (Task 2 — PHI deletion + script retirement)

Test suite: 139 passed / 42 skipped — identical to pre-deletion baseline
Typecheck: exits 0
Lint: exits 0
Build: succeeds; client-bundle PHI grep = 0 matches

Task 3 checkpoint: APPROVED by owner ("approved") — DATA-04 verification PASSED.

Phase 4 closes DATA-01 (loaders DB-backed, parity 13/13), DATA-02 (live Neon seed),
DATA-04 (no PHI in build client bundle or static source), DATA-05 (schema columns).
