---
phase: quick-260629-ktv
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  # T1 — relocate Layer-2 historical return artifacts (git mv, single tree, ~16M, 124 tracked files)
  - docs/design-system/_rounds/**                    # → docs/design-system/_archive/rounds/** (git mv)
  - _notes/*.png                                     # DELETE (gitignored, untracked, md5-verified IDENTICAL dupes)
  # T2 — archive Layer-3 closed records + token SoT header notes
  - design-bridge/NEXT-LINE-PLAN.md                  # → design-bridge/_archive/NEXT-LINE-PLAN.md (git mv)
  - design-bridge/harness/rounds/round5/**           # → design-bridge/_archive/rounds/round5/** (git mv)
  - remix-app/app/app.css                            # header note only (CANONICAL marker)
  - docs/design-system/tokens/colors.css             # header note only (DERIVED marker, full)
  - docs/design-system/tokens/base.css               # one-line DERIVED marker
  - docs/design-system/tokens/fonts.css              # one-line DERIVED marker
  - docs/design-system/tokens/spacing.css            # one-line DERIVED marker
  - docs/design-system/tokens/typography.css         # one-line DERIVED marker
  - design-bridge/diagrams/_kit/_adapter.css         # header note only (DERIVED marker)
  # T3 — alignment docs + READMEs
  - docs/design-system/_archive/README.md            # NEW (Layer-2 split explanation)
  - design-bridge/_archive/README.md                 # NEW (Layer-3 closed-records + round.ts caveat)
  - design-bridge/README.md                          # edit: "two rounds trees" note + round→system table
autonomous: true
requirements: [quick-260629-ktv]

must_haves:
  truths:
    - "docs/design-system/_rounds/ no longer exists; its historical RETURN ARTIFACTS live at docs/design-system/_archive/rounds/ (TRACKED, ~16M, all 124 prior files preserved via git mv — history intact)."
    - "design-bridge/harness/rounds/ retains ONLY the live ledger entries round1 (frozen charter ZOETROP-R1), round4 (parked), round6 (active ZOETROP-R2); the closed round5 record + the SUPERSEDED NEXT-LINE-PLAN.md are relocated under design-bridge/_archive/."
    - "Token source-of-truth is unambiguous: remix-app/app/app.css is marked CANONICAL (light+dark; dark lives only here); docs/design-system/tokens/*.css + design-bridge/diagrams/_kit/_adapter.css are marked DERIVED/mirror — no token file merged or deleted."
    - "No version-controlled provenance was deleted; the ONLY deletion is the gitignored, md5-verified-IDENTICAL _notes/*.png scratch, whose canonical tracked copy is preserved in the archive."
    - "The Navigator still loads: design-bridge/diagrams/_ds symlink resolves and no FUNCTIONAL link points into a moved path."
    - "The 'two rounds trees' split (live ledger vs prior return artifacts) is explained in design-bridge/README.md and both _archive READMEs, with each round record aligned to the system it touched (app.css / DS library / Navigator) + its ZTP1 return location."
  artifacts:
    - path: "docs/design-system/_archive/rounds/"
      provides: "relocated Layer-2 historical return artifacts (round1/round2/round3 + co-mingled r4/r5 prototype iterations + harness)"
      contains: "round2"
    - path: "docs/design-system/_archive/README.md"
      provides: "Layer-2 archive explanation (prior return artifacts, NOT the live ledger)"
      min_lines: 15
    - path: "design-bridge/_archive/rounds/round5/"
      provides: "relocated closed round5/LINE-signature ledger record (S-sig, integrated 260620-rd4)"
      contains: "DECISIONS.md"
    - path: "design-bridge/_archive/NEXT-LINE-PLAN.md"
      provides: "relocated superseded round5 narrative plan"
    - path: "design-bridge/_archive/README.md"
      provides: "Layer-3 closed-records explanation + the bin/round.ts regeneration caveat"
      min_lines: 15
    - path: "design-bridge/README.md"
      provides: "two-rounds-trees clarifying note + round→system/return alignment table"
      contains: "two rounds trees"
    - path: "remix-app/app/app.css"
      provides: "CANONICAL token-SoT header marker"
      contains: "TOKEN-SOT:CANONICAL"
    - path: "docs/design-system/tokens/colors.css"
      provides: "DERIVED/mirror token-SoT header marker (light-only)"
      contains: "TOKEN-SOT:DERIVED"
    - path: "design-bridge/diagrams/_kit/_adapter.css"
      provides: "DERIVED/mirror token-SoT header marker (Navigator self-contained copy)"
      contains: "TOKEN-SOT:DERIVED"
  key_links:
    - from: "design-bridge/diagrams/_ds"
      to: "docs/design-system"
      via: "symlink (../../docs/design-system) — unchanged by the move (all relocations stay UNDER docs/design-system)"
      pattern: "design-system"
    - from: "remix-app/app/app.css"
      to: "docs/design-system/tokens/*.css + design-bridge/diagrams/_kit/_adapter.css"
      via: "canonical→derived mirror relationship, now explicitly labeled"
      pattern: "TOKEN-SOT"
    - from: "design-bridge/harness/rounds/ (live ledger)"
      to: "docs/design-system/_archive/rounds/ (prior return artifacts)"
      via: "the disambiguated 'two rounds trees' — documented in design-bridge/README.md"
      pattern: "_archive/rounds"
---

<objective>
Owner-APPROVED, careful REORGANIZATION of the design-line history for alignment to the
3-layer system model. This FORMALIZES the output of this session's audit — it is NOT a redesign
and does NOT touch live/shipping code. Re-derive nothing; expand nothing.

The confusion being resolved: there are **two "rounds" trees**. One is the **live LEDGER**
(`design-bridge/harness/rounds/`, generated by the harness). The other —
`docs/design-system/_rounds/` (16M) — is a pile of **historical RETURN ARTIFACTS** dressed up as
"current rounds" (the impostor). This plan relocates the impostor into a clearly-named, **tracked**
archive, archives the closed/superseded design-line records, pins ONE token source-of-truth, and
documents the split.

Purpose: stop the two-rounds-trees confusion; make every round record state which system it touched.
Output: a de-weighted, self-explaining design-line history with provenance preserved in version control.

THE 3-LAYER MODEL (target clarity — do not violate):
- LAYER 1 LIVE PRODUCT — `remix-app/app/` (`app.css` = token SoT). DO NOT TOUCH (except the step-4 app.css header note).
- LAYER 2 DS PACKAGE — `docs/design-system/` ⇄ "Zoetrope Design System" project `48aebcac-…`. VERIFIED IN SYNC; NO DesignSync writes this task.
- LAYER 3 DESIGN-LINE MACHINERY — `design-bridge/` (harness ledger + Navigator). Return project "ZTP1" `f200a4ef-…`.
- THE IMPOSTOR — `docs/design-system/_rounds/` (historical return artifacts). RELOCATE.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md

# Layer-3 design-line docs (the live ledger + transport model)
@design-bridge/README.md
@design-bridge/RETURN-GATE.md
@design-bridge/PROVENANCE.md
@design-bridge/NEXT-LINE-PLAN.md

<audit_findings>
<!-- Discovered this session by static inspection. These CORRECT four assumptions in the brief —
     honor reality, not the assumption. The executor must re-verify each before acting. -->

1. NO `docs/design-system/_rounds/round3/round3-return/round5/` DIRECTORY EXISTS. The round4 AND
   round5 prototype iterations are co-mingled as FILES inside round3-return:
   `screens-r4.jsx · data-r4.js · prompt-r4.md` and `screens-r5.jsx · data-r5.js · prompt-r5.md`
   (alongside round3's own screens.jsx/charts.jsx). They travel into the archive WITH the _rounds
   tree (one git mv). Do NOT fabricate a round5/ subdir move; document the entanglement in the README.

2. The two "Left Nav Prototype (standalone).html" copies are NOT byte-identical:
   `round2/` = 1,650,883 B md5 `ebca89841bcf4d3867fb2006b0c18ce8`
   `round2/return/` = 1,650,870 B md5 `5338165141666c472aca5a12d24d7afd`
   → They are NOT byte-dupes → the guardrail FORBIDS deleting either → keep BOTH (they ride the
   _rounds move into the archive). The brief's "keep ONE copy" assumption is wrong; md5 proves it.

3. The `_ds` symlink is at `design-bridge/diagrams/_ds` (NOT `_kit/_ds`), git-tracked, target
   `../../docs/design-system`, currently RESOLVES OK. Because every relocation in this plan stays
   UNDER `docs/design-system/`, the symlink target is unchanged and keeps resolving.

4. `docs/design-system/uploads/` (~5.9M) is referenced by the PROTECTED `docs/design-system/readme.md`
   (the source brand board `uploads/colors.jpg`). It is DS-package provenance, NOT round sprawl.
   Relocating it would break a protected cross-reference → uploads/ is LEFT IN PLACE this pass.
   The de-weight focus is `_rounds/` (16M, the unambiguous impostor). Surfaced as a possible follow-up.

CARRIED CAVEAT: `design-bridge/harness/bin/round.ts` is PROTECTED (live set) and emits a round5
ledger block. A future `npm run design:round` (NOT run by this task) will re-create a 2-file stub
at `harness/rounds/round5/{round-manifest.json,DECISIONS.md}`. Document this; permanent pruning of
the round5 block from round.ts is a follow-up (bin/ is protected here).

macOS FILENAME TRAP: the round2/return screenshot filenames contain a NARROW NO-BREAK SPACE (U+202F,
bytes `e2 80 af`) before "PM" — e.g. `Screenshot 2026-05-19 at 9.21.50 PM.png`. NEVER retype these
names. Match by shell glob + `basename` only. (md5-verified IDENTICAL to `_notes/*.png` this session.)
</audit_findings>

<archive_destination_decision>
<!-- The gitignore-vs-keep-tracked choice, made EXPLICIT per the guardrail. -->
DESTINATION = `docs/design-system/_archive/` (Layer 2) and `design-bridge/_archive/` (Layer 3),
both of which are **TRACKED** (verified: `git check-ignore` does NOT ignore `_archive/...`).

REJECTED: the repo's existing `.archive/` convention (and the brief's `docs/design-system/.archive/rounds/`
example) — `.archive/` is GITIGNORED (`.gitignore` line 36). Moving ~16M of provenance there would
SILENTLY DROP it from version control (git would record deletions), which the guardrail forbids.
Git also cannot re-include files under an excluded parent without an invasive convention change.
The `_`-prefix (`_archive`) matches this repo's scratch-dir convention (`_rounds`, `_kit`, `_ds`,
`_notes`) and sits OUTSIDE the DesignSync-synced component/token/guideline surface — consistent with
how `_rounds/` already lived under `docs/design-system/` without being compiled or synced.
RESULT: provenance stays TRACKED (recommended default); de-confusion still achieved by the rename.
</archive_destination_decision>

<hard_safety_guardrails>
1. Use `git mv` for ALL relocations (reversible, preserves history). NEVER delete anything EXCEPT
   the md5-VERIFIED byte-dupes — and verify md5 in the task immediately BEFORE each delete.
2. The ONLY sanctioned delete is `_notes/*.png` (gitignored, untracked, md5-verified IDENTICAL to the
   now-archived `round2/return/*.png`). The two Left Nav HTMLs md5-DIFFER → keep both, never delete.
3. Stage moved/changed files EXPLICITLY by path. NEVER `git add -A` (parallel sessions share this tree).
4. DO NOT touch the LIVE set: `remix-app/app/**` (except the app.css header note);
   `docs/design-system/{assets,guidelines,components,ui_kits,slides,styles.css,readme.md,SKILL.md}`
   (the `tokens/*.css` header notes ARE allowed); `design-bridge/diagrams/**` (except the
   `_kit/_adapter.css` header note); `design-bridge/harness/{bin,config,rounds/round1,rounds/round4,rounds/round6}`;
   `.claude/skills/zoetrop-design-*`. uploads/ stays (audit finding 4).
5. Preserve cross-references: the `design-bridge/diagrams/_ds` symlink must still resolve; grep for
   `_rounds/` references BEFORE moving and confirm none are FUNCTIONAL links (only protected comments
   + historical .planning archives are expected — leave those).
6. Executor verifies are STATIC only (git-rename accounting, md5, grep, readlink). The Navigator /
   browser load check + `npm run build` are run by the ORCHESTRATOR, not the executor.
</hard_safety_guardrails>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Relocate the Layer-2 historical return artifacts (the impostor) + drop the verified _notes dupes</name>
  <files>docs/design-system/_rounds/** (→ docs/design-system/_archive/rounds/**), _notes/*.png (delete)</files>
  <action>
PRE-FLIGHT VERIFICATION (do this first; act on the result, do not assume):
  (a) md5 BOTH Left Nav HTMLs: `docs/design-system/_rounds/round2/Left Nav Prototype (standalone).html`
      and `docs/design-system/_rounds/round2/return/Left Nav Prototype (standalone).html`. Expect them
      to DIFFER (ebca898… vs 5338165…). Because they differ they are NOT byte-dupes → DO NOT delete
      either; both ride the tree move into the archive. (If they were ever IDENTICAL, still do not
      delete — they live in distinct round2 subdirs and both are provenance.)
  (b) md5 each `_notes/*.png` against its same-basename counterpart in
      `docs/design-system/_rounds/round2/return/` using a shell glob + `basename` (NEVER retype the
      U+202F filename). Expect all 5 IDENTICAL.

RELOCATE (the single de-weight move, ~16M, 124 tracked files incl. the 7.7M round3/screenshots):
  Run `git mv docs/design-system/_rounds docs/design-system/_archive/rounds` (create the `_archive/`
  parent if needed). This subsumes the round4/round5 prototype entanglement (audit finding 1): the
  co-mingled `*-r4.*` / `*-r5.*` files inside round3-return travel with the tree — no fabricated
  round5/ subdir move. Drop the stray `.DS_Store` files only if they appear as untracked noise.

DROP THE VERIFIED DUPES (the ONLY sanctioned delete):
  For each `_notes/*.png` confirmed IDENTICAL in step (b), `rm` it. These are gitignored + untracked
  working scratch whose canonical tracked copy now lives in the archive — no version-controlled
  content is lost. Because `_notes/` is gitignored, there is nothing to stage; do NOT `git add -A`.
  If ANY png is not IDENTICAL, leave it and note the discrepancy.

STAGE explicitly: `git add docs/design-system/_archive docs/design-system/_rounds` (the rename pair),
by path only.
  </action>
  <verify>
    <automated>cd /Users/mac/Code/zoetrop && test ! -d docs/design-system/_rounds && test -d docs/design-system/_archive/rounds/round2 && test "$(git ls-files docs/design-system/_rounds | wc -l | tr -d ' ')" = "0" && test "$(git ls-files docs/design-system/_archive/rounds | wc -l | tr -d ' ')" -ge "124" && test -z "$(ls _notes/*.png 2>/dev/null)" && git status --porcelain docs/design-system | grep -qE '^R' && echo "T1 OK: tree relocated (renames), _notes dupes gone, no orphans"</automated>
  </verify>
  <done>`docs/design-system/_rounds/` is gone; `docs/design-system/_archive/rounds/` holds all ≥124 previously-tracked files (git records RENAMES, not delete+add); the Left Nav HTMLs were md5-checked and both retained; `_notes/*.png` (md5-verified IDENTICAL) removed; the `design-bridge/diagrams/_ds` symlink still resolves.</done>
</task>

<task type="auto">
  <name>Task 2: Archive the Layer-3 closed records + pin the ONE token source-of-truth via header notes</name>
  <files>design-bridge/NEXT-LINE-PLAN.md, design-bridge/harness/rounds/round5/**, remix-app/app/app.css, docs/design-system/tokens/{colors,base,fonts,spacing,typography}.css, design-bridge/diagrams/_kit/_adapter.css</files>
  <action>
ARCHIVE THE CLOSED/SUPERSEDED LAYER-3 RECORDS (git mv, reversible):
  - `git mv design-bridge/NEXT-LINE-PLAN.md design-bridge/_archive/NEXT-LINE-PLAN.md`
    (it is self-marked HISTORICAL/SUPERSEDED; not a generated ledger entry; round.ts does not reference it.)
  - `git mv design-bridge/harness/rounds/round5 design-bridge/_archive/rounds/round5`
    (closed S-sig, returned via DesignSync, gated PASS, integrated at quick task 260620-rd4.)
  KEEP round1 / round4 / round6 EXACTLY as they are — do NOT touch them (protected live set).
  This move carries the documented caveat (audit findings): bin/round.ts is protected and still emits
  a round5 block, so a future `npm run design:round` would re-create a 2-file stub at
  harness/rounds/round5/. That is acknowledged in the Task-3 archive README; pruning round.ts is a
  follow-up, not this task.

PIN THE TOKEN SOURCE-OF-TRUTH (header COMMENT additions only — no merge, no delete, no value change):
  - `remix-app/app/app.css`: prepend a comment block immediately AFTER the `@import "tailwindcss";`
    line declaring it the CANONICAL token source-of-truth — the ONLY place dark lives (via
    `html[data-theme="dark"]` remap). Include the literal grep marker `TOKEN-SOT:CANONICAL`.
  - `docs/design-system/tokens/colors.css`: prepend a comment block marking it DERIVED — a light-only
    mirror of `remix-app/app/app.css`; dark is NOT represented here; do not edit values here to change
    the product. Include the literal grep marker `TOKEN-SOT:DERIVED`.
  - `docs/design-system/tokens/{base,fonts,spacing,typography}.css`: prepend a single one-line comment
    each, DERIVED mirror of app.css, with the marker `TOKEN-SOT:DERIVED`.
  - `design-bridge/diagrams/_kit/_adapter.css`: prepend a comment block marking it a DERIVED,
    self-contained mirror that the standalone Navigator needs (light+dark remap embedded); NOT
    canonical; do NOT merge or delete it. Include the marker `TOKEN-SOT:DERIVED`.
  Make ZERO other changes to any of these files (the diffs must be added-comment-lines only).

STAGE explicitly by path: the two renames + the seven edited files. Never `git add -A`.
  </action>
  <verify>
    <automated>cd /Users/mac/Code/zoetrop && test -f design-bridge/_archive/NEXT-LINE-PLAN.md && test ! -f design-bridge/NEXT-LINE-PLAN.md && test -f design-bridge/_archive/rounds/round5/DECISIONS.md && test ! -d design-bridge/harness/rounds/round5 && test -d design-bridge/harness/rounds/round1 && test -d design-bridge/harness/rounds/round4 && test -d design-bridge/harness/rounds/round6 && grep -q 'TOKEN-SOT:CANONICAL' remix-app/app/app.css && grep -q 'TOKEN-SOT:DERIVED' docs/design-system/tokens/colors.css && grep -q 'TOKEN-SOT:DERIVED' design-bridge/diagrams/_kit/_adapter.css && for f in base fonts spacing typography; do grep -q 'TOKEN-SOT:DERIVED' docs/design-system/tokens/$f.css || exit 1; done && test "$(git diff --cached --shortstat remix-app/app/app.css 2>/dev/null; git diff --shortstat remix-app/app/app.css 2>/dev/null | grep -c deletion)" != "broken" && echo "T2 OK: closed records archived, round1/4/6 intact, token SoT markers present"</automated>
  </verify>
  <done>`NEXT-LINE-PLAN.md` and `round5/` are relocated under `design-bridge/_archive/` (git renames); round1/round4/round6 untouched; `app.css` carries `TOKEN-SOT:CANONICAL`; all five `tokens/*.css` + `_adapter.css` carry `TOKEN-SOT:DERIVED`; the only diffs in the seven token/adapter files are added comment lines (no token merged, deleted, or revalued).</done>
</task>

<task type="auto">
  <name>Task 3: Write the alignment READMEs, the "two rounds trees" note, and verify references hold</name>
  <files>docs/design-system/_archive/README.md, design-bridge/_archive/README.md, design-bridge/README.md</files>
  <action>
WRITE `docs/design-system/_archive/README.md` (Layer-2 split — min ~15 lines): explain these are the
  HISTORICAL RETURN ARTIFACTS from the prior design rounds (round1 = Zoetrop redesign; round2 = left-nav
  prototype; round3 = calm-instrument screens, which ALSO carries the co-mingled round4/round5 prototype
  iterations `*-r4.*`/`*-r5.*` that ran in the ZTP1 prototype project — audit finding 1; harness/ = the
  unbundle tooling). State plainly: this is NOT the live ledger — the live ledger is
  `design-bridge/harness/rounds/`. Note these were relocated here (TRACKED, not the gitignored `.archive/`)
  to preserve ~16M of provenance in version control while stopping them from reading as "current rounds."
  Note that any `uploads/` references inside these archived prompt docs are frozen historical context.

WRITE `design-bridge/_archive/README.md` (Layer-3 closed records — min ~15 lines): explain that
  `round5/` (LINE-signature) is CLOSED — returned via DesignSync, gated PASS (RETURN-GATE 7/7),
  integrated at quick task 260620-rd4, ledger state S-sig — and `NEXT-LINE-PLAN.md` is its superseded
  narrative. State that the LIVE ledger keeps round1 (frozen charter ZOETROP-R1), round4 (parked), and
  round6 (active ZOETROP-R2). Record the CAVEAT: `design-bridge/harness/bin/round.ts` is protected and
  still emits a round5 block, so a future `npm run design:round` will re-create a 2-file stub at
  `harness/rounds/round5/`; the archived copy here is the canonical closed snapshot, and pruning the
  round5 block from round.ts is a deliberate follow-up (bin/ was protected in the reorg task).

EDIT `design-bridge/README.md`: append a "two rounds trees" clarifying section (use the literal phrase
  `two rounds trees`). It must (i) disambiguate the LIVE LEDGER `design-bridge/harness/rounds/` from the
  archived prior RETURN ARTIFACTS now at `docs/design-system/_archive/rounds/`; and (ii) include a small
  table aligning each round record to the system it touched and its ZTP1 return location — e.g.:
    round1 (S1.0–S1.2 backfill) → app.css + DS library + Navigator (foundation) → pre-harness
    round4 (parked) → Reports surface (staged) → ZTP1 `f200a4ef-…`
    round5 (CLOSED, archived) → app.css zt-sig-* layer → ZTP1 `f200a4ef-…` round3-return/round5/return
    round6 (active R2) → chart language on visx → ZTP1 `f200a4ef-…`
  (Pull exact return locations from RETURN-GATE.md / the archived round records; do not invent ids.)
  Do NOT hand-edit the generated round DECISIONS.md/round-manifest.json (protected/regenerated) — the
  system-alignment lives in this README, the editable home.

STATIC REFERENCE CHECK (verify, do not fix protected files): grep `-rn` for `docs/design-system/_rounds/`
  across the repo excluding `.planning/` and `node_modules`. The ONLY expected remaining matches are
  non-functional COMMENTS in the protected `design-bridge/diagrams/_kit/nav-manifest.js` and
  `design-bridge/harness/bin/round.ts` (no href/runtime path points into _rounds — confirmed this
  session). Leave those (protected); note them in the Layer-2 README as known-stale-but-harmless
  comments. Confirm `design-bridge/PROVENANCE.md` has NO moved-path references (it points only at the
  gitignored cold store). Confirm the `design-bridge/diagrams/_ds` symlink still resolves.

STAGE explicitly by path: the two new READMEs + design-bridge/README.md. Never `git add -A`.
  </action>
  <verify>
    <automated>cd /Users/mac/Code/zoetrop && test "$(wc -l < docs/design-system/_archive/README.md)" -ge 15 && test "$(wc -l < design-bridge/_archive/README.md)" -ge 15 && grep -q 'two rounds trees' design-bridge/README.md && grep -q '_archive/rounds' design-bridge/README.md && readlink design-bridge/diagrams/_ds | grep -q 'docs/design-system' && test -f design-bridge/diagrams/_ds/tokens/colors.css && ! grep -rn 'docs/design-system/_rounds/' --include='*.html' --include='*.css' --include='*.js' --include='*.tsx' --include='*.ts' design-bridge/diagrams remix-app | grep -v 'nav-manifest.js' && echo "T3 OK: READMEs present, two-rounds-trees note added, symlink resolves, no functional dangling refs"</automated>
  </verify>
  <done>Both `_archive/README.md` files exist (≥15 lines) and explain their split; `design-bridge/README.md` carries the "two rounds trees" note + the round→system/return table; the `_ds` symlink resolves through to `tokens/colors.css`; the only surviving `_rounds/` references are the documented protected comments (nav-manifest.js, round.ts) + historical .planning archives.</done>
</task>

</tasks>

<verification>
Overall (static, executor-run):
- `git status --porcelain` shows RENAMES (`R`) for the moved trees, NOT delete+add — history preserved.
- `git ls-files docs/design-system/_archive/rounds | wc -l` ≥ 124 (nothing dropped from version control).
- The ONLY deletion in the whole change is `_notes/*.png` (gitignored, untracked, md5-verified IDENTICAL).
- `git check-ignore docs/design-system/_archive/rounds design-bridge/_archive` returns NOTHING (tracked).
- `readlink design-bridge/diagrams/_ds` → `../../docs/design-system`; `ls design-bridge/diagrams/_ds/tokens/colors.css` resolves.
- `grep -c TOKEN-SOT:` across app.css + the 5 tokens/*.css + _adapter.css == 7 markers present.

Dynamic (ORCHESTRATOR-run, NOT the executor): load the Navigator in Chrome (light + dark) to confirm
boards still render; run `npm run build` from `remix-app/` to confirm the app.css header comment did
not disturb the build.
</verification>

<success_criteria>
- `docs/design-system/_rounds/` no longer exists; its contents are at `docs/design-system/_archive/rounds/` (tracked, history-preserving rename).
- `design-bridge/harness/rounds/` shows only round1, round4, round6 (live); round5 + NEXT-LINE-PLAN.md are under `design-bridge/_archive/`.
- `remix-app/app/app.css` is the single CANONICAL token SoT; `tokens/*.css` + `_adapter.css` are labeled DERIVED — none merged or deleted.
- No version-controlled provenance deleted; only md5-verified gitignored `_notes/*.png` removed; the md5-DIFFERING Left Nav HTMLs both retained.
- The "two rounds trees" split + per-round system/return alignment are documented in `design-bridge/README.md` and both `_archive/README.md` files.
- The `_ds` symlink resolves; no functional reference dangles; the bin/round.ts regeneration caveat is recorded.
</success_criteria>

<output>
Create `.planning/quick/260629-ktv-consolidate-and-streamline-design-rounds/260629-ktv-SUMMARY.md` when done.
</output>
