---
phase: quick-260704-dpp
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - _notes/
  - design-bridge/design-system/uploads/
  - design-bridge/design-system/_archive/uploads/
  - design-bridge/design-system/readme.md
  - design-bridge/harness/bin/round.ts
autonomous: true
requirements: [HANDOFF-TaskB-hygiene]   # Quick task — traces to .planning/HANDOFF.md Task B remainder + loose end (not a ROADMAP phase req)

must_haves:
  truths:
    - "Repo-root `_notes/` no longer exists on disk"
    - "The offline Navigator + `*.card.html` galleries still resolve `_ds_bundle.js` on a fresh checkout — gitignore SKIPPED, bundle stays tracked (decision documented)"
    - "`uploads/` (27 files, 5.9M) now lives at `_archive/uploads/` with git history preserved; readme.md `colors.jpg` cross-ref repointed"
    - "`npm run design:round` no longer recreates a round5 stub; harness typechecks clean; round4 + round6 blocks intact"
  artifacts:
    - path: "design-bridge/design-system/_archive/uploads/colors.jpg"
      provides: "Relocated brand board (history-preserving move target)"
    - path: "design-bridge/design-system/readme.md"
      provides: "Provenance cross-ref repointed to _archive/uploads/colors.jpg"
      contains: "_archive/uploads/colors.jpg"
    - path: "design-bridge/harness/bin/round.ts"
      provides: "Round-manifest emitter with round5 block pruned"
  key_links:
    - from: "design-bridge/design-system/readme.md"
      to: "_archive/uploads/colors.jpg"
      via: "provenance markdown reference (line ~19)"
      pattern: "_archive/uploads/colors\\.jpg"
    - from: "design-bridge/design-system/{ui_kits/app/index.html, components/{core,forms,data}/*.card.html}"
      to: "_ds_bundle.js"
      via: "static <script src> (runtime dep — must stay git-tracked)"
      pattern: "_ds_bundle\\.js"
---

<objective>
Close out the optional design/repo hygiene items from `.planning/HANDOFF.md` (Task B remainder) plus one loose end. Four items, three touch the repo:

1. rmdir empty repo-root `_notes/` (no git change — gitignored/untracked).
2. Gitignore generated DS artifacts — **SKIP + document** (pre-verified: bundle is a runtime dep with no regeneration script).
3. Relocate `design-bridge/design-system/uploads/` → `_archive/uploads/` (history-preserving `git mv`, repoint readme.md).
4. Prune the closed round5 seed block from `design-bridge/harness/bin/round.ts`.

Purpose: Finish the design-root streamline started in `260629-mtl`/`260629-ktv` — remove a dead empty dir, get 5.9M of source material out of the live DS tree, and stop the harness recreating a stale round5 stub.
Output: Two atomic commits (item 3, item 4), one filesystem-only op (item 1), one documented skip (item 2), and a SUMMARY.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/HANDOFF.md

<facts_preverified>
All facts below were verified during planning against the live tree (re-verify the guarded ones before acting):

- **Item 1:** `_notes/` at repo root — `ls -A` = 0 entries, `git ls-files _notes` = empty (untracked), `.gitignore:43` = `_notes/`. So `rmdir _notes` produces ZERO git delta → **no commit**.
- **Item 2:** `design-bridge/design-system/{_ds_bundle.js,_ds_manifest.json,_adherence.oxlintrc.json}` are ALL git-tracked. `_ds_bundle.js` is loaded at RUNTIME via static `<script src="../../_ds_bundle.js"></script>` in: `ui_kits/app/index.html:65`, `components/core/core.card.html:22`, `components/forms/forms.card.html:22`, `components/data/data.card.html:21`. NO writer/regeneration script exists (grep of `design-bridge/**/*.ts,*.js` found only a comment in `diagrams/_kit/nav-manifest.js`; no `design:` npm script generates it). → **Gitignoring would break the offline Navigator / galleries on a fresh checkout with no auto-regen path → SKIP.**
- **Item 3:** `uploads/` = 5.9M, 27 tracked files. Only ONE live reference outside `_archive`/`.planning`: `readme.md:19` → `` (`uploads/colors.jpg`) ``. Target `design-bridge/design-system/_archive/` EXISTS (has README.md + rounds/); `_archive/uploads` does NOT exist → clean `git mv`.
- **Item 4:** `round.ts` round5 block = the `// ─────` separator + `// round5 — LINE-signature refinement LINE` comment (≈ lines 163–172) through `writeFileSync(resolve(\`${roundsDir}/round5/DECISIONS.md\`), ...)` (≈ line 223), PLUS the standalone `console.log(\`round: wrote ${roundsDir}/round5/...\`)` (≈ line 261) which references `sig.sessions`. The `sig`/`sigBlock` locals are NOT referenced by round4 (`line`), round6 (`r2`), or round1 (`charter`). Harness typecheck baseline (`tsc -p design-bridge/harness/tsconfig.json`) = exit 0. Existing on-disk round5 manifest files are archived/closed — do NOT delete them; only stop the emitter recreating a stub.
</facts_preverified>
</context>

