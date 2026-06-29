# Handoff — Build out Zoetrop's Diagram Navigator (shell) + levels-of-zoom "sequence system"

**For a future session with `cwd = /Users/mac/Code/zoetrop`.**
Written 2026-06-28 from the cross-repo Diagram Navigator rollout (PRX · FSN · Stripe/Atlas · Trouvant).

## Goal
Give Zoetrop the same two things the sibling design families now have:
1. **The Navigator shell** — a collapsible left-drawer app-shell that loads diagram
   boards into an iframe canvas, with a tree built from a manifest, hash routing,
   light/dark theming, and a `\`/`Esc` keyboard toggle. *Mechanical — ~1 hour.*
2. **The "sequence system" — the levels-of-zoom diagram boards** themselves, authored
   at each level of the spine (the real design work). *The substantive part.*

> Scope note: this is the **design/diagram** navigator (for `design-bridge/` boards),
> NOT the live product left-nav. Zoetrop's product sidebar already ships at
> `remix-app/app/components/shell/` (`AppShell.tsx`, `Sidebar.tsx`, `nav-tree.ts`,
> groups Dashboard/Metrics/Protocol/Insights/Reports/Ingest). Keep them separate —
> the diagram navigator visualises the *design line*, the product sidebar routes the *app*.

## Why this is portable (the lineage)
All these families share one `.dc.html` DesignSync kit. The Navigator is now a
**canonical kit** living in PRX; sibling repos copy it verbatim and change only a
small config block. See:
- Canonical kit: `/Users/mac/Code/PRX/docs/diagrams/praxis/_kit/{nav-shell.js,nav-shell.css,build-nav-manifest.mjs}`
- Rollout plan + design: `/Users/mac/Code/PRX/docs/specs/diagram-navigator/{ROLLOUT-PLAN.md,spec.md,plan.md}`
- Launch-all script (add a Zoetrop row to it): `/Users/mac/Code/PRX/docs/specs/diagram-navigator/serve-all.sh`
- Reference ports of all 3 variants: Fassen (clean), Atlas (no registers + fidelity variants),
  Trouvant (flat/hand-authored + full 12-level spine).

## Where it goes
Mirror the FSN layout (a diagram family under the repo's design-bridge):
```
zoetrop/design-bridge/diagrams/
  index.html                 ← shell entry (links _adapter.css + nav-shell.css; sets window.NAV_CONFIG)
  _adapter.css               ← Zoetrop token seam (lift from design-bridge/design-system/tokens/colors.css)
  _kit/
    nav-shell.css            ← copy verbatim from PRX canonical
    nav-shell.js             ← copy verbatim from PRX canonical
    build-nav-manifest.mjs   ← copy from PRX; edit ONLY the CONFIG block
    nav-manifest.js          ← generated (or hand-authored, like Trouvant)
    support.js               ← dc-runtime, copy from PRX _kit (needed only if boards are .dc.html cards)
  00-design-programme/ 01-… 02-… …   ← the boards (the sequence system; see spine below)
