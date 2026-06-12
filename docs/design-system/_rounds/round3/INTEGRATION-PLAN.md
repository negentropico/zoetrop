# Round 3–5 Return — Integration Plan

**Prepared:** 2026-06-12 · **Return:** [`round3-return/`](./round3-return/) (FINAL, rounds 3–5 closing session)
**Review verdict:** RETURN-SPEC compliant. `css-delta` confirms `CHANGES.md` exactly — 14 NEW tokens
(all extending existing families), 3 CHANGED (all flagged: deliberate `--dur-ring` 900→1600ms +
2 dark-contrast remaps `--vital-500`/`--energy-500`), 0 duplicates. Loose source, one `new.css`,
full decision log. No bundler HTML to decode.

## Review findings vs the live app

The return's integration-asks list was written against the *package prototype* surface;
the live app has moved past it in three ways:

1. **Every "new route to wire" already exists.** `/`, `/login`, `/ingest/consent`,
   `/ingest/documents/:id`, `/protocol/versions/:version` are all registered in
   `app/routes.ts` (Phases 3/5). Ask #4 becomes *apply design treatment to existing
   routes*, not route wiring.
2. **The real backends for the designed states exist.** Extraction-review API
   (LAB-04/05, `_app/ingest/review.tsx` loader/actions) backs `reviewState`;
   `invites` table + revoke route (Phase 3) back the invites flow. The `ZD.whoop` /
   `ZD.vault` shapes in `data-r5.js` are contract sketches for loaders that mostly
   already have data sources.
3. **Reports (Phase 6) has NO design treatment** — `/reports`, `/reports/generate`,
   `/reports/:reportId` post-date the package. Out of scope here; either a design
   mini-round or a manual application of the chart/frame language later.

**Role-name mapping decision (needed at W4):** return proposes invite roles
*Viewer / Clinician*; the schema enum is `owner / practitioner / client`.
Recommend: UI labels Clinician→`practitioner`, Viewer→`client`; no enum migration.

## Do-not-integrate set (per CHANGES.md / README)

`index.html`, `app/main.jsx`, `tweaks-panel.jsx`, `app.css` (snapshot), all `data*.js`
(sample data; r5 shapes are contract sketches only), the seeded review state,
review-only public links, the Tweaks panel.

## Wave plan (each wave = one `/gsd-quick` task unless noted; idiom map per RETURN-SPEC §4)

### W0 — CSS foundation (inert-first, lowest risk)
- Merge `new.css` into `remix-app/app/app.css`: tokens into `:root` + dark block,
  classes into the components layer. Apply the 3 CHANGED tokens at source:
  `--dur-ring: 1600ms`; `--vital-500 #11c29b` / `--energy-500 #f0ac1f` into the
  **dark block only** (light values unchanged).
- Verify: re-run `harness/css-delta.mjs round3-return/new.css` → expect 0 NEW, 0 CHANGED;
  visual smoke (nav surface ladder appears — `--surface-low` rules are live immediately;
  everything `zt-*` else inert until W1+).

### W1 — Chart language, Part B (`charts.jsx` → TSX) — highest risk
- Rewrite `app/components/ui/TrendChart.tsx` + `Sparkline.tsx` from `charts.jsx`:
  frames direction (ringed ink dots + baseline ticks), milestone x-axis, linear-fit
  projections (ghost frames, PROJECTED zone), 50% optimal band + mono tag, dashed
  reference hairlines, frame-card tooltip, empty (dot-grain) / loading (pulse) states,
  shared `statusOf` helper, mount-only ring sweep rules.
- Consumers to verify: `metrics/category.tsx`, `metrics/detail.tsx`, dashboard
  highlights, WHOOP sparklines (W4 reuses the sparkline idiom).
- Port to real idioms: `lucide-react` imports, `CATEGORY_INFO`, typed props.

### W2 — Shell primitives + Part A screen polish (can split into 2 tasks: primitives, then screens)
- **Primitives (`lib.jsx` deltas):** PageHeader masthead condense (+ right-slot shrink
  fix `flex: 0 1 auto; min-width: 0` — ask #7), card structure fix (drop `height:100%`
  in grid-item anchors), DataTable density, status atoms, logotype alignment tokens,
  `zt-card`/`zt-pill`/`zt-stat-strip` adoption in Card/Badge/etc. where 1:1.
- **Screens (`screens.jsx` + `screens-r4.jsx` polish):** dashboard (cessation hero
  rebuild, category cards → frame strip — note r4 SUPERSEDES r3's MetricRing-on-metrics
  pick; rings only for true completion), metrics overview frame strip, category +
  detail (ranges→one card), protocol overview/versions/supplements/compare (working
  diff w/ shared `diffStacks`), version-detail treatment, **Phasing rename (label-only:
  screen title, nav child, dashboard eyebrow; route stays `/protocol/cessation`)**,
  insights overview → section dashboard (r4 fold-in), correlations stat-strip +
  diverging r micro-bar, genetics merge, settings pills.

### W3 — IA restructure (small, isolated)
- `nav-tree.ts`: combined **Ingest** group (Overview · Lab PDFs · WHOOP · Vault · Review),
  "Phasing" child label; keep Reports group as-is (no design — see finding 3).
- `/import` → redirect to `/ingest`; `/ingest` index renders the combined overview
  (Sources list + Review gate row); `/import/whoop` + `/import/vault` stay as aliases.

### W4 — Designed states onto real data (2–3 tasks; APIs exist)
- **Ingest review populated split-view** (`screens-ingest.jsx`): map onto the real
  extraction loader/actions; review decisions ↔ status tokens
  (approved→optimal · edited→borderline · rejected→deficient · pending→neutral);
  commit gates on pending=0; field→source-line linkage on the real PdfPageViewer;
  consent gate + document viewer restyle. Mobile: stacked panels / pill toggle.
- **WHOOP + Vault populated states** (`screens-r5.jsx`): meta stat strips,
  field-mapping list w/ sparklines, last-5 records table, "Writes: Direct" trust
  language; `ZD.whoop`/`ZD.vault` shapes = loader contract sketch — build real loaders.
- **Settings invites flow**: inline expanding create row + role pill picker + revoke;
  wire to `invites` table + revoke route; add create action if missing; apply the
  role-name mapping decision above.

### W5 — Public register (structure now, copy later)
- Landing + login restyle from `screens-public.jsx` (dot-grain, hero frame card,
  `zt-field`); **all copy is PLACEHOLDER** — owner marketing copy is outstanding
  (ask #9). Integrate structure with current copy or hold; owner call.

## Outstanding owner inputs (block nothing except W5 final copy)
1. Landing/login marketing copy.
2. Real extraction sample to replace the synthesized LabCorp facsimile (affects
   demo/seed only, not integration).

## Sequencing rationale
W0 is inert-CSS-first (q56 precedent). W1 before W2 because screens consume the chart
language. W3 after W2 so the renamed/regrouped nav lands with the restyled screens.
W4 tasks are independent of each other after W2. Each wave commits atomically and is
browser-verifiable per route; reference run for the pattern: 260610-q56 → rj2 → rwg.
