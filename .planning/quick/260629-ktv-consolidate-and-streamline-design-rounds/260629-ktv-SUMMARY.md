---
task: 260629-ktv
title: Consolidate & streamline design rounds — archive prior return artifacts, pin token SoT
branch: design/zoetrop-dl-prime
date: 2026-06-29
commit: 3c98347
type: reversible reorg (history-preserving git mv only)
---

# Quick Task 260629-ktv — Summary

Owner-approved, reversible reorganization of the design-line history to the 3-layer
model. Reorg-only: no live/shipping logic changed; every relocation is a history-preserving
`git mv`; the only deletion is gitignored, md5-verified-IDENTICAL scratch.

**Single atomic commit:** `3c98347` — 150 files changed, **168 insertions(+), 0 deletions**,
all moves recorded as **renames at 100% similarity** (history intact).

## What moved (with git-rename confirmation + ls-files counts)

### T1 — Layer-2 impostor relocated
- `git mv docs/design-system/_rounds → docs/design-system/_archive/rounds`
  - 124 tracked files, all recorded as renames (`R`). `git ls-files docs/design-system/_rounds` → **0**;
    `git ls-files docs/design-system/_archive/rounds` → **124**.
  - Subsumes the round4/round5 prototype entanglement (audit finding 1): the co-mingled
    `screens-r4.jsx · data-r4.js · prompt-r4.md` and `screens-r5.jsx · data-r5.js · prompt-r5.md`
    inside `round3/round3-return/` rode the tree move — no fabricated `round5/` subdir.
- Destination is the **TRACKED** `_archive/` (verified `git check-ignore docs/design-system/_archive` →
  empty/exit 1), NOT the gitignored `.archive/`. Provenance stays in version control.

### T2 — Layer-3 closed records archived
- `git mv design-bridge/NEXT-LINE-PLAN.md → design-bridge/_archive/NEXT-LINE-PLAN.md` (1 rename).
- `git mv design-bridge/harness/rounds/round5 → design-bridge/_archive/rounds/round5`
  (15 tracked files, all renames). Live ledger now holds only **round1 / round4 / round6** (+ harness) — untouched.
- `git check-ignore design-bridge/_archive` → empty/exit 1 (tracked).

## md5 results (pre-flight, acted on — not assumed)

- **Left Nav HTMLs DIFFER → both kept** (guardrail forbids deleting either):
  - `round2/Left Nav Prototype (standalone).html` = `ebca89841bcf4d3867fb2006b0c18ce8`
  - `round2/return/Left Nav Prototype (standalone).html` = `5338165141666c472aca5a12d24d7afd`
- **All 5 `_notes/*.png` md5-IDENTICAL** to their same-basename `round2/return/` counterparts
  (matched by shell glob + `basename`, never retyping the U+202F filename):
  | basename (…PM.png) | md5 |
  |---|---|
  | 9.21.50 | `86eb0e59d870f6800e3926a16c5da4f0` |
  | 9.21.56 | `bc68328b19ad40835218e81c46669196` |
  | 9.22.01 | `3611436aa27ffc5b750202ce0f49b63b` |
  | 9.22.05 | `0e3cf9b860c908f7d1a6c191795044ad` |
  | 9.22.10 | `78de7e99b60e102b466b4edb2c8c7492` |

## The only deletion

`_notes/*.png` (5 files) — gitignored + untracked working scratch, md5-verified IDENTICAL to the
now-archived `docs/design-system/_archive/rounds/round2/return/*.png` (canonical tracked copies
preserved). Nothing version-controlled was deleted; `git show --diff-filter=D HEAD` → **NONE**.

## Token source-of-truth markers (header comments only — insertions-only, 0 deletions each)

| File | Marker | numstat |
|------|--------|---------|
| `remix-app/app/app.css` | `TOKEN-SOT:CANONICAL` (dark lives ONLY here) | 14 / 0 |
| `docs/design-system/tokens/colors.css` | `TOKEN-SOT:DERIVED` (full block, light-only) | 10 / 0 |
| `docs/design-system/tokens/base.css` | `TOKEN-SOT:DERIVED` (one-line) | 1 / 0 |
| `docs/design-system/tokens/fonts.css` | `TOKEN-SOT:DERIVED` (one-line) | 1 / 0 |
| `docs/design-system/tokens/spacing.css` | `TOKEN-SOT:DERIVED` (one-line) | 1 / 0 |
| `docs/design-system/tokens/typography.css` | `TOKEN-SOT:DERIVED` (one-line) | 1 / 0 |
| `design-bridge/diagrams/_kit/_adapter.css` | `TOKEN-SOT:DERIVED` (self-contained Navigator mirror) | 11 / 0 |

