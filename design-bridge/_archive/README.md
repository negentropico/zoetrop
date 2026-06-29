# `design-bridge/_archive/` — Layer-3 CLOSED design-line records

This folder holds **closed / superseded** Layer-3 (design-line machinery) records,
relocated here by quick task **260629-ktv** via history-preserving `git mv`. The
**live** ledger keeps only the active entries at `design-bridge/harness/rounds/`.

## What's archived here

### `rounds/round5/` — LINE-signature (CLOSED)

The round5 LINE-signature line is **closed**:

- Returned via **DesignSync** (ZTP1 prototype project `f200a4ef-34c4-4d73-9e03-c210e759225a`).
- Gated **PASS** (`RETURN-GATE.md`, 7/7) — ledger session `S-sig`, status `closed`,
  `closedDate` 2026-06-20.
- **Integrated** at quick task **260620-rd4** — the `zt-sig-*` expressive layer (motif
  watermark · "the settle" φ-stagger motion · paper grain · branded empty/loading ·
  frame-dot iconography) on dashboard / metric-detail / metrics, **within-LOCK, zero
  token delta**.

This archived copy is the **canonical closed snapshot** of round5 (manifest, prompt,
feedback, decisions, package, and the return under `round5/return/`).

### `NEXT-LINE-PLAN.md` — superseded narrative

The round5 narrative plan, self-marked HISTORICAL/SUPERSEDED. It is not a
harness-generated ledger entry and `bin/round.ts` does not reference it.

## Live ledger (NOT here — stays at `design-bridge/harness/rounds/`)

| Round | State | Charter |
|-------|-------|---------|
| `round1` | frozen charter | ZOETROP-R1 |
| `round4` | parked (Reports surface, seeded, not returned) | ZOETROP-R1 |
| `round6` | active | ZOETROP-R2 (chart language on visx) |

## ⚠️ Regeneration caveat — `bin/round.ts` still emits a round5 block

`design-bridge/harness/bin/round.ts` is **protected** (live set) and still emits a round5
ledger block. A future `npm run design:round` (NOT run by this task) will therefore
**re-create a 2-file stub** at `harness/rounds/round5/{round-manifest.json,DECISIONS.md}`.

The archived copy here remains the canonical closed snapshot. **Permanently pruning the
round5 block from `round.ts` is a deliberate follow-up** — `bin/` was protected in the
reorg task (260629-ktv), so it was not touched. If a regenerated stub reappears, it can be
re-archived (or the round.ts block pruned) at that time.
