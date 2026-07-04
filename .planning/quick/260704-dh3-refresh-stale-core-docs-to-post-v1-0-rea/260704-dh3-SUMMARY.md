---
phase: quick
plan: 260704-dh3
subsystem: docs
tags: [readme, claude-md, principles, project-md, vercel, better-auth, routing, docs-accuracy]

provides:
  - README.md corrected to post-v1.0 reality (Vercel, 636/22 schema, explicit routing, full route surface)
  - CLAUDE.md directory/route tables matching remix-app/app/routes.ts, Better-Auth + design-bridge notes, v1.0-shipped/v1.1-executing planning state, corrected decisions, footer dated July 4 2026
  - docs/PRINCIPLES.md line-20 factual correction (Vercel, 22 tables, tenancy shipped)
  - .planning/PROJECT.md Netlify->Vercel fixes (lines 35, 82)
affects: [docs, onboarding, future-quick-tasks-reading-core-docs]

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - README.md
    - CLAUDE.md
    - docs/PRINCIPLES.md
    - .planning/PROJECT.md

key-decisions:
  - "Reframed CLAUDE.md 'Two open decisions' bullet as 'Resolved decisions' — both cited decisions (Better-Auth<->Neon-JWK seam, LLM-provider PHI/BAA) were already closed per STATE.md/PROJECT.md, nothing genuinely open remained to list"

requirements-completed: [DOC-ACCURACY]

duration: ~10min
completed: 2026-07-04
---

# Quick Task 260704-dh3: Refresh Stale Core Docs to Post-v1.0 Reality Summary

**Corrected four core docs (README, CLAUDE.md, PRINCIPLES.md, PROJECT.md) from pre-v1.0/Netlify-era claims to the verified post-v1.0 reality: Vercel deployment, 636-line/22-table schema, explicit `app/routes.ts` routing with the full authenticated surface, and Better-Auth.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 3 completed
- **Files modified:** 4

## Accomplishments

- README.md: Netlify → Vercel (`zoetrop.vercel.app`), 201/8 → 636/22 schema, file-based → explicit `app/routes.ts` routing, route table now includes the landing page and the full authenticated app surface (auth, ingest, reports, clients, settings)
- CLAUDE.md: directory tree and Route Structure table rebuilt to match the real `routes/_app/*` surface (dashboard, metrics, protocol, insights, import, ingest, reports, clients, settings, subject-switch); added Better-Auth and design-bridge notes; Planning Workflow section now states v1.0-shipped/v1.1-executing with resolved decisions; footer dated July 4, 2026
- docs/PRINCIPLES.md and .planning/PROJECT.md: surgical Netlify→Vercel and 8→22-table corrections, preserving each doc's existing voice and structure
- docs/HISTORY.md and docs/NAMING.md deliberately left untouched (their Netlify mentions are intentional history)

## Task Commits

Each task was committed atomically:

1. **Task 1: Correct README.md to post-v1.0 reality** - `d3baedb` (docs)
2. **Task 2: Correct CLAUDE.md directory/route tables, auth, design root, planning state, footer** - `3852bd2` (docs)
3. **Task 3: Minimal Netlify→Vercel + table-count fixes in PRINCIPLES.md and PROJECT.md** - `b46531b` (docs)

_Note: this is a docs-only quick task — no plan-metadata commit is created here; the orchestrator handles the docs commit (SUMMARY.md, STATE.md) in its own step._

## Files Created/Modified

- `README.md` - status blockquote, deployment, project structure, routes table, deployment table
- `CLAUDE.md` - directory structure tree, route structure table, auth/design-root notes, planning workflow section, footer date
- `docs/PRINCIPLES.md` - line 20 factual correction (Vercel, 22 tables, tenancy shipped)
- `.planning/PROJECT.md` - lines 35 and 82, Netlify → Vercel

## Decisions Made

- CLAUDE.md's "Two open decisions" bullet was reframed as "Resolved decisions" rather than silently deleted — both items it named (Better-Auth↔Neon-JWK seam, LLM-provider PHI/BAA) were already closed per `.planning/STATE.md` and `.planning/PROJECT.md` Key Decisions, and nothing else was genuinely open to replace them with.

## Deviations from Plan

None - plan executed exactly as written. All facts were pre-verified in the plan's `<verified_facts>` block and used directly; no additional investigation or architectural changes were needed.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four target docs now match the live codebase (routes.ts, schema.ts, Vercel deployment, STATE.md planning position).
- docs/HISTORY.md and docs/NAMING.md remain untouched as intended — no further action needed there.
- No blockers for future quick tasks or phase planning that reads these docs.

---
*Phase: quick*
*Completed: 2026-07-04*

## Self-Check: PASSED

All 5 created/modified files verified present on disk; all 3 task commit hashes (`d3baedb`, `3852bd2`, `b46531b`) verified present in git log.
