---
phase: quick-260704-dpp
plan: 01
subsystem: infra
tags: [git, repo-hygiene, design-bridge, harness, typescript]

# Dependency graph
requires:
  - phase: quick-260629-mtl
    provides: single design root (design-bridge/design-system nested)
  - phase: quick-260629-ktv
    provides: 3-layer design-rounds model + _archive convention
provides:
  - Repo-root _notes/ removed (empty gitignored dir)
  - Documented SKIP decision for gitignoring committed DS runtime artifacts
  - design-bridge/design-system/uploads/ relocated to _archive/uploads/ (5.9M, 27 files, history-preserving)
  - harness/bin/round.ts no longer recreates a stale round5 manifest stub
affects: [design-bridge, docs/DESIGN-SYSTEM-ADOPTION.md]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - design-bridge/design-system/readme.md
    - docs/DESIGN-SYSTEM-ADOPTION.md
    - design-bridge/harness/bin/round.ts
  moved:
    - design-bridge/design-system/uploads/ -> design-bridge/design-system/_archive/uploads/ (27 files)
  removed:
    - /Users/mac/Code/zoetrop/_notes/ (main repo root, filesystem-only, untracked/gitignored)

key-decisions:
  - "Item 2 (gitignore generated DS artifacts) SKIPPED — _ds_bundle.js/_ds_manifest.json/_adherence.oxlintrc.json are runtime deps loaded via static <script src> in 4 offline gallery/Navigator surfaces, with no regeneration script; gitignoring would break a fresh checkout"
  - "Live-reference sweep for item 3 found two additional stale refs beyond the pre-verified fact list (docs/DESIGN-SYSTEM-ADOPTION.md lines 37 and 59, referencing uploads/screens-package/) — repointed in the same commit per plan instruction to catch new refs"
  - "Worktree lacked design-bridge/harness/node_modules and .staging-core (both gitignored, not synced to this worktree) — verified the round.ts typecheck via a scratch-directory copy of the main repo's harness environment (node_modules + .staging-core) with the edited round.ts overlaid, run in isolation from both the worktree and the main repo's working tree"

requirements-completed: [HANDOFF-TaskB-hygiene]

# Metrics
duration: 3min
completed: 2026-07-04
---

# Quick Task 260704-dpp: Design/Repo Hygiene Summary

**Closed out the four remaining HANDOFF Task-B hygiene items: removed the dead repo-root `_notes/`, documented a SKIP on gitignoring the DS runtime bundle, relocated 5.9M of source `uploads/` into `_archive/` with history preserved, and pruned the closed round5 emitter block from the design harness.**

## Performance

- **Duration:** ~3 min (commits 09:59:44 → 10:02:18 local; verification/setup before and after)
- **Started:** 2026-07-04T15:57:00Z (approx.)
- **Completed:** 2026-07-04T16:02:18-06:00 (last commit)
- **Tasks:** 3 (2 produced commits, 1 filesystem-only/no-commit)
- **Files modified:** 3 edited (readme.md, DESIGN-SYSTEM-ADOPTION.md, round.ts) + 27 relocated (uploads/ → _archive/uploads/) + 1 dir removed outside the worktree (_notes/)

## Accomplishments

- Repo-root `_notes/` (main tree) removed — dead empty dir, zero git delta.
- Item 2 gitignore SKIP re-verified and documented with fresh evidence (all 3 DS artifacts still tracked; `_ds_bundle.js` still referenced by 4 live `<script src>` surfaces; no regeneration script exists).
- `design-bridge/design-system/uploads/` (27 files, 5.9M) relocated to `_archive/uploads/` via `git mv` — all shown as renames, zero delete+add. `readme.md` provenance cross-ref and two additional live refs in `docs/DESIGN-SYSTEM-ADOPTION.md` (discovered during the live-reference re-sweep, not in the original pre-verified fact list) repointed in the same commit.
- `design-bridge/harness/bin/round.ts` no longer emits a round5 manifest/DECISIONS.md stub or the `sig`-referencing console.log; round4 and round6 blocks are untouched; harness typecheck exits 0 (verified via an isolated scratch copy — see Deviations).

## Task Commits

1. **Task 1: rmdir repo-root `_notes/` + document item-2 SKIP** — no commit (zero git delta; filesystem-only op against the main repo root, documented here)
2. **Task 2: Relocate `uploads/` → `_archive/uploads/` + repoint refs** - `9dd6b21` (chore)
3. **Task 3: Prune closed round5 seed block from `round.ts`** - `d42c148` (chore)

**Plan metadata:** pending (orchestrator handles the docs commit)

## Files Created/Modified

- `design-bridge/design-system/readme.md` - Provenance cross-ref repointed from `uploads/colors.jpg` to `_archive/uploads/colors.jpg`
- `docs/DESIGN-SYSTEM-ADOPTION.md` - Two `screens-package/` path references repointed to `_archive/uploads/screens-package/`
- `design-bridge/harness/bin/round.ts` - Removed the round5 (`sig`) emitter block (manifest write, DECISIONS.md write, console.log) — 63 lines deleted; round4/round6 blocks intact
- `design-bridge/design-system/_archive/uploads/` (new location, 27 files, all git renames from `uploads/`)
- `/Users/mac/Code/zoetrop/_notes/` (main repo root, removed via `rmdir` — untracked/gitignored, no git delta)

## Decisions Made

