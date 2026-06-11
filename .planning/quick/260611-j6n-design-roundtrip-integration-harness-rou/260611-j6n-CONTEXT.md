# Quick Task 260611-j6n: Design-roundtrip integration harness + round3 package — Context

**Gathered:** 2026-06-11
**Status:** Ready for planning

<domain>
## Task Boundary

Design roundtrips (claude.ai/design + the zoetrope-design skill bundle) bring back prototype artifacts that must be integrated into `remix-app/`. Round 1 (full redesign) returned clean source files in `docs/design-system/_rounds/round1/`. Round 2 (left nav) returned a 1.6MB self-decoding "bundler" HTML + loose jsx dumped in untracked `_notes/` — integration required hand-decoding a JSON-embedded template, sieving new CSS from token duplicates, and re-mapping prototype idioms onto app equivalents. Build a harness so future returns integrate rapidly, archive round2, and prep the round3 outbound package in `docs/design-system/_rounds/round3/`.

</domain>

<decisions>
## Implementation Decisions

### Round3 brief scope (user-selected)
- **Whole-app polish pass**: all routes reviewed against the brand under the new left-nav chrome — density, hierarchy, spacing refinement.
- **Data-viz/charts focus**: TrendChart, Sparkline, MetricRing, RangeBar, PhaseBar, ProgressBar, correlations — the chart/visualization language specifically.

