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
- **Status:** charter **ZOETROP-R1 FROZEN** (S1.0–S1.2 closed, locked at S1.0). **ZOETROP-R2 is now OPEN** —
  a *scoped reopening* of the one R1 subsystem the app outgrew (the **chart / data-viz language**, S1.2);
  everything else in R1 stays frozen. Harness wired (`design:*` scripts; `.staging-core` pinned;
  harness-local deps). Refinement LINEs run off frozen subsystems; the chart language now runs through R2.
- **Active charter (2026-06-21): ZOETROP-R2 — the data-viz language, on visx.** Contract:
  **[`harness/rounds/round6/CHARTER.md`](./harness/rounds/round6/CHARTER.md)**; opening session prompt:
  `round6/PROMPT-S-R2.0.md`; migration map: `round6/MIGRATION.md`. **Status: SEEDED, ready to transmit**
  (`harness/rounds/round6/`). Decisions taken (2026-06-21): **(B) reopen the chart language** · **migrate
  everything to visx** (retire Recharts) · proving viz = **distribution/"you are here" · multi-series
  autonomic (WHOOP) · body-comp (DEXA)** + re-express the trend frames. The crux it resolves: a
  **series-encoding** policy that uses the three metric families (Energy/Vital/Focus), never the four status
  tokens. Next: transmit `round6/package/PROMPT-PASTE-viz.md` in the ZTP1 prototype project
  (`f200a4ef-34c4-4d73-…`), gate the return with `RETURN-GATE.md`, integrate.
- **Closed:** `round5`/`LINE-signature` (the expressive-layer line) — **DONE** (returned, gated, integrated;
  ledger closed S-sig; see `NEXT-LINE-PLAN.md`, now historical). **Parked:** `round4`/`LINE-reports` (apply
  the calm-instrument language to the Reports surface — un-executed).

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