- **Item 2 SKIP confirmed**: `_ds_bundle.js`, `_ds_manifest.json`, `_adherence.oxlintrc.json` remain git-tracked and untouched. Evidence re-verified live: all three still tracked (`git ls-files`); `_ds_bundle.js` referenced via static `<script src="../../_ds_bundle.js">` in `ui_kits/app/index.html` and the three `components/{core,forms,data}/*.card.html` galleries (plus one archived round1 reference, not live); no writer/regeneration script exists anywhere in `design-bridge/**/*.ts,*.js` outside `_archive` (only a comment in `diagrams/_kit/nav-manifest.js`). Gitignoring would silently break the offline Navigator/galleries on a fresh checkout with no auto-regen path.
- **Expanded the item-3 relocation scope**: the plan's pre-verified facts listed only `readme.md:19` as a live reference to `uploads/`. Re-running the live sweep during execution turned up two more hits in `docs/DESIGN-SYSTEM-ADOPTION.md` (a narrative doc's "done" sequence step and its package description, both pointing at `design-bridge/design-system/uploads/screens-package/`). Per the plan's own instruction ("If new live refs appear, repoint every one of them in this same commit"), both were repointed in the Task 2 commit. This is Rule 1 territory (broken/stale reference) applied within the plan's own explicit contingency — not a scope expansion requiring a checkpoint.
- **Verification workaround for Task 3's typecheck gate**: this worktree does not have `design-bridge/harness/node_modules` or `.staging-core` populated (both are gitignored local-only artifacts, not synced into fresh worktrees). Rather than running `npm install` inside the worktree (which would touch the worktree's dependency state for a one-off verification and isn't part of this task's scope) or mutating the main repo's shared working tree (risk under the "concurrent sessions on shared tree" constraint), verification was performed by copying the main repo's already-populated `design-bridge/harness/` (including `node_modules` and `.staging-core`) into an isolated scratch directory (mirroring the relative path to `remix-app/tsconfig.json` that the harness tsconfig extends), overlaying the worktree's edited `round.ts`, and running `tsc -p tsconfig.json` there. Result: exit 0, matching the plan's pre-verified baseline. The main repo's working tree and the worktree itself were both left untouched by this verification step; scratch files were deleted afterward.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug/stale reference] Repointed two additional live references in docs/DESIGN-SYSTEM-ADOPTION.md**
- **Found during:** Task 2 (live-reference re-sweep before the `uploads/` relocation)
- **Issue:** The plan's pre-verified facts listed only one live reference (`readme.md:19`). Re-running the sweep during execution found `docs/DESIGN-SYSTEM-ADOPTION.md:37` and `:59`, both pointing at `design-bridge/design-system/uploads/screens-package/` (a real, existing subdirectory of `uploads/` that was about to move).
- **Fix:** Repointed both lines to `design-bridge/design-system/_archive/uploads/screens-package/` in the same commit as the `git mv`.
- **Files modified:** `docs/DESIGN-SYSTEM-ADOPTION.md`
- **Verification:** Post-edit sweep (`grep -rn "uploads/colors\|design-system/uploads/" design-bridge docs remix-app | grep -v _archive | grep -v node_modules`) returns zero hits.
- **Committed in:** `9dd6b21` (Task 2 commit)

**2. [Rule 3 - Blocking] Verification environment gap for the harness typecheck**
- **Found during:** Task 3 (post-edit `tsc -p design-bridge/harness/tsconfig.json` verification)
- **Issue:** This worktree has no `design-bridge/harness/node_modules` or `.staging-core` (both gitignored, not present in a fresh worktree checkout), so the plan's literal verify command (`design-bridge/harness/node_modules/.bin/tsc ...`) could not run in-place.
- **Fix:** Copied the main repo's populated `design-bridge/harness/` (node_modules + .staging-core) plus `remix-app/tsconfig.json` (the base config it extends) into an isolated scratch directory at the matching relative path, overlaid the edited `round.ts`, and ran `tsc -p tsconfig.json` there — exit 0.
- **Files modified:** None (verification-only; scratch copy deleted after use; neither the worktree nor the main repo's tree was touched)
- **Verification:** `tsc` exit code 0, matching the plan's stated pre-verified baseline.
- **Committed in:** N/A (verification step, no code change)

---

**Total deviations:** 2 auto-fixed (1 Rule 1 stale-reference, 1 Rule 3 verification-environment workaround)
**Impact on plan:** Both were anticipated/allowed by the plan itself (the first is explicitly called out as a contingency in Task 2's action text; the second is a verification-tooling gap specific to worktree isolation, not a change in scope or outcome). No scope creep — all four plan items completed exactly as specified plus the plan's own "catch new refs" instruction.

## Issues Encountered

- `_notes/` at repo root exists only in the main tree (untracked/gitignored), not in this worktree — per the orchestrator's explicit instruction, the `rmdir` was performed against `/Users/mac/Code/zoetrop/_notes` directly rather than the worktree path. Zero git delta either way, as expected.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four HANDOFF Task-B hygiene items are closed (rmdir done, gitignore SKIP documented, uploads/ relocated, round5 stub pruned).
- Remaining HANDOFF item is Task C (B01 accurate vectors, Figma-aligned round) — unrelated to this quick task, not started here.
- `_ds` symlink and the DesignSync↔DS mapping were not touched by any of these changes.

---
*Phase: quick-260704-dpp*
*Completed: 2026-07-04*

## Self-Check: PASSED

- FOUND: design-bridge/design-system/readme.md
- FOUND: docs/DESIGN-SYSTEM-ADOPTION.md
- FOUND: design-bridge/harness/bin/round.ts
- FOUND: design-bridge/design-system/_archive/uploads/colors.jpg
- CONFIRMED GONE: design-bridge/design-system/uploads/
- CONFIRMED GONE: /Users/mac/Code/zoetrop/_notes/ (main repo root)
- FOUND commit: 9dd6b21
- FOUND commit: d42c148
