---
phase: 1
slug: schema-baseline-engine-tests-auth-spike
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-07
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (new — Wave 0 installs) |
| **Config file** | `remix-app/vite.config.ts` (`test` block; fallback `remix-app/vitest.config.ts` if the `reactRouter()` plugin conflicts with node env) |
| **Quick run command** | `cd remix-app && npx vitest run` |
| **Full suite command** | `cd remix-app && npx vitest run` |
| **Estimated runtime** | ~3 seconds (pure-function unit tests, no DB) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run` (and `npx tsc --noEmit` for the refactor tasks)
- **After every plan wave:** Run `npx vitest run` full suite
- **Before `/gsd:verify-work`:** Full suite green + `drizzle-kit migrate --dry-run` clean
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

> Task IDs are provisional — align to the planner's PLAN.md task numbering. Every requirement below has an automated command except the spike (see Manual-Only).

| Task | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| Install Vitest + config | 0 | COMP-01 | N/A | infra | `npx vitest run` exits 0 (empty pass) | ❌ W0 | ⬜ pending |
| Test `classifyMetricStatus` (4 boundaries) | 1 | COMP-01 | N/A | unit | `npx vitest run metrics` | ❌ W0 | ⬜ pending |
| Extract shared `getMetricStatus` util | 1 | COMP-01 | N/A | unit+types | `npx vitest run metrics && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| Test `getCessationPhase` (days 1/21/22/60/61/120/121/151+, injectable `now`) | 1 | COMP-01 | N/A | unit | `npx vitest run cessation` | ❌ W0 | ⬜ pending |
| Inject `now: Date` into cessation math | 1 | COMP-01 | N/A | unit+types | `npx vitest run cessation && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| Test `computePearson` (known + zero-denom + degenerate) | 1 | COMP-01 | N/A | unit | `npx vitest run pearson` | ❌ W0 | ⬜ pending |
| Generate migrations baseline | 2 | DATA-03 | N/A | infra | `drizzle-kit migrate --dry-run` exits 0; `remix-app/db/migrations/` committed | ❌ W0 | ⬜ pending |
| JWK spike + SET LOCAL leak test | 2 | (de-risks Phase 3) | tenant context must not leak across pooled txns | manual+script | see Manual-Only | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest` + `@vitest/...` installed in `remix-app/package.json`; `test` script added
- [ ] Vitest config (in `vite.config.ts` or fallback `vitest.config.ts`) — node env, `app/**/*.test.ts` include, `~/` alias preserved
- [ ] `npx vitest run` exits 0 on an empty suite (harness proven before tests are written)

*Contract-lock rule (from research): write each test against the current inline implementation FIRST (lock the contract green), THEN do the refactor and confirm the suite stays green.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Better-Auth JWT verified by Neon JWK; `tenantId`/`subjectId` readable via `current_setting()` in a txn | Phase-3 de-risk (spike) | One-time integration discovery against a throwaway Neon branch; not a permanent automated test | Run the spike script against a disposable Neon branch: issue a Better-Auth JWT (`jwt()` plugin → `/api/auth/token`), call `auth.jwt_session_init(token)` in a transaction, `SELECT current_setting('...')` for the claims; create one throwaway table + RLS policy and confirm row visibility flips with the claim. Record verdict (JWK-native vs `SET LOCAL`) in `01-SPIKE-FINDINGS.md`. Tear down the throwaway table/branch. |
| `SET LOCAL` vs bare `SET` — no cross-transaction leak | Phase-3 de-risk (spike) | Requires two sequential transactions on one pooled connection | In the spike: set claim with `SET LOCAL` in txn A, commit, open txn B on the same connection, confirm the claim is NOT visible. Repeat with bare `SET` to demonstrate the leak. Document. |

---

## Validation Sign-Off

- [x] All tasks have an automated verify OR a Wave 0 dependency (the spike is correctly classified manual — it is one-time discovery, not regression-guarded behavior)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers the missing test framework
- [x] No watch-mode flags (`vitest run`, not `vitest`)
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-07
