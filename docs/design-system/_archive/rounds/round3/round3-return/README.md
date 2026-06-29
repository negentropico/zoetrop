# Round 3–5 return — package landing

> **Status: FINAL** (closing session 2026-06-12). Read
> [`CHANGES.md`](./CHANGES.md) for the full decision log of record
> (rounds 3, 4 and 5) and the cumulative integration-asks list.
>
> Round goal (proposed round 3, held through closing): *every screen
> reads as one calm instrument — neutral structure, ink data, status
> carried only by the four canonical status colors — at a compact,
> data-dense default rhythm.*

## How to view

Open **[`index.html`](./index.html)** in a browser. Build-free; needs
network once for the CDN UMDs (React, Recharts, Lucide, Babel) and
Google Fonts. Every route in the BRIEF is reachable from the left nav;
public surfaces live outside the shell — reach them by hash: `#/` and
`#/login`. Toggle the Tweaks panel for the chart-state preview
(data / empty / loading) — review-harness feature, not return surface.

## What's in the package

| Class | Files | Notes |
|---|---|---|
| **Deliverables of record** (RETURN-SPEC §1) | `app/lib.jsx` · `app/charts.jsx` · `app/screens.jsx` · `app/screens-ingest.jsx` · `app/screens-public.jsx` · `app/screens-r4.jsx` · `app/screens-r5.jsx` · `new.css` | Loose source, one file per screen-group; ONE additions-only stylesheet |
| **Decision log** (§2) | `CHANGES.md` | Per-screen changes, tokens, icons, baked decisions, integration asks — FINAL |
| **Viewing artifacts only** (§5) | `index.html` · `app/main.jsx` · `tweaks-panel.jsx` · `app.css` | `app.css` is the unmodified snapshot from the round-3 package; `main.jsx` is the hash-router mount — map to the app's real router per §4 |
| **Sample data — do not integrate** | `app/data.js` · `app/data-r4.js` · `app/data-r5.js` | Design-artifact values; `data-r5.js` shapes (`ZD.whoop`, `ZD.vault`, `ZD.invites`) double as contract sketches |
| **Process artifacts** | `prompt-r4.md` · `prompt-r5.md` | Session briefs, kept for the decision trail |

## RETURN-SPEC alignment (checked at closing)

- **§1 Loose files** ✓ — all screens ship as source above; the bundle-free
  `index.html` is never the sole source.
- **§1 ONE `new.css`, additions only** ✓ — no token redefinitions, no
  dark-remap duplication, no radius re-declarations. **One deliberate,
  flagged exception:** `--dur-ring` 900→1600ms (owner pick, round 3) —
  change the value in `app.css` at integration and drop the override.
- **§2 CHANGES.md** ✓ — per screen, every new token/class, every new
  lucide name, baked interaction-model decisions called out per round.
- **§3 Token families** ✓ — new tokens extend existing families only:
  status names (`--optimal/--borderline/--deficient` + `-bg`),
  `--surface-low(-2)`, `--gap-card/section/row`,
  `--zn-page-top/--zn-brand-pad/--zn-brand-gap`.
- **§4 Idiom mapping** ✓ — `Link to="/x"` (hash) → react-router
  `NavLink`/`Link`; `Icon name="x"` → `lucide-react` import;
  `window.ZD.categories` → `CATEGORY_INFO` (same 9 ids); theme is the
  existing `data-theme` plumbing mirrored, never reimplemented;
  `zt-`/`zn-` prefixes respected throughout.
- **§6 Constraints** ✓ — single 760px breakpoint (full mobile sweep,
  round 5, geometry-verified); dark theme via
  `html[data-theme="dark"]` variable remap only.

## BRIEF coverage (every UI route prototyped)

| Route(s) | Screen file |
|---|---|
| `/dashboard` | `screens.jsx` |
| `/metrics` · `/metrics/:category` · `/metrics/:category/:metricId` | `screens.jsx` (+ `charts.jsx` Part B language) |
| `/protocol` · `/versions` · `/supplements` · `/cessation` ("Phasing") · `/compare` | `screens.jsx` |
| `/protocol/versions/:version` · `/insights` | `screens-r4.jsx` |
| `/insights/correlations` · `/insights/genetics` | `screens.jsx` |
| `/ingest` (combined overview, serves `/import`) · `/ingest/upload` | `screens.jsx` |
| `/ingest/review` · `/ingest/consent` · `/ingest/documents/:id` | `screens-ingest.jsx` |
| `/import/whoop` · `/import/vault` (populated, round 5) | `screens-r5.jsx` |
| `/settings` (invites flow, round 5; revoke maps to the action route) | `screens-r5.jsx` |
| `/` · `/login` (public register — copy is PLACEHOLDER) | `screens-public.jsx` |

Part B (one chart language: axes, status tokens, frame-card tooltip,
empty/loading, ring-sweep rules) ships complete in `charts.jsx` —
rules documented at the top of that file and in `CHANGES.md`.

**"What NOT to change" honored:** nav interaction model untouched
(visual surface-ladder polish only), routing/IA unchanged (`/import/*`
kept as aliases; redirect + nav-tree edits are integration asks, not
prototype changes), theme plumbing mirrored, brand foundations
(tokens, Space Grotesk / Hanken Grotesk / Space Mono, Lucide) used
as constants — new lucide names are listed per round in `CHANGES.md`.

## Outstanding owner inputs (flagged, not blocking)

1. Landing/login marketing copy — all current copy is placeholder.
2. A real extraction sample to replace the synthesized LabCorp
   facsimile (`data-r4.js`).

Both are item 9 on the final integration-asks list in `CHANGES.md`.
