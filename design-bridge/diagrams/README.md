# Zoetrop · Diagram Navigator

The **design-line** navigator — a collapsible left-drawer shell that loads the
levels-of-zoom diagram boards into an iframe canvas. This visualises Zoetrop's
*design line* (`design-bridge/`); it is **not** the live product left-nav, which
ships at `remix-app/app/components/shell/`.

Ported from the canonical kit (PRX → `_kit/nav-shell.{js,css}`,
`build-nav-manifest.mjs`, `support.js`), with a Zoetrop `_adapter.css` token seam
and `infocard.css` board engine. See `../DIAGRAM-NAVIGATOR-HANDOFF.md` for the
rollout lineage.

## Run

Self-contained — serve from **this** directory:

```bash
python3 -m http.server 8781 --directory design-bridge/diagrams
# open http://127.0.0.1:8781/index.html
```

The design-system boards live one tree over (`design-bridge/design-system/`) and are
reached through the **`_ds` symlink** (`_ds → ../design-system`), so all
links stay inside the navigator root — no repo-root serving needed. The symlink
preserves depth, so each linked board's own `../styles.css` / `_ds_bundle.js`
resolve too.

Shortcuts: `\` or `Esc` toggles the drawer; footer **Theme** button toggles
light/dark (the shell sets `data-theme` on each board iframe).

## Layout

```
diagrams/
  index.html              shell entry (NAV_CONFIG → ZOETROP_NAV)
  _ds → ../design-system   symlink: in-place links to design-system boards
  _kit/
    _adapter.css          Zoetrop token seam (self-contained: light + dark)
    nav-shell.{js,css}    canonical drawer + iframe canvas (verbatim from PRX)
    nav-manifest.js       the spine (hand-authored; generator-overwritable)
    build-nav-manifest.mjs generator (CONFIG block set to Zoetrop's spine)
    support.js            DC runtime (verbatim from PRX; unused by static boards)
    infocard.css          board rail engine (from Fassen _kit)
  00-design-programme/    00 · programme overview  (built)
  07-screens/             07 · screens index       (built)
  01-…06, 08-…12/         planned levels (placeholders in the manifest)
```

## Boards

Two kinds, both loaded into the iframe canvas:

1. **In-tree boards** (`00-…`, `07-…`) — self-contained static HTML (no `<x-dc>`),
   themed via `data-theme` on the board `<html>`; kept as `.dc.html` for clean-slug
   routing.
2. **Linked design-system boards** — the pre-existing `@dsCard` HTML under
   `design-bridge/design-system/` (token guidelines, component galleries, the mobile
   app-kit, brand), referenced via the `_ds` symlink (`_ds/…`). These predate the
   navigator and are linked, not regenerated.

Status is single-sourced in `_kit/nav-manifest.js` (`built` vs `planned`; a
`planned` item has no `href` and is non-navigable). Brand + historical round
prototypes appear as `reference` rows above the spine.

### What's wired (scan 2026-06-28)

- **L12 Tokens** — 13 guideline boards: color (families/energy/vital/focus/
  neutral/status), spacing (scale/radii/shadows), type (scale/display/body/data).
- **L11 Components** — core / data / forms galleries (need internet: React/Babel CDN).
- **L07 Screens** — `S01` in-tree index + `S02` mobile app prototype (`ui_kits/app`).
- **L06 Service blueprints** — `B01` System & surfaces map (in-tree; modeled on the
  Atlas F02 flow-of-work). Three **fidelity variants** (pills in the drawer), all in
  the same six-stage arrangement: `lo-fi` (skeleton cards) · `hi-fi` (token-pure
  mini-screens from reused page elements) · `full` (complete app views — top bar +
  practitioner sidebar + dense content, data-driven from one chassis and scaled into
  the flow via `transform`, the Atlas rung-4 idea).
- **reference** — **Vocabulary spine** (taxonomy · ontology · composition grammar,
  recreated from PRX for Zoetrop's domain); brand logo & patterns.
- **planned** — `01-05` (lifecycle/journeys/models/JTBD/flows) + `08-10`
  (panels/actions/tables): no artifacts yet.

## Spine (00 widest → 12 finest)

`00` Programme · `01` Lifecycle · `02` Service journeys · `03` Mental models ·
`04` Jobs to be done · `05` Flows of work · `06` Service blueprints · `07` Screens ·
`08` Panels · `09` Actions · `10` Tables · `11` Components · `12` Tokens.

Anchored to `../harness/rounds/round1/CHARTER.md` (ZOETROP-R1, frozen) and
`../OPEN-A-LINE.md`. Ship levels incrementally — unbuilt levels render as `planned`.
