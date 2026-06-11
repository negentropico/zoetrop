---
phase: quick-260611-j6n
plan: 01
subsystem: design-system
tags: [design-roundtrip, harness, tooling, docs]
requires: []
provides:
  - "unbundle.mjs: bundler-HTML exploder (manifest/template decode, zero deps)"
  - "css-delta.mjs: prototype-vs-app.css NEW/CHANGED/DUPLICATE report (zero deps)"
  - "Round protocol (harness/README.md) + RETURN-SPEC return contract"
  - "Round2 left-nav artifacts durably archived in-repo"
  - "Round3 outbound package (polish + data-viz brief) send-ready modulo TODO(owner)"
affects: [docs/design-system/_rounds, docs/DESIGN-SYSTEM-ADOPTION.md]
tech-stack:
  added: []
  patterns:
    - "Per-round directory contract: roundN/{package,return,extracted}"
    - "Zero-dependency node:fs/path/zlib scripts — no eval, no network, outdir-confined writes"
key-files:
  created:
    - docs/design-system/_rounds/harness/unbundle.mjs
    - docs/design-system/_rounds/harness/css-delta.mjs
    - docs/design-system/_rounds/harness/README.md
    - docs/design-system/_rounds/harness/RETURN-SPEC.md
    - docs/design-system/_rounds/round2/README.md
    - docs/design-system/_rounds/round2/extracted/zn-proto.css
    - docs/design-system/_rounds/round2/return/ (8 files)
    - docs/design-system/_rounds/round3/package/ (README, BRIEF, RETURN-SPEC, current-state ×4)
  modified:
    - docs/DESIGN-SYSTEM-ADOPTION.md
decisions:
  - "Extracted styles/NN.css get uuid refs rewritten with ../assets/ prefix (styles/ is one level deep); index.html uses assets/"
  - "Custom properties compared as value SETS per name (handles per-theme dark remaps without scope tracking)"
  - "Asset filenames flattened to basename — hostile manifest keys cannot path-traverse out of outdir (T-j6n-01)"
  - "ADOPTION §3 note appended as a blockquote after the sequence paragraph — diagram untouched (2e taken, trivially safe)"
metrics:
  duration: ~12 min
  completed: 2026-06-11
  tasks: 2/2
  commits: 3
---

# Quick Task 260611-j6n: Design-Roundtrip Integration Harness + Round3 Package Summary

Zero-dep unbundle.mjs + css-delta.mjs harness with RETURN-SPEC contract makes design returns mechanical, round2's 1.6MB bundler HTML is durably archived with its landing history, and the round3 outbound package (whole-app polish + data-viz brief, current-state inventory) is send-ready except for TODO(owner) voice markers.

## What Was Built

