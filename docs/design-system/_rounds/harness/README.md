# Design-roundtrip harness — the round protocol

Tooling + protocol for design roundtrips between this repo and claude.ai/design
(driven by the **zoetrope-design** skill bundle, the brand source of truth).
Built after round 2 returned a 1.6MB self-decoding bundler HTML that had to be
hand-decoded — see `../round2/README.md` for the pain points.

## Directory layout (per round)

```
docs/design-system/_rounds/
  harness/            this directory — scripts, protocol, RETURN-SPEC master
  roundN/
    package/          OUTBOUND — what we send (README, BRIEF, current-state/, RETURN-SPEC copy)
    return/           INBOUND — the raw drop, untouched (bundler HTML, loose files, screenshots)
    extracted/        unbundle.mjs output + css-delta report + any hand-extracted refs
```

## Workflow

1. **Prep the outbound package** in `roundN/package/`: README (what + how to
   return), BRIEF (the design ask), `current-state/` snapshots generated from the
   repo (app.css, nav-tree.ts, routes.md, components.md), and a **copy of
   `RETURN-SPEC.md`** from this directory (the return contract — keep it byte-identical).
2. **Send** with the zoetrope-design skill bundle in claude.ai/design.
3. **Drop the return** into `roundN/return/` exactly as received — never edit the raw drop.
4. **Unbundle** (if the return includes a standalone bundler HTML):
   `node harness/unbundle.mjs "roundN/return/<file>.html" roundN/extracted/`
5. **Delta** each returned/extracted stylesheet against the app:
   `node harness/css-delta.mjs roundN/extracted/styles/NN.css > roundN/extracted/css-delta.md`
   — only port NEW/CHANGED properties and prototype-only selectors.
6. **Integrate** via `/gsd-quick` with an approved plan. Reference run: round 2's
   left nav shipped in 3 quick tasks — `260610-q56` (chrome refactor) →
   `260610-rj2` (crumb meta-row) → `260610-rwg` (header unification).

## Scripts

### `unbundle.mjs` — bundler-HTML exploder

```
node unbundle.mjs <standalone.html> <outdir>
```

Explodes a claude.ai/design "bundler" standalone HTML: decodes the
`__bundler/manifest` assets (base64 + gzip) into `assets/`, JSON-parses the
`__bundler/template` string into `index.html` (uuid refs rewritten to
`assets/...`), and extracts every template `<style>` block to `styles/NN.css`
and inline jsx/babel scripts to `src/NN.jsx`. Plain (non-bundler) HTML falls
back to direct style/script extraction. node >= 18, zero deps, no eval/network;
writes only inside `<outdir>`.

### `css-delta.mjs` — prototype-vs-app stylesheet delta

```
node css-delta.mjs <prototype.css> [app.css]   # app.css defaults to remix-app/app/app.css
```

Markdown report on stdout: **NEW** / **CHANGED** / **DUPLICATE** custom
properties and **prototype-only** ("port these") / **in-both** ("review for
conflict") selectors. Crude string parsing — see `--help` for known limits.

## Return contract

`RETURN-SPEC.md` (master copy here; copied into every outbound package) tells
the design side what to send back: **loose source files + a new-rules-only
`new.css` + `CHANGES.md`** — a standalone bundle is welcome as a viewing
artifact but never the sole source.

## Round history

| Round | Subject | Return format | Where | Outcome |
|-------|---------|---------------|-------|---------|
| 1 | Full redesign (8 screen archetypes) | Clean source files | `../round1/` | Brand applied to shipped screens; package precedent in `docs/design-system/uploads/screens-package/` |
| 2 | Left nav (consolidated sidebar) | 1.6MB bundler HTML + loose jsx in untracked `_notes/` — **the pain that motivated this harness** | `../round2/` | Landed via q56/rj2/rwg; interaction model BAKED |
| 3 | Whole-app polish + data-viz language | (outbound) | `../round3/package/` | Prepped, awaiting owner TODO markers + send |