7 markers total; no token merged, deleted, or revalued (all diffs are added comment lines).

## Docs written (T3)

- `docs/design-system/_archive/README.md` (NEW, 50 lines) — Layer-2 split explanation + round3
  co-mingled-iterations note + the tracked-vs-`.archive/` rationale + known-stale-refs list.
- `design-bridge/_archive/README.md` (NEW, 46 lines) — Layer-3 closed-records (round5 S-sig,
  integrated 260620-rd4) + the `bin/round.ts` regeneration caveat.
- `design-bridge/README.md` (EDIT) — "two rounds trees" section + per-round system/return
  alignment table (ZTP1 `f200a4ef-…`).

## Static verification (executor-run) — all pass

- Renames present: `git status --porcelain | grep -cE '^R'` = 140 (124 + 16). _archive/rounds ls-files = 124.
- `git check-ignore` of both `_archive` destinations → empty (tracked).
- `readlink design-bridge/diagrams/_ds` → `../../docs/design-system`; `_ds/tokens/colors.css` resolves.
- **Zero FUNCTIONAL refs into `_rounds`** — grep for `href=|src=|import|from|url(|fetch(|require(` → NONE.
- Commit content-deletions (`--diff-filter=D`) → NONE.

## ⚠️ For the orchestrator's dynamic gate — re-check these

1. **Navigator (Chrome, light + dark):** confirm boards still render. The `_ds` symlink and the
   `_adapter.css` mirror were only annotated (insertions-only), and all relocations stay UNDER
   `docs/design-system/`, so the symlink target is unchanged — but verify visually.
2. **`npm run build` from `remix-app/`:** the only live-set edit is the `app.css` header COMMENT
   block (14 insertions after `@import "tailwindcss";`). Confirm the comment did not disturb the build.
3. **Literal T3 verify caveat (plan defect, not a regression):** the plan's T3 `<automated>` grep
   (`design-bridge/diagrams remix-app` for `_rounds/`, excluding `nav-manifest.js`) still matches
   **3 protected provenance comments** it did not anticipate:
   `remix-app/app/components/ui/{Wordmark,SpiralMark,ThemeToggle}.tsx` (`// Source: …_rounds/round1…`).
   These are **non-functional comments in the protected live set** (guardrail #4 forbids editing
   `remix-app/app/**` except `app.css`). The **substantive** check — no functional reference dangles —
   passes (proven: zero href/src/import/url/fetch/require into `_rounds`). They are documented as
   known-stale-but-harmless in `docs/design-system/_archive/README.md`. **No action needed**; flagged
   for transparency. (Same class: stale prose in `docs/HISTORY.md`, `docs/DESIGN-SYSTEM-ADOPTION.md`,
   `design-bridge/OPEN-A-LINE.md`, `harness/rounds/round1/ROUNDTRIP.md`, and `bin/round.ts` jsdoc +
   `nav-manifest.js` NOTE — all out of this task's tightly-scoped surface.)

## Carried follow-ups (NOT this task)

- `design-bridge/harness/bin/round.ts` is protected and still emits a round5 ledger block — a future
  `npm run design:round` will re-create a 2-file stub at `harness/rounds/round5/`. The archived copy is
  the canonical closed snapshot; pruning the round5 block from `round.ts` is a deliberate follow-up.
- `docs/design-system/uploads/` (~5.9M) left in place (audit finding 4 — referenced by the protected
  `readme.md` brand board). De-weight candidate for a later pass.

## Self-Check: PASSED

- Created files exist: `docs/design-system/_archive/README.md`, `design-bridge/_archive/README.md` — FOUND.
- Relocations exist: `docs/design-system/_archive/rounds/round2`, `design-bridge/_archive/rounds/round5/DECISIONS.md`,
  `design-bridge/_archive/NEXT-LINE-PLAN.md` — FOUND; old paths gone — CONFIRMED.
- Commit `3c98347` — FOUND in `git log`.
