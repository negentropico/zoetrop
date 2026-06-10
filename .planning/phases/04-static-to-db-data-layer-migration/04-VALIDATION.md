---
phase: 4
slug: static-to-db-data-layer-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-10
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
| **Full suite command** | `cd remix-app && npm test` (same — no separate slow suite defined yet) |
| **Estimated runtime** | ~30 seconds (live-Neon tests skip-guarded on DATABASE_URL) |

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
| TBD | TBD | TBD | DATA-01 | T-4-PHI | Loaders return tenant-scoped DB-backed data only | integration/parity | `npm test` (tests/parity/loader-parity.test.ts, skip-guarded on DATABASE_URL) | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DATA-02 | — | Owner's M0 data present as rows under owner tenant/subject | integration (introspection) | `npm test` (tests/db/data-seed.test.ts row counts per table) | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DATA-04 | T-4-PHI | No PHI strings in Vercel build client bundle | CI grep + manual | `npm run build && grep -r "realBloodWork\|metabolic-glucose" remix-app/build/client/` — fails if match found | manual | ⬜ pending |
| TBD | TBD | TBD | DATA-05 | — | `sync_status`/`sync_version` columns absent; `is_active` boolean; tsc zero errors | schema introspection + typecheck | `npm run typecheck` + `npm test` (tests/db/schema-columns.test.ts extended) | ❌ W0 ext | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*(Planner fills Task IDs when PLAN.md files are created.)*

---

## Wave 0 Requirements

- [ ] `tests/parity/loader-parity.test.ts` — parity assertions for all rewired loaders (DATA-01)
- [ ] `tests/parity/capture-fixtures.ts` — one-shot PHI fixture capture script (gitignored output, not a test)
- [ ] `tests/db/data-seed.test.ts` — row-count introspection per table, skip-guarded on DATABASE_URL (DATA-02)
- [ ] `tests/fixtures/` entry in `remix-app/.gitignore` — MUST land before any fixture is captured (PHI)
- [ ] Extend `tests/db/schema-columns.test.ts` — assert `sync_status`/`sync_version` absent, `is_active` boolean (DATA-05)

*(`tests/db/constraints.test.ts` and `tests/db/schema-columns.test.ts` exist from Phase 3 and establish the live-Neon skip-guard pattern these extend.)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dashboard renders same data as M0 | DATA-02 | Visual parity spot-check is human judgment | Owner opens dashboard + metrics/protocol/insights pages, compares against pre-migration rendering |
| PHI grep against build artifact | DATA-04 | Build-output inspection; grep is automatable in CI but final sign-off is human | Run `npm run build`, grep client bundle for known PHI markers (owner metric values, genotype strings) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