- **`harness/unbundle.mjs`** — decodes the `__bundler/manifest` (22 base64+gzip assets in round2's file) into `assets/` with mime-derived extensions, JSON-parses the `__bundler/template` string into `index.html` with uuid refs rewritten to relative asset paths, extracts template `<style>` blocks to `styles/NN.css` and inline jsx/babel scripts to `src/NN.jsx`; plain-HTML fallback; `--help`. Picks the bundler tag whose body actually JSON-parses (the loader JS contains decoy occurrences of the tag strings).
- **`harness/css-delta.mjs`** — markdown report: NEW / CHANGED / DUPLICATE custom properties (value-set comparison per name) and prototype-only / in-both selectors, vs `remix-app/app/app.css` by default; depth-aware brace walk descends @media blocks; `--help` states the naive-parsing limits.
- **`harness/README.md`** — round protocol: `roundN/{package,return,extracted}` layout, 6-step workflow (prep → send → drop → unbundle → delta → /gsd-quick integrate, citing q56/rj2/rwg as the reference run), script usage, round history table.
- **`harness/RETURN-SPEC.md`** — return contract: loose source + ONE new-rules-only `new.css` + `CHANGES.md`; existing token names; idiom mapping table (NLink→NavLink, Icon→lucide import, window.ZD.categories→CATEGORY_INFO 9 ids, theme hooks→ThemeToggle/data-theme, zt-/zn- prefixes reserved); standalone HTML = viewing artifact only; 760px breakpoint; dark via `html[data-theme="dark"]` remap only.
- **Round2 archive** — `return/` (1.6MB bundler HTML + nav-app.jsx + sidebar.jsx + 5 PNGs, byte-identical copies; PNG names preserve the U+202F before "PM"), `extracted/zn-proto.css` (q56 hand-extraction, now the acceptance-test reference), README recording the baked interaction model, the q56→rj2→rwg landing, the 3 integration pain points, and `_notes/` redundancy.
- **Round3 package** — README (live-preview workflow, credentials out-of-band, no screenshots by design), BRIEF Part A (24 UI routes enumerated under the fixed chrome + what-NOT-to-change list) and Part B (9 viz components with verified `components/ui/` paths + chart-language ask) with 3 `TODO(owner)` markers, current-state (verbatim app.css + nav-tree.ts, generated routes.md with resource-route/public flags, components.md: 27 ui + 4 shell components with key props), byte-identical RETURN-SPEC copy.
- **ADOPTION §3** — one blockquote noting the protocol now lives in the harness and round3 is prepped.

## Verification (all green)

- `node --check` on both scripts.
- **Acceptance gate:** `unbundle.mjs` on the archived round2 HTML → `styles/02.css` equals `round2/extracted/zn-proto.css` modulo whitespace (exit 0, 9463 normalized chars both sides). Decoded woff2 verified as real WOFF2; index.html contains zero residual `__bundler` refs.
- **css-delta sanity:** against zn-proto.css + real app.css → 41/41 custom properties DUPLICATE, 0 NEW, 0 CHANGED (expected — round2 already integrated); 5 prototype-only selectors (`.zn-ghost*`, `.zn-grid-4`, `a:focus`).
- Byte-identity (`diff -q`/`cmp`): all 8 return files + zn-proto.css vs main-tree sources; round3 RETURN-SPEC vs harness master; current-state app.css + nav-tree.ts vs repo.
- `round2/return` holds exactly 8 files; `ls -R _rounds` matches the CONTEXT layout (round1 untouched).
- `git diff --stat remix-app/` shows no changes from this task (only the concurrent session's pre-existing `Wordmark.tsx` modification, never staged).
- No deletions in any of the 3 commits.

## Commits

| # | Hash | Description |
|---|------|-------------|
| 1 | 500f7cb | chore(design): archive round2 left-nav return artifacts (1.6MB HTML + PNGs isolated) |
| 2 | 27aff7a | feat(design): roundtrip harness — unbundle, css-delta, round protocol, RETURN-SPEC |
| 3 | 19cad6e | docs(design): round3 outbound package — polish + data-viz brief, current-state inventory |

## Deviations from Plan

**1. [Rule 1 - Minor] PNG filenames contain U+202F (narrow no-break space)**
- **Found during:** Task 1a — literal-path `cp` of the 5 screenshots failed (macOS screenshot names use U+202F before "PM", not a plain space)
- **Fix:** copied via glob; names preserved exactly; byte-identity verified per file
- **Files modified:** none (copy mechanics only)

**2. [Plan note] ui/ component count is 27, not 28** — the plan's `<interfaces>` said 28 excluding tests; actual count of non-test `app/components/ui/*.tsx` is 27. components.md documents the real 27.

## Threat Model Disposition

- **T-j6n-01 (mitigated):** unbundle.mjs — pure string/zlib parsing, no eval/dynamic import/network; asset names flattened to `basename()` so manifest keys cannot escape outdir.
- **T-j6n-02 (mitigated):** round3 README states credentials are supplied out-of-band; no secret appears in any committed doc.
- **T-j6n-SC (accepted as planned):** zero package installs.

## Known Stubs

None — docs and standalone scripts only; no app code touched. The 3 `TODO(owner)` markers in BRIEF.md are intentional voice slots the user fills before sending round3.

## Self-Check: PASSED

All 4 harness files, round2 README/extracted/return(8), round3 package (README, BRIEF, RETURN-SPEC, current-state ×4) exist; commits 500f7cb / 27aff7a / 19cad6e present on `left-nav-refactor`; acceptance gate re-run green.
