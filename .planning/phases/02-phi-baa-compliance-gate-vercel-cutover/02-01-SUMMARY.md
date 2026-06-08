---
phase: 02-phi-baa-compliance-gate-vercel-cutover
plan: 01
subsystem: infra
tags: [vercel, react-router, netlify, drizzle, neon, deployment]

# Dependency graph
requires:
  - phase: 01-schema-engine-auth-spike
    provides: passing Vitest engine suite (75 tests) that must stay green
provides:
  - "@vercel/react-router@1.3.1 preset wired into react-router.config.ts"
  - "netlify.toml removed from repo root"
  - "drizzle.config.ts prefers DATABASE_URL_UNPOOLED for migrations"
  - "npm run build succeeds with Vercel Output API artifacts"
affects: [03-rls-retrofit, 04-data-layer, 02-02, 02-03, 02-04]

# Tech tracking
tech-stack:
  added: ["@vercel/react-router@1.3.1 (vercelPreset)"]
  patterns:
    - "react-router.config.ts: presets: [vercelPreset()] for Vercel Functions SSR"
    - "drizzle.config.ts: DATABASE_URL_UNPOOLED first in fallback chain (Pitfall 2 avoidance)"

key-files:
  created: []
  modified:
    - remix-app/react-router.config.ts
    - remix-app/package.json
    - remix-app/package-lock.json
    - remix-app/drizzle.config.ts
  deleted:
    - netlify.toml

key-decisions:
  - "D-07 delivered: vercelPreset() from @vercel/react-router/vite added to react-router.config.ts"
  - "D-05 delivered: netlify.toml removed (no @netlify/* packages existed to uninstall)"
  - "D-08 partial: drizzle.config.ts now uses DATABASE_URL_UNPOOLED first; NETLIFY_DATABASE_URL kept in chain (cleanup Phase 4)"

patterns-established:
  - "Vercel preset pattern: import { vercelPreset } from '@vercel/react-router/vite'; presets: [vercelPreset()]"
  - "Drizzle migrations URL order: DATABASE_URL_UNPOOLED || NETLIFY_DATABASE_URL || DATABASE_URL (pooled last)"

requirements-completed: [COMP-02]

# Metrics
duration: 2min
completed: 2026-06-08
---

# Phase 2 Plan 01: Vercel Cutover (Track A) Summary

**@vercel/react-router@1.3.1 preset wired into react-router.config.ts; netlify.toml deleted; drizzle-kit migrated to unpooled Neon URL — build and tests green**

## Performance

- **Duration:** 2 min
- **Started:** 2026-06-08T19:59:02Z
- **Completed:** 2026-06-08T20:00:11Z
- **Tasks:** 2 (Task 1 pre-approved; Tasks 2 and 3 executed)
- **Files modified:** 4 modified, 1 deleted

## Accomplishments

- Installed `@vercel/react-router@1.3.1` (package legitimacy pre-approved this session) and wired `vercelPreset()` into `react-router.config.ts`; `npm run build` succeeds generating Vercel Output API artifacts under `build/server/nodejs_*/`
- Deleted `netlify.toml` from repo root (D-05: Netlify removed cleanly; no `@netlify/*` packages existed)
- Updated `drizzle.config.ts` to prefer `DATABASE_URL_UNPOOLED` first, avoiding Pitfall 2 (PgBouncer pooled URL fails DDL in drizzle-kit migrations)
- Phase 1 engine suite: 75/75 tests pass, zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Package legitimacy gate** — pre-approved (no code produced)
2. **Task 2: Install @vercel/react-router and wire Vercel preset** — `c710f5c` (feat)
3. **Task 3: Remove netlify.toml and point drizzle-kit at unpooled URL** — `2ea55ce` (chore)

**Plan metadata:** (recorded below)

## Files Created/Modified

- `remix-app/react-router.config.ts` — added `import { vercelPreset } from '@vercel/react-router/vite'` and `presets: [vercelPreset()]`
- `remix-app/package.json` — added `@vercel/react-router@^1.3.1` dependency
- `remix-app/package-lock.json` — lockfile updated (36 packages added)
- `remix-app/drizzle.config.ts` — `dbCredentials.url` now prefers `DATABASE_URL_UNPOOLED`
- `netlify.toml` — **deleted** (Netlify deploy config: base/command/publish/NODE_VERSION)

## Decisions Made

- D-07 delivered: `vercelPreset()` from `@vercel/react-router/vite` added; no `vercel.json` needed (preset generates Vercel Output API artifacts automatically)
- D-05 delivered: `netlify.toml` removed. No `@netlify/*` packages existed to uninstall.
- D-08 partial: `drizzle.config.ts` credential order updated. `NETLIFY_DATABASE_URL` retained in chain as harmless fallback — its removal is deferred to Phase 4 / DATA-05 per CONTEXT.md deferred list.
- `@react-router/serve` and `start` script left intact (Vercel ignores them; removal is optional cleanup, out of scope per plan).

## Deviations from Plan

None — plan executed exactly as written. Task 1 was pre-approved by the user before this executor was spawned.

## Issues Encountered

None. The sourcemap warning (`Dropzone.tsx (1:0): Error when using sourcemap`) appeared during build but is pre-existing and does not affect build correctness — present before this plan.

## User Setup Required

None from this plan. The Vercel env var setup (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, auth secrets) is a user-action step in plan 02-03.

## Threat Surface Scan

No new security-relevant surface introduced. `drizzle.config.ts` now references `DATABASE_URL_UNPOOLED` by name (env var reference only — no connection string in the repo). The `@vercel/react-router` package supply-chain risk was mitigated by the Task 1 blocking-human legitimacy gate (T-02-01/T-02-SC satisfied).

## Known Stubs

None.

## Next Phase Readiness

- Repo is now deploy-ready for Vercel: preset installed, `npm run build` green with Vercel Output API artifacts
- Plan 02-02 (COMPLIANCE-RUNBOOK.md scaffold) is already complete (prior session)
- Plan 02-03 (Vercel env vars + project setup — user action) is the next user-action step
- Plan 02-04 (production deploy verification) follows after 02-03

---
*Phase: 02-phi-baa-compliance-gate-vercel-cutover*
*Completed: 2026-06-08*
