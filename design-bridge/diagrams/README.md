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

```bash
python3 -m http.server 8781 --directory design-bridge/diagrams
# open http://127.0.0.1:8781/index.html
```

Shortcuts: `\` or `Esc` toggles the drawer; footer **Theme** button toggles
light/dark (the shell sets `data-theme` on each board iframe).

## Layout

```
diagrams/
  index.html              shell entry (NAV_CONFIG → ZOETROP_NAV)
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

Boards are **self-contained static HTML** (no `<x-dc>`): the navigator loads board
HTML in its iframe and themes it via `data-theme` on the board `<html>`; the
adapter resolves light/dark from there. Kept as `.dc.html` for clean-slug routing.
Status is single-sourced in `_kit/nav-manifest.js` (`built` vs `planned`; a
`planned` item has no `href` and is non-navigable).

## Spine (00 widest → 12 finest)

`00` Programme · `01` Lifecycle · `02` Service journeys · `03` Mental models ·
`04` Jobs to be done · `05` Flows of work · `06` Service blueprints · `07` Screens ·
`08` Panels · `09` Actions · `10` Tables · `11` Components · `12` Tokens.

Anchored to `../harness/rounds/round1/CHARTER.md` (ZOETROP-R1, frozen) and
`../OPEN-A-LINE.md`. Ship levels incrementally — unbuilt levels render as `planned`.