<owner_constraints>
NON-NEGOTIABLE (parallel Claude sessions share this working tree):

- **Stage files EXPLICITLY by path.** NEVER `git add -A` / `git add .` / `git commit -a`. Add only the exact paths each item touches.
- **`git mv` ONLY** for the relocation (reversible, history-preserving). Never `mv` + `rm` + re-add.
- Keep the `_ds` symlink resolving (none of these items touch it — just don't disturb it).
- Don't break the DesignSync↔DS mapping (prose-only; not invoked here).
- **Atomic commit per item.** Items 3 and 4 are unrelated → SEPARATE commits. Item 1 = no commit (nothing tracked changes). Item 2 = no commit (skip).
- Line numbers above are approximate — anchor edits on the quoted content, not the numbers.
</owner_constraints>

<tasks>

<task type="auto">
  <name>Task 1: rmdir repo-root _notes/ + document the item-2 gitignore SKIP</name>
  <files>_notes/ (removed), 260704-dpp-SUMMARY.md (decision record)</files>
  <action>
Item 1 (rmdir _notes): Re-verify guard conditions first — `ls -A _notes` returns 0 entries AND `git ls-files _notes` is empty (untracked). If both hold, run `rmdir _notes` (from repo root). Because `_notes/` is gitignored (`.gitignore:43`) and untracked, this produces NO git change — do NOT stage or commit anything for this item. If `_notes` is non-empty or tracked, STOP and record the discrepancy instead of forcing.

Item 2 (gitignore DS artifacts — SKIP): Re-verify the SKIP rationale, then document the decision (do not modify `.gitignore`, do not gitignore anything). Confirm: (a) all three artifacts still git-tracked via `git ls-files design-bridge/design-system/_ds_bundle.js design-bridge/design-system/_ds_manifest.json design-bridge/design-system/_adherence.oxlintrc.json`; (b) `_ds_bundle.js` is still referenced by a static `<script src>` in the four live surfaces (`grep -rn "_ds_bundle" design-bridge/design-system --include="*.html"`); (c) no regeneration script exists (`grep -rn "_ds_bundle" design-bridge --include="*.ts" --include="*.js" | grep -v node_modules | grep -v _archive` finds only the nav-manifest comment). Record in the SUMMARY: "Item 2 SKIPPED — the committed `_ds_bundle.js` is a runtime dependency (static `<script src>` in 4 offline gallery/Navigator surfaces) with no regeneration script; gitignoring it would break a fresh checkout. This is the HANDOFF-expected outcome." The manifest/oxlintrc travel with the bundle for the same reason.
  </action>
  <verify>
    <automated>test ! -d _notes && git ls-files --error-unmatch design-bridge/design-system/_ds_bundle.js design-bridge/design-system/_ds_manifest.json design-bridge/design-system/_adherence.oxlintrc.json</automated>
  </verify>
  <done>`_notes/` gone from disk; all three DS artifacts remain git-tracked; item-2 SKIP decision (with evidence) recorded in the SUMMARY. No commit produced by this task.</done>
</task>

<task type="auto">
  <name>Task 2: Relocate uploads/ → _archive/uploads/ (git mv) + repoint readme.md</name>
  <files>design-bridge/design-system/uploads/ → design-bridge/design-system/_archive/uploads/, design-bridge/design-system/readme.md</files>
  <action>
FIRST re-run the live-reference sweep to catch anything added since planning: `grep -rn "uploads/" design-bridge docs remix-app | grep -v _archive | grep -v node_modules | grep -v "/uploads/"`. The only expected live hit is `design-bridge/design-system/readme.md:19` (`uploads/colors.jpg`). If new live refs appear, repoint every one of them in this same commit.

Confirm `design-bridge/design-system/_archive/` exists and `_archive/uploads` does NOT, then relocate history-preservingly: `git mv design-bridge/design-system/uploads design-bridge/design-system/_archive/uploads` (moves the whole 27-file dir INTO `_archive/`). This must show as renames (R) in `git status`, never delete+add.

Then edit `readme.md` — change the provenance reference from `(`uploads/colors.jpg`)` to `(`_archive/uploads/colors.jpg`)` (the line under `## Provenance & sources`). Stage explicitly: `git add design-bridge/design-system/readme.md` (the `git mv` already staged the moves — do NOT `git add -A`). Commit atomically, e.g. `chore(design): relocate design-system/uploads → _archive/uploads (history-preserving) + repoint readme provenance`.
  </action>
  <verify>
    <automated>test -f design-bridge/design-system/_archive/uploads/colors.jpg && test ! -d design-bridge/design-system/uploads && grep -q "_archive/uploads/colors.jpg" design-bridge/design-system/readme.md && [ -z "$(grep -rn 'uploads/colors' design-bridge docs remix-app | grep -v _archive | grep -v node_modules)" ]</automated>
  </verify>
  <done>All 27 files under `_archive/uploads/` (colors.jpg present); old `uploads/` dir gone; `git status` shows renames not delete+add; readme.md repoints to `_archive/uploads/colors.jpg`; zero stale live refs to the old path; one atomic commit staged by explicit path.</done>
</task>

<task type="auto">
  <name>Task 3: Prune the closed round5 seed block from harness/bin/round.ts</name>
  <files>design-bridge/harness/bin/round.ts</files>
  <action>
Remove the round5 emitter block so `npm run design:round` stops recreating a stale round5 stub (round5 is closed/archived — its on-disk manifest files stay untouched).

Delete, anchored on content (not line numbers, which will shift):
1. The `// ─────` separator + comment block introducing `round5 — LINE-signature refinement LINE (seeded, not yet returned)` and its explanatory lines.
2. The code from `let sig: RoundManifest = newManifest('round5', 'global-token-line');` through `writeFileSync(resolve(\`${roundsDir}/round5/DECISIONS.md\`), renderManifestLedger(sig) + '\n');` — i.e. the `sig` reassignments, `markStage` calls, the `sigBlock: LedgerBlock` const, `recordSession`, and both `writeManifest`/`writeFileSync` for round5.
3. The standalone `console.log(\`round: wrote ${roundsDir}/round5/{round-manifest.json,DECISIONS.md} ...\`)` line — it references `sig.sessions` and will fail to compile once `sig` is gone.

Keep round4 (the `line` block ending at its `writeFileSync(...round4/DECISIONS.md...)`) and round6 (the `// ─────` separator + `round6 — ZOETROP-R2 charter OPENING` block using `r2`) fully intact — `sig`/`sigBlock` are local to round5 and not referenced elsewhere. Do NOT delete any existing `design-bridge/harness/rounds/round5/` manifest files.

Stage explicitly: `git add design-bridge/harness/bin/round.ts`. Commit atomically, e.g. `chore(design): prune closed round5 seed block from harness round emitter`.
  </action>
  <verify>
    <automated>! grep -q "round5" design-bridge/harness/bin/round.ts && ! grep -qw "sig" design-bridge/harness/bin/round.ts && design-bridge/harness/node_modules/.bin/tsc -p design-bridge/harness/tsconfig.json</automated>
  </verify>
  <done>Zero `round5` / `sig` references remain in round.ts; harness typecheck exits 0 (matches baseline); round4 + round6 blocks still emit; existing round5 manifest files untouched; one atomic commit staged by explicit path.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

None. This is repo-hygiene only — no runtime code paths, no untrusted input, no network, no package-manager installs. Item 2 (the only dependency-adjacent item) is a documented SKIP that changes nothing.

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-dpp-01 | Tampering | Shared working tree (parallel sessions) | mitigate | Stage every change by explicit path; never `git add -A`; `git mv` only for the relocation (reversible) |
| T-dpp-SC | Tampering | npm/pip/cargo installs | accept | No installs in this plan; nothing added to any manifest |
</threat_model>

<verification>
- `test ! -d _notes` (item 1 done, no git delta).
- Three DS artifacts still tracked; item-2 SKIP documented in SUMMARY (item 2).
- `_archive/uploads/colors.jpg` exists, old `uploads/` gone, readme repointed, 0 stale refs, renames in git log (item 3).
- `grep round5` and `grep -w sig` on round.ts both empty; `tsc -p design-bridge/harness/tsconfig.json` exit 0; round4/round6 intact (item 4).
- Two commits total (items 3, 4), each staged by explicit path; no `git add -A` in shell history.
</verification>

<success_criteria>
- `_notes/` removed (filesystem-only, no commit).
- Item 2 gitignore SKIPPED with a documented, evidence-backed rationale in the SUMMARY.
- `uploads/` relocated to `_archive/uploads/` history-preservingly; readme.md provenance cross-ref repointed; zero stale live references.
- round5 block (and its console.log) pruned from round.ts; harness typechecks clean; round4/round6 emitters and the archived round5 files preserved.
- All commits atomic and staged by explicit path; `_ds` symlink and DesignSync mapping untouched.
</success_criteria>

<output>
Create `.planning/quick/260704-dpp-design-repo-hygiene-rmdir-root-notes-git/260704-dpp-SUMMARY.md` when done. Record: item-1 filesystem op (no commit), item-2 SKIP decision + evidence, item-3 relocation commit sha + moved-file count, item-4 prune commit sha + typecheck result.
</output>