### Screenshots
- **Skip.** No current-state captures in the package; the design side works from the deployed preview (https://zoetrop-git-003-remix-foundation-negentropico.vercel.app, behind pilot basic-auth — note this in the package README; the user supplies credentials out-of-band).

### Round2 archive
- **Archive everything** into `docs/design-system/_rounds/round2/`: the full 1.6MB bundler HTML, both jsx files, and the 5 May-19 PNGs from `/Users/mac/Code/zoetrop/_notes/` (main tree, untracked — copy from there), plus the already-extracted CSS (`.planning/quick/260610-q56-refactor-app-chrome-to-consolidated-left/260610-q56-zn-proto.css`) and a README recording what round2 was and how it landed (quick tasks 260610-q56/rj2/rwg). `_notes/` itself is left alone (user's working dir; README notes it is now redundant).

### Claude's Discretion
- Harness script implementation details (parsing strategy, output layout), doc structure/wording, round3 inventory generation approach.

</decisions>

<specifics>
## Specific Ideas

### Harness location & contents — `docs/design-system/_rounds/harness/`
1. **`unbundle.mjs`** (node ≥18, zero deps): explodes a bundler-format standalone HTML into an output dir.
   - Parse `<script type="__bundler/manifest">` JSON: `{uuid: {data: <base64>, compressed: <bool>, mime}}`; base64-decode, gunzip via `node:zlib` when compressed; write to `assets/` with extensions inferred from mime.
   - Parse `<script type="__bundler/template">` (a JSON **string** containing the real HTML); replace uuid references with relative asset paths; write `index.html`.
   - Extract every `<style>` block from the template → `styles/NN.css`.
   - Extract inline `text/babel`/`text/jsx` scripts → `src/NN.jsx`; scripts whose src resolves to a manifest asset of jsx/js mime are written under their original names when recoverable.
   - Gracefully handle plain (non-bundler) HTML: just extract styles + scripts.
   - Usage: `node unbundle.mjs <standalone.html> <outdir>`.
   - Acceptance test: running it against the archived round2 HTML (`_rounds/round2/...`) must reproduce the sidebar CSS that was hand-extracted in q56 (compare against round2/extracted/zn-proto.css — the second `<style>` block should match it modulo whitespace).
2. **`css-delta.mjs`** (node, zero deps): `node css-delta.mjs <prototype.css> [app.css path, default remix-app/app/app.css]` → markdown report to stdout:
   - Custom properties: NEW (in prototype, not app.css), CHANGED (same name, different value), DUPLICATE (identical — safe to skip).
   - Selectors: rule selectors present in prototype but absent from app.css ("port these"), present in both ("review for conflict").
   - Crude-but-honest string parsing is fine (strip comments, split on `}` boundaries); note its limits in --help.
3. **`README.md`** (harness): the **round protocol** —
   - Directory layout per round: `roundN/package/` (outbound), `roundN/return/` (inbound raw drop — bundler HTML, loose files, screenshots), `roundN/extracted/` (unbundle.mjs output + css-delta report).
   - Workflow: prep package (copy RETURN-SPEC in) → send with the zoetrope-design skill → drop return into `roundN/return/` → `unbundle.mjs` → `css-delta.mjs` → integrate via `/gsd-quick` with an approved plan (this exact flow shipped the left nav in 3 quick tasks; cite q56/rj2/rwg as the reference run).
   - History table: round1 (full redesign, clean source), round2 (left nav, bundler HTML in _notes — the pain that motivated this harness), round3 (prepped, outbound).
4. **`RETURN-SPEC.md`** (harness master copy; ALSO copied into round3/package/): the contract for what the design side returns. Key clauses:
   - Deliver **loose source files**, not only a standalone bundle: `app/*.jsx` per screen/component + ONE `new.css` containing ONLY rules/vars not already in the included `app.css` snapshot (no token redefinitions, no dark-remap duplication, no radius re-declarations).
   - Include `CHANGES.md`: per-screen what changed and why, every new/changed token listed, any new icon names, any interaction-model decisions ("baked" items).
   - Use **existing token names** from the provided app.css; new tokens follow existing naming families.
   - Follow the **idiom mapping table** so prototypes stay mechanically translatable (prototype → app): `NLink href="#/x"` → react-router `NavLink/Link to`, `Icon name="x"` → direct lucide-react import (PascalCase), `window.ZD.categories` → `CATEGORY_INFO` (9 ids: vitamins, minerals, inflammatory, metabolic, hormones, autonomic, bodyComposition, lipids, hematology), local theme hooks → existing `ThemeToggle`/`data-theme` plumbing (never reimplement), `zt-`/`zn-` class prefixes reserved as in app.css.
   - Standalone HTML is welcome **as a viewing artifact only**; it must not be the sole source.
   - Breakpoint is 760px; dark theme via `html[data-theme="dark"]` var remap only.

### Round3 package — `docs/design-system/_rounds/round3/package/`
- `README.md`: what this package is; contents map; the deployed preview URL note (basic-auth, credentials out-of-band); pointer to the zoetrope-design skill bundle as the brand source of truth; return instructions = RETURN-SPEC.md.
- `BRIEF.md`: round3 design brief.
  - Part A — whole-app polish pass: enumerate ALL current routes from `remix-app/app/routes.ts` grouped by section (dashboard, metrics×3, protocol×6, insights×3, import×3, ingest×4, settings) under the new left-nav chrome (264px/64px rail, single-open accordion, flyout; unified PageHeader: meta row eyebrow-left/crumb-right, title row). Goals: density, hierarchy, spacing refinement; consistent application of frame cards/pills/mono micro-labels. Explicit "what NOT to change": nav interaction model (baked, round2), routing/IA, theme plumbing, brand foundations.
  - Part B — data-viz/charts focus: inventory the viz components with file paths (TrendChart + TrendSparkline in components/TrendChart.tsx [verify], Sparkline, MetricRing, RangeBar, PhaseBar, ProgressBar, StatusDot/StatusBadge, DataTable, correlations screens) and ask for a coherent chart language: axis/grid/label treatment, status-color usage (optimal/borderline/deficient/excess), hover/tooltip language, empty/loading states, ring-sweep motion rules.
  - `> TODO(owner):` markers where the user's design intent/voice is needed (overall round goal statement, any screens to prioritize, anything explicitly out of scope).
- `current-state/` (generated from the repo at prep time):
  - `app.css` — verbatim copy of `remix-app/app/app.css` (the token + zn-sidebar truth).
  - `nav-tree.ts` — verbatim copy of `remix-app/app/components/shell/nav-tree.ts` (IA).
  - `routes.md` — route table generated from `app/routes.ts`.
  - `components.md` — inventory of `app/components/ui/*` + `app/components/shell/*`: one row each — name, one-line purpose, key props (read from each file's interface; keep terse).
- `RETURN-SPEC.md` — copy from harness.

### Round2 archive — `docs/design-system/_rounds/round2/`
- `return/` — `Left Nav Prototype (standalone).html`, `nav-app.jsx`, `sidebar.jsx`, the 5 PNGs (copy from `/Users/mac/Code/zoetrop/_notes/` — absolute path; they are NOT in the worktree).
- `extracted/zn-proto.css` — copy from `.planning/quick/260610-q56-refactor-app-chrome-to-consolidated-left/260610-q56-zn-proto.css`.
- `README.md` — what round2 was (left-nav prototype, interaction model baked), how it landed (quick tasks 260610-q56 chrome refactor → 260610-rj2 crumb meta-row → 260610-rwg header unification; merged via left-nav-refactor branch), integration pain points that motivated the harness, note that `_notes/` in the main tree is now a redundant copy.

</specifics>

<canonical_refs>
## Canonical References

- `docs/DESIGN-SYSTEM-ADOPTION.md` — D1b roundtrip gate, Phase 04.1 history (update its §3 sequence note ONLY if trivially safe; otherwise leave).
- `docs/design-system/SKILL.md` + `readme.md` — brand source of truth the design side already holds.
- `docs/design-system/uploads/screens-package/` — round1's outbound package format (precedent).
- `.planning/quick/260610-q56*/260610-q56-SUMMARY.md` — the round2 integration reference run.
</canonical_refs>
