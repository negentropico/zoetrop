# OPEN-A-LINE — Zoetrop design line

> How to continue Zoetrop's design-language line, using the shared model in ngtops
> `.claude/skills/ngt-design-line/` (`SKILL.md` + `templates/`). Scaffolded into this repo as
> `zoetrop-design-line` + `zoetrop-design-roundtrip` (under `.claude/skills/`, gitignored — re-scaffold
> with ngtops `scaffold-skills` if missing). The DS-as-skill is the existing `docs/design-system/`
> (`ZoetropDesignSystem_48aebc`) — **adopted, not re-scaffolded**.

## This project

- **Archetype:** B · existing-app round — specifically **adopt-existing foundation → refinement LINE**.
  Zoetrop is **not greenfield**: `docs/design-system/` is a mature, shipped DS (3 prior rounds, live at
  zoetrop.netlify.app) and is the **origin the design-roundtrip CORE was ported from**
  (`docs/design-system/_rounds/harness/{unbundle,css-delta}.mjs`).
- **Medium:** `screen` (single — no print sibling).
- **Stack / token home:** react-tailwind (React Router 7 + Vite + Tailwind v4). Tokens at
  `remix-app/app/app.css` (`:root` light + `html[data-theme="dark"]` dark).
- **Status:** charter **ZOETROP-R1 FROZEN / archived** — sessions **S1.0–S1.2 closed** (foundation /
  left-nav IA / calm-instrument screen language), **locked at S1.0**. Harness wired (`design:*` scripts in
  `remix-app/package.json`; `.staging-core` pinned to the evolved CORE; harness-local deps in
  `design-bridge/harness/package.json`). Further work runs as **refinement LINEs**.
- **Active plan (2026-06-20):** **[`NEXT-LINE-PLAN.md`](./NEXT-LINE-PLAN.md)** — refinement
  `LINE-signature` (refine the visual language further, *more unique*). **Status: SEEDED, ready to
  transmit** (`harness/rounds/round5/`). Both blockers resolved: design access is live via the native
  **`DesignSync`** tool (not an MCP server; `/design-login` grants the scope) and **scope (C)** is chosen —
  push the expressive layer *within the LOCK* (activate the locked-but-unused spiral/phyllotaxis motif,
  motion signature, texture, etc.; zero new locked tokens), staging **ZOETROP-R2** only if it still reads
  generic. Decisions taken: 3 archetype surfaces (dashboard · metric-detail · metrics) · **inbound =
  DesignSync, `react-tailwind` adapter deferred**. Next: transmit `round5/package/PROMPT-PASTE-signature.md`
  in the `48aebc…` claude.ai/design project, then integrate the return by hand.
- **Earlier starting point (parked):** the first drafted refinement line at
  `harness/rounds/round4/PROMPT-LINE-reports.md` (apply the calm-instrument language to the Reports
  surface — still un-executed; superseded as the active priority by the plan above).

## Run the harness (from `remix-app/`)

```bash
cd remix-app
npm run design:sync-core   # sync CORE → ../design-bridge/harness/.staging-core (once / on CORE change)
npm run design:typecheck   # typecheck the harness against the synced CORE
npm run design:seed -- --round=round4   # (re)build round4/package + current-state snapshot
npm run design:round       # (re)write all round-manifest.json + DECISIONS.md
```
(Scripts `cd ..` to the repo root — the config paths are repo-root-relative. First time, run
`npm install` in `design-bridge/harness/` to get the harness-local tsx/postcss/tar/typescript.)

## Continue the line (open a refinement LINE)

1. Read `harness/rounds/round1/CHARTER.md` → `DECISIONS.md` (S1.0–S1.2 ☑) → `ROUNDTRIP.md`.
2. `npm run design:seed -- --round=round<n>` to snapshot the current foundation into the line's `package/`.
3. **ASSET-INVENTORY first** (see [`RETURN-GATE.md`](./RETURN-GATE.md)): enumerate the DS's existing
   expressive vocabulary (`docs/design-system/assets/pattern-*.svg` + `mark-*.svg`,
   `guidelines/brand-patterns.html`, the `.zt-grain` texture utility) and tell the design side to **consume**
   it (reference/inline the canonical geometry), never reinvent. Then author `PROMPT-LINE-<name>.md` (scope ·
   inputs · record-vs-decide · propagation=physics · exit). Transmit via **`DesignSync`** in the round
   prototype project; return per `package/RETURN-SPEC.md` (loose source + a new-rules-only `new.css` +
   `CHANGES.md` — token freeze: prefer zero new tokens; any new one extends an existing family).
4. **Gate, then integrate** (by hand until the `react-tailwind` adapter lands): run the 7-point
   [`RETURN-GATE.md`](./RETURN-GATE.md) (a single FAIL blocks); `css-delta` / fold `new.css` into `app.css`;
   **rebuild components to spec as the real stack — never paste the prototype's UMD JSX/CSS**; capture both
   themes via `zoetrop-design-roundtrip`.
5. Record the session: append a block + `npm run design:round` (regenerates the manifest + `DECISIONS.md`);
   honor the propagation rule (screen-only = `physics`); run the honesty render (both themes, JS-off);
   log gaps in `FEEDBACK-LINE-<name>.md`.

## Carried state

`harness/rounds/round1/CHARTER.md` (the contract) · `DECISIONS.md` (the closed record S1.0–S1.2) ·
`ROUNDTRIP.md` (the Design⇄Code contract) · `carried/README.md` (the foundation = the carry) ·
`docs/design-system/` (the adopted DS-as-skill). The token truth is `remix-app/app/app.css`.
