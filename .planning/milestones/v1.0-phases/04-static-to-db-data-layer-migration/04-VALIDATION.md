---
phase: 4
slug: static-to-db-data-layer-migration
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-10
audited: 2026-06-10
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8 |
| **Config file** | `remix-app/vite.config.ts` (test block with `include: ["app/**/*.test.ts", "tests/**/*.test.ts"]`) |
| **Quick run command** | `cd remix-app && npm test` |
| **Full suite command** | `cd remix-app && npm test` (with `DATABASE_URL` exported for live-Neon suites) |
| **Estimated runtime** | ~2s without DB; ~5s with live-Neon suites enabled |

> Live-Neon suites (`tests/db/*`, `tests/parity/*`) are skip-guarded: they run only when `DATABASE_URL`/`DATABASE_URL_UNPOOLED` is set (or skip when `DB_URL_STUBBED` is set). `.env` contains `&` in connection strings — export vars explicitly rather than `source .env`.

---

## Sampling Rate

- **After every task commit:** Run `cd remix-app && npm test`
- **After every plan wave:** Run `cd remix-app && npm test` + `npm run typecheck`
- **Before `/gsd:verify-work`:** Full suite green + `npm run build` (no PHI grep failures)
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-04 T2, 04-06 T1–T2 | 02/04/06 | 1+2 | DATA-01 | T-4-PHI | Loaders return tenant-scoped DB-backed data only; `getCessationDay` reads DB startDate | integration/parity + unit + lint gate | `npm test` (tests/parity/loader-parity.test.ts — 13 assertions; protocol-data.test.ts — 21 unit; eslint no-restricted-imports gate) | ✅ | ✅ green |
| 04-03 T1–T3 | 03 | 1 | DATA-02 | — | Owner's M0 data present as rows under owner tenant/subject | integration (introspection) | `npm test` (tests/db/data-seed.test.ts — row counts: metrics 77, protocol_versions 7, supplements 17, correlations 9, cessation_log 1, subject_genotypes 16) | ✅ | ✅ green |
| 04-05 T1–T3, 04-07 T1–T3 | 05/07 | 1+2 | DATA-04 | T-4-PHI | No PHI strings in Vercel build client bundle | manual build grep | manual-only (see below — committed grep markers would re-embed PHI in source) | manual | ✅ verified 2026-06-10 |
| 04-01 T1–T2 | 01/02 | 1 | DATA-05 | — | `sync_status`/`sync_version` columns absent; `is_active` boolean; tsc zero errors | schema introspection + typecheck | `npm run typecheck` + `npm test` (tests/db/schema-columns.test.ts) | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/parity/loader-parity.test.ts` — parity assertions for all 13 rewired loaders (DATA-01) — scaffolded plan 01, filled plan 04
- [x] `tests/parity/capture-fixtures.ts` — one-shot PHI fixture capture script — created plan 03, retired (deleted) plan 05 after fixtures captured
- [x] `tests/db/data-seed.test.ts` — row-count introspection per table, skip-guarded on DATABASE_URL (DATA-02) — scaffolded plan 01, filled plan 03
- [x] `tests/fixtures/` entry in `remix-app/.gitignore` — landed plan 01 before any fixture capture (PHI)
- [x] Extend `tests/db/schema-columns.test.ts` — asserts `sync_status`/`sync_version` absent, `is_active` boolean (DATA-05)

*(`tests/db/constraints.test.ts` and `tests/db/schema-columns.test.ts` exist from Phase 3 and establish the live-Neon skip-guard pattern these extend.)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard renders same data as M0 | DATA-02 | Visual parity spot-check is human judgment | Owner opens dashboard + metrics/protocol/insights pages, compares against pre-migration rendering. **Done — owner approved 2026-06-10 (plan 04-04 checkpoint).** |
| PHI grep against build artifact | DATA-04 | Committing PHI marker strings into a test file would re-embed PHI into source — the exact thing plans 05/07 deleted. Grep must use ephemeral markers known to the owner. | Run `npm run build`, grep client bundle for known PHI markers (owner metric values, genotype strings). **Done — bundle re-scanned after plan 04-07; zero matches (VERIFICATION.md SC-3).** |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved — validation audit 2026-06-10

---

## Validation Audit 2026-06-10

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Audit notes: all 4 phase requirements cross-referenced against the live test suite. Full suite run: 181 tests — 139 green without DB, 42 live-Neon tests green with `DATABASE_URL` exported (data-seed, loader-parity, schema-columns, constraints). DATA-04 remains manual-only by design (PHI markers cannot be committed); final grep sign-off recorded in 04-VERIFICATION.md SC-3. No new tests required.
