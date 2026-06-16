# design-bridge — Zoetrop design line (ZOETROP-R1)

Zoetrop's design-language **line**, run via **`zoetrop-design-line`** + **`zoetrop-design-roundtrip`**
(scaffolded under `.claude/skills/`). Mirrors the LGS / FSN harness pattern, adapted for zoetrop's
repo-root layout. Entry point + archetype: **[`OPEN-A-LINE.md`](./OPEN-A-LINE.md)**.

## Archetype — adopt-existing foundation → refinement LINE

Zoetrop is **NOT greenfield.** `docs/design-system/` is a mature, shipped DS (3 prior design rounds; live
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

The `ngt-design-system` (§C3) pattern is **already instantiated** for zoetrop at **`docs/design-system/`**:
`_ds_manifest.json` (namespace `ZoetropDesignSystem_48aebc`; 11 core components), `_adherence.oxlintrc.json`
(real oxlint adherence rules), `SKILL.md` (the `zoetrop-design` skill), brand marks, guidelines, and the
component library. **It is authoritative — adopt/reference it; do not reinvent or overwrite.** No competing
`.claude/skills/zoetrop-design-system` was scaffolded; the line/roundtrip skills and `ROUNDTRIP.md` point
at `docs/design-system/`.

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
