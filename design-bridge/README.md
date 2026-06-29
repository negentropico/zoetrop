# design-bridge — Zoetrop design line (ZOETROP-R1)

Zoetrop's design-language **line**, run via **`zoetrop-design-line`** + **`zoetrop-design-roundtrip`**
(scaffolded under `.claude/skills/`). Mirrors the LGS / FSN harness pattern, adapted for zoetrop's
repo-root layout. Entry point + archetype: **[`OPEN-A-LINE.md`](./OPEN-A-LINE.md)**.

## Archetype — adopt-existing foundation → refinement LINE

Zoetrop is **NOT greenfield.** `design-bridge/design-system/` is a mature, shipped DS (3 prior design rounds; live
at zoetrop.netlify.app) and is the **origin the design-roundtrip CORE was ported from**. So the harness
does **not** author a charter from scratch — it **adopts** the existing foundation as the frozen charter
**ZOETROP-R1**, backfills the three prior rounds into the ledger as history, and opens the next round as
the first refinement LINE.

## Layout

```
design-bridge/
  PROVENANCE.md                ← B0 source-bundle provenance (pre-existing)
  OPEN-A-LINE.md               ← how to continue the line (start here)
  README.md                    ← this file
  harness/
    package.json               ← harness-local deps (tsx/postcss/tar/typescript); node_modules gitignored
    design-bridge.config.ts    ← typed config over @design-roundtrip/config (adapter: react-tailwind, fwd-declared)
    tsconfig.json              ← extends remix-app's; @design-roundtrip/* → .staging-core/src/*
    bin/{sync-core,init,seed,round}.ts
    .staging-core/             ← synced CORE (gitignored)
    .staging/                  ← return staging (gitignored)
    rounds/
      harness/RETURN-SPEC.md   ← master return spec (init)
      round1/                  ← the ZOETROP-R1 charter (FROZEN, backfilled)
        CHARTER.md · DECISIONS.md (S1.0–S1.2 ☑) · ROUNDTRIP.md · round-manifest.json
        carried/ · package/    ← foundation snapshot
      round4/                  ← the FIRST refinement LINE (staged)
        PROMPT-LINE-reports.md · round-manifest.json · DECISIONS.md · package/
```

## The DS-as-skill — adopted, not re-scaffolded (reconcile)

The `ngt-design-system` (§C3) pattern is **already instantiated** for zoetrop at **`design-bridge/design-system/`**:
`_ds_manifest.json` (namespace `ZoetropDesignSystem_48aebc`; 11 core components), `_adherence.oxlintrc.json`
(real oxlint adherence rules), `SKILL.md` (the `zoetrop-design` skill), brand marks, guidelines, and the
component library. **It is authoritative — adopt/reference it; do not reinvent or overwrite.** No competing
`.claude/skills/zoetrop-design-system` was scaffolded; the line/roundtrip skills and `ROUNDTRIP.md` point
at `design-bridge/design-system/`.

## Run (from `remix-app/`)

```bash
cd remix-app
npm run design:sync-core   # sync CORE → ../design-bridge/harness/.staging-core (once / on CORE change)
npm run design:typecheck   # typecheck the harness against the synced CORE
npm run design:seed        # (re)build round1/package + current-state snapshot
npm run design:seed -- --round=round4
npm run design:round       # (re)write all round-manifest.json + DECISIONS.md
```
First time: `npm install` in `design-bridge/harness/` (harness-local tsx/postcss/tar/typescript). The
scripts `cd ..` to the repo root because the design artifacts live at the repo root, so every config path
is repo-root-relative.

## Status

Charter **ZOETROP-R1 FROZEN** (S1.0–S1.2 closed, locked at S1.0). Token harness wired + typechecks clean
against the synced CORE. The **inbound** half (decode → adapt → gate → capture) is **deferred** until a
`react-tailwind` CORE adapter lands; until then `zoetrop-design-roundtrip` integrates by hand against the
existing scripts. First refinement line drafted: `harness/rounds/round4/PROMPT-LINE-reports.md`.

## The two rounds trees (live ledger vs prior return artifacts)

There are **two rounds trees** in this repo, and they are easy to confuse — so name them:

1. **LIVE LEDGER** — `design-bridge/harness/rounds/`. Harness-generated, the active
   workflow surface. Holds only the in-flight entries: `round1` (frozen charter), `round4`
   (parked), `round6` (active). Closed records are moved out (see below).
2. **PRIOR RETURN ARTIFACTS** — `design-bridge/design-system/_archive/rounds/` (was
   `design-bridge/design-system/_archive/rounds/`, ~16M). Frozen *return* snapshots from the prototype
   rounds — provenance, **not** an active ledger. Relocated + explained in
   `design-bridge/design-system/_archive/README.md`.

Closed Layer-3 records (the round5 LINE-signature line + its superseded `NEXT-LINE-PLAN.md`)
live at `design-bridge/_archive/` — see `design-bridge/_archive/README.md`.

### Each round → the system it touched → its ZTP1 return location

ZTP1 = the prototype project `f200a4ef-34c4-4d73-9e03-c210e759225a` (`PROJECT_TYPE_PROJECT`),
the inbound DesignSync transport. (The `48aebc…` "Zoetrope Design System" project is a
separate, post-integration component-library sync — not a round return location.)

| Round | System it touched | ZTP1 return location |
|-------|-------------------|----------------------|
| `round1` (S1.0–S1.2 backfill, frozen) | `remix-app/app/app.css` + DS library + Navigator (foundation) | pre-harness (backfilled into the ledger from prior prose) |
| `round2` (left-nav prototype, archived) | app chrome (left-nav rail/accordion) | archived: `design-bridge/design-system/_archive/rounds/round2/` |
| `round3` (calm-instrument screens, archived) | metric/dashboard screens + Recharts idiom | ZTP1 `f200a4ef…` `round3-return/` (co-mingles the r4/r5 iteration files) |
| `round4` (parked) | Reports surface (seeded, not returned) | ZTP1 `f200a4ef…` |
| `round5` (CLOSED, archived) | `app.css` `zt-sig-*` expressive layer | ZTP1 `f200a4ef…` `round3-return/round5/return` → archived at `design-bridge/_archive/rounds/round5/return/` |
| `round6` (active R2) | chart language on visx | ZTP1 `f200a4ef…` |

> The per-round system alignment lives **here** (the editable home). The generated
> `round-manifest.json` / `DECISIONS.md` are NOT hand-edited — `bin/round.ts` regenerates them.