```

## Step 1 — Shell (mechanical)
1. `cp` the three canonical files from PRX `_kit` into `design-bridge/diagrams/_kit/`.
   (Do NOT edit `nav-shell.js`/`nav-shell.css` — they're the shared superset:
   reference rows · null overview · fidelity variants · clean-slug + full-filename routing.)
2. Write `design-bridge/diagrams/index.html` (copy a sibling's; swap the `<link>` to
   `_adapter.css` + `_kit/nav-shell.css`, load `_kit/nav-manifest.js` + `_kit/nav-shell.js`)
   and set:
   ```html
   <script>window.NAV_CONFIG = {
     manifest: "ZOETROP_NAV", storageKey: "zoetrop-nav-v1",
     wideBreakpoint: 860, brand: { name: "Zoetrop", mark: "Z", tag: "Navigator" }
   };</script>
   ```
3. Edit the generator CONFIG block (`SECTIONS`, `OVERVIEW`, `REFERENCE`,
   `OUTPUT_GLOBAL = "ZOETROP_NAV"`) to match the dirs/registers you create in Step 3.
   If Zoetrop's boards end up flat/human-named (like Trouvant), skip the generator and
   hand-author `nav-manifest.js` instead (copy Trouvant's as the template).

## Step 2 — `_adapter.css` (theme seam)
The Navigator consumes the shared adapter vocabulary as **complete colours**. Lift
Zoetrop's tokens from `design-bridge/design-system/tokens/colors.css` (light + dark) into a
self-contained `_adapter.css` (see Stripe's `_kit/_adapter.css` for the self-contained
form, or Trouvant's `_adapter.css` for wrapping channel tokens). Mapping:

| adapter token | Zoetrop source (`colors.css`) |
|---|---|
| `--canvas` | `--bg` |
| `--resting` / `--overlay` | `--n-0` / `--n-50` |
| `--sunk` | `--n-100` (or `--mist`) |
| `--ink` | `--ink` |
| `--ink-2` / `--ink-3` | `--n-500` / `--n-400` |
| `--line` / `--line-2` | `--border` / `--border-strong` |
| `--p` / `--p-on` / `--p-fig` | `--accent` / `--accent-on` / `--accent` (deepened) |
| `--p-tint` | `color-mix(in oklab, var(--p) 14%, transparent)` |
| `--pos` / `--pos-soft` / `--pos-line` | the success/positive hue (`--energy` ramp or `--info`) |
| `--rail` / `--on-rail` | `--ink` (dark in both themes) / `--bg` |
| `--r-xs..--r-pill` | from `tokens/spacing.css` (or literals 5/7/9/999) |
| `--font` / `--mono` / `--display` | from `tokens/fonts.css` |

Also wire dark mode: the navigator toggles `data-theme="dark"` on `<html>` and the
iframe; provide a `[data-theme="dark"]` block in `_adapter.css` (Zoetrop colors.css
already has a dark set — lift both).

## Step 3 — The sequence system (the boards at each level)
This is the design work: author the levels-of-zoom boards. Follow the family's spine
(00 widest → 12 finest), adapted to Zoetrop's wellness domain and **anchored to the
ZOETROP-R1 charter** (`design-bridge/rounds/round1/CHARTER.md`) and the round/line
structure in `design-bridge/OPEN-A-LINE.md`. Proposed spine:

| # | Level | Zoetrop board (suggested) |
|---|---|---|
| 00 | Programme overview | the whole design line on one page (tiers + nesting + this spine) |
| 01 | Lifecycle | the member's health arc — onboard → baseline → protocol → review → sustain |
| 02 | Service journeys | the member journey over time (effort/emotion, role-tagged) |
| 03 | Mental models | how members think about their health data (citylines / Indi-Young) |
| 04 | Jobs to be done | the ranked JTBD (e.g. "understand a lab result", "adjust a protocol") |
| 05 | Flows of work | per-job taskflows across screens |
| 06 | Service blueprints | front-stage ↔ back-stage (ingest → analysis → insight → report) |
| 07 | Screens | the 6 product areas (Dashboard · Metrics · Protocol · Insights · Reports · Ingest) |
| 08 | Panels | the detail/analysis panels (correlations, genetics, supplement detail) |
| 09 | Actions | controls & state transitions |
| 10 | Tables | the dense surfaces (metrics, supplements, reports list) |
| 11 | Components | the screen component register |
| 12 | Tokens | the colour/type/space token layer (Zoetrop already has this — `design-bridge/design-system/tokens/`) |

Notes:
- Build the **register/index page per section** (`*-register.dc.html`) if you want the
  generator to auto-populate items + planned states; otherwise hand-author the manifest.
- It's fine to ship levels incrementally — unbuilt levels render as **planned**
  placeholders (see Trouvant 07–11). The nav is honest about what exists.
- Cards are `.dc.html` (`<x-dc>` + `_kit/support.js`); copy the CSS engines you need
  (`flowmap.css`, `journey.css`, `infocard.css`, `screens.css`) from a sibling `_kit`.
  Level 12 (Tokens) can link straight to `../../design-bridge/design-system/` artifacts.

## Step 4 — Serve + verify
- Serve from a root where the boards' relative links resolve (likely
  `design-bridge/diagrams/`), e.g. `python3 -m http.server 8781 --directory design-bridge/diagrams`,
  open `http://127.0.0.1:8781/index.html`. Add a `Zoetrop|8781|…|index.html` row to
  PRX's `serve-all.sh` so all families launch together.
- Verify (Playwright / chrome-devtools): drawer toggle (control + `\` + `Esc`), accordion,
  item click → correct iframe src + hash, deep-link restore, back/forward, theme (shell
  + token-driven cards), planned items non-navigable.

## Step 5 — Commit
Work on a feature/design branch (current: `design/zoetrop-dl-prime` — confirm or branch).
Commit the navigator infra separately from board content. End commit messages with the
project Co-Authored-By trailer.

## Pointers
- Memory: `~/.claude/projects/-Users-mac-Code-NGT-ngtops/memory/reference_praxis-diagram-kit-lineage.md`
  and PRX memory `diagram-navigator-rollout.md` (canonical kit + per-repo config notes).
- Canonical kit superset features to rely on (already in the copied JS): `window.NAV_CONFIG`,
  `reference[]` rows, `overview: null`, `variants[]` fidelity switcher, unified router.
