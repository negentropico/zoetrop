---
phase: 1
slug: schema-baseline-engine-tests-auth-spike
status: audited
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-07
audited: 2026-06-07
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> **Audited 2026-06-07** against the 5 executed plans — statuses reflect live test runs, not predictions.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8 (installed — 01-01) |
| **Config file** | `remix-app/vite.config.ts` (`test` block; node env, `passWithNoTests: true`, `setupFiles: ./app/test-setup.ts`) |
| **Quick run command** | `cd remix-app && npx vitest run` |
| **Full suite command** | `cd remix-app && npx vitest run` |
| **Measured runtime** | ~0.6s for the 3 engine suites (39 tests, no DB) |
| **Migration guard** | `cd remix-app && npx drizzle-kit check` (DB-free journal/snapshot consistency; exit 0) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run` (and `npx tsc --noEmit` for the refactor tasks)
- **After every plan wave:** Run `npx vitest run` full suite
- **Before `/gsd:verify-work`:** Full suite green + `npx drizzle-kit check` clean
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

> Aligned to the executed PLAN/SUMMARY task numbering. Statuses verified by live run on 2026-06-07.

| Task | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|------|------|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| Install Vitest + config (empty run exits 0) | 01-01 | 0 | COMP-01 | N/A | infra | `npx vitest run` exits 0 (passWithNoTests) | ✅ | ✅ green |
| Test `getMetricStatus` (4 outcomes + ref/optimal boundaries + fallback quirk) | 01-04 | 1 | COMP-01 | N/A | unit | `npx vitest run metrics` | ✅ `app/lib/metrics.test.ts` | ✅ green (11) |
| Extract shared `getMetricStatus` util (no inline copies) | 01-04 | 1 | COMP-01 | N/A | unit+types | `npx vitest run metrics && npx tsc --noEmit` | ✅ `app/lib/metrics.ts` | ✅ green |
| Test `getCurrentCessationPhase` (days -5/0/1/21/22/60/61/120/121/150/151, injectable `now`) | 01-05 | 1 | COMP-01 | N/A | unit | `npx vitest run protocol-data` | ✅ `app/lib/protocol-data.test.ts` | ✅ green (21) |
| Inject `now: Date` into `getCessationDay` | 01-05 | 1 | COMP-01 | N/A | unit+types | `npx vitest run protocol-data && npx tsc --noEmit` | ✅ `app/lib/protocol-data.ts` | ✅ green |
| Test `calculatePearsonCorrelation` (known + zero-denom + degenerate) | 01-05 | 1 | COMP-01 | N/A | unit | `npx vitest run seed-data` | ✅ `app/lib/seed-data.test.ts` | ✅ green (7) |
| Generate + commit migrations baseline | 01-02 | 2 | DATA-03 | N/A | infra | `npx drizzle-kit check` exits 0; `remix-app/migrations/` committed | ✅ `migrations/0000_light_blue_shield.sql` + `meta/` | ✅ green |
| JWK spike + SET LOCAL leak test | 01-03 | 2 | (de-risks Phase 3) | tenant context must not leak across pooled txns | manual+script | see Manual-Only | ✅ `01-SPIKE-FINDINGS.md` | ✅ resolved (manual) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `vitest` + `@vitest/coverage-v8` installed in `remix-app/package.json`; `test`/`test:watch` scripts added
- [x] Vitest config in `vite.config.ts` — node env, `app/**/*.test.{ts,tsx}` include, `~/` alias preserved, `passWithNoTests: true`
- [x] `npx vitest run` exits 0 on an empty suite (harness proven before tests were written)

*Contract-lock rule (from research): write each test against the current inline implementation FIRST (lock the contract green), THEN do the refactor and confirm the suite stays green. Applied in 01-04 (getMetricStatus extracted verbatim, 11 cases green before and after).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Better-Auth JWT verified by Neon JWK; `tenantId`/`subjectId` readable via `current_setting()` in a txn | Phase-3 de-risk (spike) | One-time integration discovery against a throwaway Neon branch; not a permanent automated test | Run the spike against a disposable Neon branch: set `request.jwt.claims` via `SET LOCAL`, confirm `auth.session()`/`current_setting('request.jwt.claims')` read it, create a throwaway table + RLS policy under a NOBYPASSRLS role, confirm row visibility flips with the claim. Record verdict in `01-SPIKE-FINDINGS.md`. Tear down. **Verdict recorded: SET LOCAL + RLS (D-04 path); JWK-native deferred (needs Neon Authorize).** |
| `SET LOCAL` vs bare `SET` — no cross-transaction leak | Phase-3 de-risk (spike) | Requires two sequential transactions on one pooled connection | In the spike: set claim with `SET LOCAL` in txn A, commit, open txn B on the same connection, confirm the claim is NOT visible. Repeat with bare `SET` to demonstrate the leak. **Confirmed: SET LOCAL isolates, bare SET leaks (D-05).** |

---

## Validation Sign-Off

- [x] All tasks have an automated verify OR a Wave 0 dependency (the spike is correctly classified manual — one-time discovery, not regression-guarded behavior)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers the missing test framework
- [x] No watch-mode flags (`vitest run`, not `vitest`)
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-07

---

## Validation Audit 2026-06-07

| Metric | Count |
|--------|-------|
| Requirements audited | 2 (COMP-01, DATA-03) + 1 manual (spike) |
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |

**Findings:**
- **COMP-01 — fully Nyquist-compliant.** 3 engine suites / 39 tests green in ~0.6s (`npx vitest run`). Every predicted boundary (status outcomes + ref/optimal edges + fallback quirk; cessation day/phase boundaries with injected `now`; Pearson degenerate cases) is present and targets real behavior. Test files committed during execution (01-04, 01-05).
- **DATA-03 — gap resolved (contract correction).** The original contract listed `drizzle-kit migrate --dry-run` as the automated command, but that flag does not exist in drizzle-kit 0.31.8 (discovered in 01-02). Replaced with `npx drizzle-kit check` — verified DB-free, exit 0 (`Everything's fine`), guards the real recurring risk (schema↔migration snapshot drift). No new test file required; the guard is a built-in command.
- **Spike (01-03) — correctly Manual-Only.** One-time discovery on a disposable Neon branch; throwaway code deleted, verdict + Phase-3 implications recorded in `01-SPIKE-FINDINGS.md`. Not regression-guardable by design.

**Result:** Phase 1 is Nyquist-compliant. All requirements have automated verification (`vitest run` for COMP-01, `drizzle-kit check` for DATA-03); the spike is the only manual-only item and is correctly classified.
