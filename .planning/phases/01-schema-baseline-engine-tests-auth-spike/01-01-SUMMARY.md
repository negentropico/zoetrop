---
phase: 01-schema-baseline-engine-tests-auth-spike
plan: 01
subsystem: testing
tags: [vitest, coverage-v8, better-auth, vite, tsconfig-paths]

requires:
  - phase: none
    provides: existing vite.config.ts + tsconfigPaths plugin
provides:
  - Vitest 4.x test harness installed and booting (empty run exits 0)
  - test + test:watch npm scripts
  - vite.config.ts test block (node env, app/**/*.test.{ts,tsx} include, passWithNoTests)
  - better-auth ^1.6.14 devDependency available for the 01-03 spike
affects: [01-04, 01-05, 03-auth, testing]

tech-stack:
  added: [vitest@^4.1.8, "@vitest/coverage-v8@^4.1.8", better-auth@^1.6.14]
  patterns: ["Vitest config colocated in vite.config.ts (single source, defineConfig stays from vite)"]

key-files:
  created: []
  modified:
    - remix-app/package.json
    - remix-app/package-lock.json
    - remix-app/vite.config.ts

key-decisions:
  - "Kept defineConfig imported from 'vite' (not vitest/config) to avoid breaking the reactRouter plugin (RESEARCH.md Pitfall 2); used the /// <reference types=\"vitest/config\" /> directive for test-block types instead"
  - "Added passWithNoTests:true so the empty harness run exits 0 — Vitest 4.x exits 1 on no-tests by default (deviation from the plan's assumed exit-0 behavior)"
  - "better-auth installed as a devDependency only (spike-scoped); Phase 3 will promote it to dependencies"

patterns-established:
  - "Engine tests colocate as app/lib/*.test.ts and are auto-discovered via the include glob; ~/ alias resolves in tests via the inherited tsconfigPaths plugin"

requirements-completed: [COMP-01]

duration: 12 min
completed: 2026-06-07
---

# Phase 01 Plan 01: Vitest Harness Setup Summary

**Vitest 4.x harness installed and booting (empty `vitest run` exits 0), with test/test:watch scripts and a node-env test block in vite.config.ts that keeps the reactRouter plugin intact.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-07T23:48:00Z
- **Completed:** 2026-06-07T23:59:57Z
- **Tasks:** 3 (1 checkpoint + 2 auto)
- **Files modified:** 3

## Accomplishments
- Package-legitimacy gate cleared: vitest, @vitest/coverage-v8 (4.1.8), better-auth (1.6.14) all verified on the npm registry (official orgs/repos, matching versions, no typosquats) before install.
- Installed the three packages as devDependencies; added `test` (vitest run) and `test:watch` (vitest) scripts.
- Added a `test` block to `vite.config.ts` (node env, `app/**/*.test.{ts,tsx}` include) without changing the `defineConfig` import source.
- Proved the harness boots: `npx vitest run` exits 0 on an empty suite.

## Task Commits

1. **Task 1: Package legitimacy gate** - checkpoint:human-verify (approved; no commit)
2. **Task 2: Install deps + add test scripts** - `da8c46b` (feat)
3. **Task 3: Add vitest test block + prove empty run** - `9a90520` (feat)

## Files Created/Modified
- `remix-app/package.json` - test/test:watch scripts; vitest, @vitest/coverage-v8, better-auth devDeps
- `remix-app/package-lock.json` - lockfile for the new deps (59 packages added)
- `remix-app/vite.config.ts` - /// reference directive + node-env test block with passWithNoTests

## Decisions Made
- Kept `import { defineConfig } from "vite"` and used the triple-slash `vitest/config` reference for types (RESEARCH.md Pitfall 2).
- better-auth is a devDependency only for now (spike-scoped).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added `passWithNoTests: true` to the test config**
- **Found during:** Task 3 (prove empty run exits 0)
- **Issue:** The plan's must-have requires `npx vitest run` to exit 0 on an empty suite, but Vitest 4.x exits 1 ("No test files found, exiting with code 1") by default — a CI guard introduced after the plan's assumed behavior.
- **Fix:** Added `passWithNoTests: true` to the `test` block. The empty run now prints "No test files found, exiting with code 0" and exits 0. The script stays `vitest run` (Task 2 contract preserved). The include glob is exercised by the downstream 01-04/01-05 suites, which assert their own pass-counts, so this does not mask a broken glob.
- **Files modified:** remix-app/vite.config.ts
- **Verification:** `npx vitest run` exits 0; Task 3 verify command passes.
- **Committed in:** 9a90520 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Necessary to meet the stated must-have under Vitest 4.x. No scope creep.

## Issues Encountered
- `npm install` reported 18 vulnerabilities (8 moderate, 10 high) in transitive dev-toolchain dependencies. Not addressed here (dev-only; `npm audit fix --force` risks breaking the toolchain). Flagged for a later dependency-hygiene pass.

## Next Phase Readiness
- Harness ready for Wave 2 (01-04, 01-05) to add `app/lib/*.test.ts` suites.
- better-auth available for the 01-03 spike.

---
*Phase: 01-schema-baseline-engine-tests-auth-spike*
*Completed: 2026-06-07*
