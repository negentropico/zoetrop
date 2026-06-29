# `_archive/` — Layer-2 historical RETURN ARTIFACTS (not the live ledger)

This folder holds the **prior design-round return artifacts** that used to live at
`docs/design-system/_rounds/`. They were relocated here (history-preserving `git mv`,
~16M, all previously-tracked files intact) by quick task **260629-ktv** to stop them
reading as "current rounds."

> **This is NOT the live ledger.** The live, harness-generated round ledger is
> `design-bridge/harness/rounds/`. These are frozen *return* snapshots — the output
> of the prototype rounds, captured for provenance, not an active workflow surface.

## What's in `rounds/`

| Entry | What it is | System it touched |
|-------|-----------|-------------------|
| `round1/` | Zoetrop redesign — foundation import (app shell, lib.jsx, wordmark/spiral mark) | `remix-app/app/` + DS library + Navigator |
| `round2/` | Left-nav prototype (standalone HTML) — chrome exploration | app chrome (left-nav rail/accordion) |
| `round3/` | Calm-instrument screens (Part A) + Recharts idiom + theme toggle | metric/dashboard screens |
| `round3/round3-return/` | **Co-mingled prototype iterations** — round3's own `screens.jsx/charts.jsx` PLUS the round4 and round5 iterations as loose files (`screens-r4.jsx · data-r4.js · prompt-r4.md` and `screens-r5.jsx · data-r5.js · prompt-r5.md`). Audit finding 1: round4/round5 were never their own subdirs here — they ran as files inside `round3-return` in the ZTP1 prototype project. They travel with this tree; there is no fabricated `round5/` subdir. |
| `harness/` | The pre-harness unbundle/css-delta tooling (`unbundle.mjs`, `css-delta.mjs`, `RETURN-SPEC.md`) — the origin of what later became `design-bridge/harness/`. |

The two `round2/Left Nav Prototype (standalone).html` copies (`round2/` and
`round2/return/`) are **md5-DIFFERENT** (`ebca898…` vs `5338165…`) — both are kept on
purpose; neither is a byte-dupe, so neither was deleted.

## Why `_archive/` (tracked) and not `.archive/` (gitignored)

The repo's `.archive/` convention is **gitignored** (`.gitignore` line 36). Moving ~16M of
version-controlled provenance there would silently drop it from git (recorded as deletions).
`_archive/` keeps the `_`-prefix scratch convention (`_rounds`, `_kit`, `_ds`, `_notes`) while
staying **tracked** and outside the DesignSync-synced component/token surface — exactly how
`_rounds/` already lived under `docs/design-system/` without being compiled or synced.

## Known stale-but-harmless references

A handful of **non-functional comments/prose** still point at the old `docs/design-system/_rounds/`
path (no `href`/`src`/`import`/`url()` runtime link points into it — verified). They are left
in place because the relevant files are protected and/or purely historical:

- `design-bridge/harness/bin/round.ts` (jsdoc), `design-bridge/diagrams/_kit/nav-manifest.js`
  (NOTE comment) — both protected.
- `remix-app/app/components/ui/{Wordmark,SpiralMark,ThemeToggle}.tsx` — `// Source:` provenance
  comments in the protected live set.
- `docs/HISTORY.md`, `docs/DESIGN-SYSTEM-ADOPTION.md`, `design-bridge/OPEN-A-LINE.md`,
  `harness/rounds/round1/ROUNDTRIP.md` — historical narrative prose.
- Self-references **inside** these archived files (round2/README, round3/RETURN-SPEC,
  harness/README/RETURN-SPEC) — frozen historical context.

Any `uploads/` references inside the archived prompt docs are likewise frozen historical
context; the live `uploads/` (brand board) stays in place at `docs/design-system/uploads/`.
