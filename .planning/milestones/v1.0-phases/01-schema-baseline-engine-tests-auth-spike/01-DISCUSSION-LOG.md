# Phase 1: Schema Baseline + Engine Tests + Auth Spike - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-07
**Phase:** 1-schema-baseline-engine-tests-auth-spike
**Areas discussed:** Drizzle 1.0 timing, JWK spike depth, Engine refactor scope, Baseline vs cleanup order
**Discussion outcome:** User selected "resolve all with recommended defaults" — Claude resolved each gray area with its recommended option (no per-area deep-dive requested).

---

## Drizzle 1.0 timing

| Option | Description | Selected |
|--------|-------------|----------|
| Adopt 1.0-rc now | Unblocks Phase 3 RLS API early, but adopts a pre-GA dependency in Phase 1 | |
| Stay on 0.45.x, upgrade at Phase 3 (recommended) | Phase 1 needs no RLS API; keep off pre-GA dep; gate upgrade to when RLS is needed | ✓ |

**User's choice:** Recommended default → stay on 0.45.x; upgrade gated to Phase 3 (D-01, D-02)
**Notes:** JWK spike validates the claim round-trip via raw SQL on the Neon driver, so the 1.0 API is genuinely not needed in Phase 1.

---

## JWK spike depth

| Option | Description | Selected |
|--------|-------------|----------|
| Thin timeboxed proof + 1 throwaway policy table (recommended) | Prove JWT→current_setting round-trip + 1 disposable RLS policy; SET LOCAL fallback ready | ✓ |
| Deeper end-to-end RLS validation | Validate full enforcement before deciding — more Phase 1 effort | |

**User's choice:** Recommended default → thin spike with explicit fallback bar (D-03, D-04, D-05)
**Notes:** Must exercise SET LOCAL vs bare SET (pooler leak) regardless of recommended path.

---

## Engine refactor scope

| Option | Description | Selected |
|--------|-------------|----------|
| Do the two test-enabling refactors now (recommended) | Dedupe getMetricStatus into a util; inject `now` into cessation math (COMP-01) | ✓ |
| Test as-is, defer refactors | Avoids touching app code, but leaves time-coupled/duplicated logic untestable | |

**User's choice:** Recommended default → two scoped refactors only; parsers deferred to Phase 5 (D-06, D-07)
**Notes:** Behavior must stay identical across the getMetricStatus extraction — assert via test.

---

## Baseline vs cleanup order

| Option | Description | Selected |
|--------|-------------|----------|
| Pure as-is snapshot; defer cleanup to Phase 4 (recommended) | Baseline faithfully mirrors deployed Neon schema; drift cleanup is DATA-05 | ✓ |
| Fix drift as part of baseline | Cleaner schema now, but muddies the "what exists" baseline record | |

**User's choice:** Recommended default → snapshot-then-clean (D-08, D-09)
**Notes:** Drift cleanups already scoped as DATA-05 in Phase 4.

---

## Claude's Discretion

Task ordering, file/module naming, Vitest config specifics, and the spike harness layout — left to the planner, provided the locked decisions (D-01…D-09) hold.

## Deferred Ideas

- Drizzle 1.0 upgrade → Phase 3
- Schema drift cleanup → Phase 4 / DATA-05
- Import-parser tests → Phase 5 / LAB
- LLM-provider BAA decision → Phase 2 gate / Phase 5
- Real `withTenantDb` + RLS on actual tables → Phase 3
