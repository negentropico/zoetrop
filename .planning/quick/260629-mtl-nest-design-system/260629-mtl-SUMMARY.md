---
phase: quick-260629-mtl
plan: "01"
quick: true
subsystem: design-infra
tags: [design-system, design-bridge, refactor, git-mv, consolidation]
dependency_graph:
  requires: []
  provides: [single-design-root]
  affects: [_ds symlink, DesignSync mapping (prose), Navigator]
tech_stack:
  added: []
  patterns: [history-preserving-git-mv, two-pass-ref-sweep]
key_files:
  modified:
    - design-bridge/diagrams/_ds (symlink repointed)
    - remix-app/app/app.css
    - remix-app/app/components/ui/{Signature,SpiralMark,ThemeToggle,Wordmark}.tsx
    - design-bridge/** (active docs/config — 14 files)
    - .gitignore, docs/DESIGN-SYSTEM-ADOPTION.md, docs/HISTORY.md
  moved:
    - docs/design-system/ → design-bridge/design-system/ (241 tracked files)
decisions:
  - "Owner chose 'nest DS under design-bridge/' → design-bridge becomes the single top-level design root; docs/ keeps its 6 narrative docs."
  - "Reference sweep updated only LIVE/operational files; .planning/**, design-bridge/_archive/**, the moved pkg's _archive/**, and frozen round package/ snapshots left as point-in-time history."
  - "_rounds refs corrected to _archive/rounds (compounding the prior ktv relocation) — handled by an ordered two-pass replacement (specific _rounds first, then general)."
metrics:
  duration: "~single session (orchestrator-driven)"
  completed: "2026-06-29"
  tasks_completed: 2
  files_changed: "242 moved + 22 ref-updated"
---

# Quick 260629-mtl: Nest design-system under design-bridge

**One-liner:** `git mv docs/design-system → design-bridge/design-system` so the repo has ONE top-level design root (the owner's "fewer places" ask), repoint the `_ds` symlink, and sweep live references to the new path.

## What Was Done

### 1. Structural move (commit `759cff7`)
- `git mv docs/design-system design-bridge/design-system` — **241 tracked files**, history-preserving (all renames reported R100). `docs/` keeps its 6 narrative docs (PLATFORM, PRINCIPLES, HISTORY, NAMING, COMPLIANCE-RUNBOOK, DESIGN-SYSTEM-ADOPTION).
- Repointed the `_ds` symlink: `design-bridge/diagrams/_ds → ../design-system` (was `../../docs/design-system`). The Navigator reaches the DS via `_ds/` (`var DS = "_ds/"` in `nav-manifest.js`), so only the symlink target needed changing — verified `_ds/{tokens/colors.css, guidelines/*, components/core/Button.jsx, _ds_manifest.json, assets/mark-spiral.svg}` all resolve.

### 2. Reference sweep (commits `21b3640`, `9e376d5`)
Two-pass replacement (specific `_rounds`→`_archive/rounds` first, then general `docs/design-system`→`design-bridge/design-system`) across **22 live files**:
- **Live app provenance comments:** `app.css` + `Signature/SpiralMark/ThemeToggle/Wordmark.tsx` (the `_rounds` trap corrected — these compounded the prior ktv `_rounds→_archive/rounds` move).
- **Active design-bridge docs/config (14):** README, OPEN-A-LINE, RETURN-GATE, DIAGRAM-NAVIGATOR-HANDOFF, diagrams/README + `_kit/{_adapter.css,nav-manifest.js}` + programme-overview board, harness `design-bridge.config.ts` + `bin/round.ts`, round1 `CHARTER/ROUNDTRIP/carried`, round4 `PROMPT-LINE-reports`.
- **Narrative + config (3):** `.gitignore` rationale comment, `docs/DESIGN-SYSTEM-ADOPTION.md`, `docs/HISTORY.md` location pointer.
- `nav-manifest.js`/`diagrams/README.md` symlink-relative descriptions fixed to `../design-system`.

**Left as history (not rewritten):** `.planning/**`, `design-bridge/_archive/**`, the moved package's own `_archive/**`, and frozen round `package/current-state/` snapshots — point-in-time records.

## Verification Signals

| Signal | Result |
|--------|--------|
| `git mv` history-preserving | 241 files, all R100 (pure renames) |
| `docs/design-system/` removed; `docs/` keeps narrative docs | YES |
| `_ds` symlink resolves to DS files (5 representative paths) | YES |
| `npm run build` (post-move) | exit 0 (658ms) |
| App build impact | NONE — `app.css` inlines tokens, never `@import`s the path |
| Live `docs/design-system` refs remaining (excl. history/frozen) | **0** |
| Broken `design-system/_rounds` refs | 0 |
| Ref-update diffs | comment/label/prose only — no functional code |

## DesignSync note (mapping unchanged, not invoked)
The DesignSync ⇄ DS mapping is **prose / tool-call-time only** — `design-bridge.config.ts` has no `docs/design-system` path binding (its `surfaces[]`, `tokens.path`, `dirs` all point at `remix-app/app/` and `design-bridge/harness/`). So the move breaks nothing automated. The canonical mapping prose (ROUNDTRIP.md, round.ts comments) was repointed so a future DesignSync push/pull targets `design-bridge/design-system/`. **No DesignSync writes were made** (per the handoff rule — no promotion intended).

## Deviations from Plan
This was orchestrator-driven (no separate executor) — the move is reference-sensitive (symlink + `_rounds` trap + history-vs-live boundary) and warranted holding the full scout in one context rather than delegating to a worktree.

## Not done (other Task-B hygiene options — deferred, owner did not select)
- `rmdir _notes/` (empty, gitignored, at **repo root** — not under design-system).
- Gitignore the generated DS artifacts (`_ds_bundle.js`, `_ds_manifest.json`, `_adherence.oxlintrc.json`) — first confirm the `*.card.html` galleries / offline Navigator don't need the committed bundle.
- Relocate `uploads/` (5.9M) → `_archive/` — repoint `readme.md`'s `colors.jpg` first.

## Self-Check: PASSED
- [x] `design-bridge/design-system/` exists with 241 files; `docs/design-system/` gone
- [x] `_ds` symlink repointed and resolves
- [x] `npm run build` exit 0
- [x] Zero live `docs/design-system` refs (history/frozen excepted)
- [x] No functional code changed in the ref sweep
- [x] DesignSync not invoked; mapping prose repointed
