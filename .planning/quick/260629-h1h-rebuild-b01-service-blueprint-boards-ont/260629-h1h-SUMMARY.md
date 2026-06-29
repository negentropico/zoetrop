# Quick 260629-h1h — B01 SSOT screen-kit (Tasks 1 & 2)

**Commit:** `798a257` — `feat(design-bridge): B01 SSOT screen-kit — lofi/hifi/full from one data source`
**Branch:** `design/zoetrop-dl-prime` (verified before commit)
**Scope executed:** Task 1 (build the kit) + Task 2 (rewrite the 3 boards thin). Task 3 (Navigator/browser verification) is intentionally left for the orchestrator — the executor has no browser.

## Files created (new kit `design-bridge/diagrams/_kit/zoetrop/`)

- **`screens.B01.js`** — data-only manifest. Sets `window.ZOETROP_B01` = `{ meta, lanes[6] }`, seeded verbatim from the old full-board `LANES` (same 6 stages / 23 frames / Jordan Vale story / surfaces / sticky notes / foc-term flags). Field renames applied: `se→stage, sn→name, sp→path, surfaces→frames, nav→surface`, `{type,d:{…}}→content:{type,…}`. Spark/scatter SVGs moved onto the trend frames (`content.svg`).
- **`AppScreen.jsx`** — the SSOT component library. Shell defined ONCE (`TopBar`, `Sidebar`, `PageHeader`); a `contentType × {lofi,hifi,full}` renderer matrix for all 11 types (form, opts, ring, tiles, hero, docs, gate, table, trend, overview, compare); `AppScreen(frame,fidelity)` composes shell+content; `FlowBoard({fidelity})` reproduces the six-stage periwinkle-spine layout reading `window.ZOETROP_B01`. `module.exports = { AppScreen, FlowBoard }`. Lucide-style inline-SVG sidebar glyphs (Users/LayoutGrid/Activity/ListChecks/GitCompare/FileText/FileUp) — the full-tier fidelity bump.
- **`app-screen.css`** — flow chassis (`.fmstage/.fmmain/.lanes(::before spine)/.lane/.track/.arr/.stb/.sticky/.imeta`) + `.lf-*` (verbatim from old lo-fi) + `.hf-*` (verbatim from old hi-fi) + `.zs-*` (full, bumped to native ~1280×800). Per-tier deltas scoped under `.fb-lofi/.fb-hifi/.fb-full`. No new tokens.

## Files rewritten thin (each ~80% smaller, now documentation chrome only)

- `06-service-blueprints/B01-system-and-surfaces.dc.html` → `fidelity="lofi"`
- `…-hifi.dc.html` → `fidelity="hifi"`
- `…-full.dc.html` → `fidelity="full"`

Each: head loads `support.js` + `zoetrop/screens.B01.js`; single `<x-dc>` with `<helmet>` linking `_adapter.css` + `infocard.css` + `zoetrop/app-screen.css` (no flowmap.css); `data-theme="{{ theme }}"` wrapper; per-tier InfoCard rail carried over verbatim (only the theme button converted to `onClick="{{ toggleTheme }}"` + `{{ toggleLabel }}`); `<x-import … FlowBoard fidelity=…>`; trailing DCLogic theme block (localStorage key `zoetrop-theme`, with `$preview`). Old inline LANES/`C[type]`/flow-CSS/`ztToggleTheme` all removed.

## Verify gates — all passed (executor, static)

| Gate | Result |
|------|--------|
| `node -e` data manifest | `OK lanes=6 frames/lane=3,5,5,5,3,2`, subject `Jordan Vale` |
| esbuild JSX parse (`--loader:.jsx=tsx`) | `JSX parses cleanly` (direct binary) + `JSX parses` (npx form) |
| CSS primitives grep | `lf/hf/zs all present` |
| boards fidelity attrs | `fidelity attrs OK` |
| boards wiring (support.js + screens.B01.js + AppScreen.jsx + app-screen.css + data-dc-script + dsCard) | `all boards wired` |
| old build script / global toggle removed | `old inline build script + global toggle removed` |
| cross-check (every content type has a renderer; every surface in NAV; every frame has cap/eye/h/u) | `ALL OK` |

## Deviations from plan

- **[Rule 3 — schema-faithful extension] Added optional `u` field per frame** (the hi-fi mini-screen top-bar URL, e.g. `/clients/new`). The locked schema lists `surface/cap/eye/h/sub?/act?/…` but no per-frame URL; the old hi-fi board showed distinct per-card URLs in its `.hf-bar`. To honor the hard success criterion "hi-fi remains visually equivalent to today," I seeded `u` verbatim from the old hi-fi board. It is an additive optional field — the locked core is untouched.
- **Hi-fi renderers are generalized, not card-by-card-identical.** The old hi-fi board hand-authored each card; the kit derives each card from `content` + type. Visually equivalent, but two cards differ slightly in layout from before (both intentional, both still token-pure mini-screens):
  - *Metrics* (table): old had a faux nav split + chips; kit renders uniform `.hf-mrow` rows with status chips (matches the Lipids/Genetics cards' idiom).
  - *Dashboard* (ring, Sustain): old paired the ring with extra tiles; kit renders ring + two `.hf-pct` bars.
- No new tokens, no `remix-app/` changes, no screenshot pipeline, `_kit/nav-manifest.js` untouched, no other diagrams touched. NON-GOALS honored.

## Watch-list for the browser (Task 3) verification pass

1. **Full-tier resolution bump is the biggest visual change.** `.zs-screen` is now 1280×800 at `transform:scale(.24)` inside a 308×192 `.zs-wrap`. In-flow size should look ~the same as before (~307px-wide card); the win is on zoom-in. Confirm the scaled card fills the wrap with no clipping on the right/bottom edge (scale .24 × 1280 = 307.2px vs wrap 308px — 0.8px margin). If a hair of clipping shows, nudge `.zs-wrap` width to 310px.
2. **`.zs-c{overflow:hidden}` clips overflow.** I bumped all `.zs-*` internals ~×1.6 to keep desktop proportions; content should fit the taller 800px canvas the same way it fit 511px before, but spot-check the *Lipids* table (4 rows) and *Genetics* (3 rows) full cards for any bottom clipping.
3. **Sidebar glyphs are new** (replaced the old plain `.i` squares). They use `currentColor` so the active item should render periwinkle (`var(--p)`) and inactive `var(--ink-3)`. Confirm all 7 glyphs render (not empty boxes) and the active one matches each card's surface.
4. **Theme is now scoped to the wrapper `data-theme` div, not `documentElement`.** `--board-ground/--board-card/--board-cardln/--board-cardsh` are defined under `[data-theme="light|dark"]` in app-screen.css. Confirm light AND dark both render cleanly across all three tiers (rail, sticky notes, legend, cards) with no unstyled flash. Body fallback uses `body:has([data-theme="dark"])`.
5. **`{{ toggleTheme }}` binding.** Confirm the rail theme button toggles and persists (localStorage `zoetrop-theme`) on each board, and the label flips Dark/Light.
6. **SSOT spot-check.** All three tiers read the same `window.ZOETROP_B01` — confirm the same Jordan Vale story / surfaces / sticky text appears across lo-fi, hi-fi, and full (changing the subject name in screens.B01.js would move all three).
7. **Console:** watch for dc-runtime `x-import` errors (`no export named FlowBoard`, babel transform failure). Exports verified statically but only the live runtime exercises the babel→CommonJS eval path.
