---
phase: 6
slug: engine-promotion-confidence-graded-reports
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-11
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `06-RESEARCH.md` §"Validation Architecture". Per-task map filled by the planner.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8 |
| **Config file** | `remix-app/vite.config.ts` §test |
| **Quick run command** | `cd remix-app && npm test` (`vitest run`) |
| **Full suite command** | `cd remix-app && npm test` (same — no separate slow suite) |
| **Estimated runtime** | ~30 seconds (DB-gated tests skip-guarded on real `DATABASE_URL_UNPOOLED`) |

---

## Sampling Rate

- **After every task commit:** Run `cd remix-app && npm test`
- **After every plan wave:** Run `cd remix-app && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green — including DB-gated non-null K assertions after `db:migrate`
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

> Planner fills task IDs/waves. Requirement → test mapping is locked from research below.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | ENG-01 | — | engine.ts has zero Drizzle/Remix imports; loads in bare Node | unit / import-purity | `npm test` | ❌ W0 (`tests/lib/engine.test.ts`) | ⬜ pending |
| TBD | TBD | TBD | ENG-01 | — | classifyMetricStatus ≡ getMetricStatus (all boundary cases) | unit | `npm test` | ✅ (re-point `metrics.test.ts`) | ⬜ pending |
| TBD | TBD | TBD | ENG-01 | — | getCessationPhase/getCessationDay behavior preserved | unit | `npm test` | ✅ (re-point `protocol-data.test.ts`) | ⬜ pending |
| TBD | TBD | TBD | ENG-01 | — | computePearson behavior preserved | unit | `npm test` | ✅ (re-point `seed-data.test.ts`) | ⬜ pending |
| TBD | TBD | TBD | ENG-02 | — | `COUNT(*) FROM genetic_variants WHERE confidence IS NULL = 0` | db / SQL assertion | `npm test` (DB-gated) | ❌ W0 (`tests/db/corpus-schema.test.ts`) | ⬜ pending |
| TBD | TBD | TBD | ENG-02 | — | `COUNT(*) FROM variant_protocol_map WHERE evidence_tier IS NULL = 0` | db / SQL assertion | `npm test` (DB-gated) | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | ENG-02 | — | `COUNT(*) FROM metric_protocol_map WHERE evidence_tier IS NULL = 0` | db / SQL assertion | `npm test` (DB-gated) | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | ENG-03 | — | mapVariantToProtocol: synthetic genotype + corpus → expected recs | unit | `npm test` | ❌ W0 (`tests/lib/engine.test.ts`) | ⬜ pending |
| TBD | TBD | TBD | ENG-03 | — | metric rule eval: deficient metric → correct rec from metricProtocolMap | unit | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | RPT-01 | T-06 (IDOR) | generateReport returns reportId; reports row exists with tenant/subject scope | integration | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | RPT-02 | — | every snapshot recommendation carries evidenceTier (K visible) | unit | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | RPT-03 | T-06 (Regulatory) | no imperative patterns in corpus recommendationText | unit (corpus lint) | `npm test` | ❌ W0 (`tests/lib/corpus-lint.test.ts`) | ⬜ pending |
| TBD | TBD | TBD | RPT-03 | — | DisclaimerCallout hard-codes exact K4 disclaimer string | static/source assertion | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | RPT-03 | — | K4 recs render disclaimer (`evidenceTier === 'k4'` check) | unit | `npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `remix-app/app/types/report.ts` — `ReportSnapshot`, `GradedRecommendation` type definitions (required by engine + report-generator)
- [ ] `tests/lib/engine.test.ts` — import-purity + `mapVariantToProtocol` + metric-rule unit tests; re-pointed existing function tests
- [ ] `tests/lib/corpus-lint.test.ts` — imperative-pattern lint + K4 disclaimer source assertion
- [ ] `tests/db/corpus-schema.test.ts` — non-null K assertions (`COUNT(*) WHERE evidence_tier IS NULL = 0`) + DB-skip-guard on `DATABASE_URL_UNPOOLED`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Generated report renders K-levels inline in the visible body at `/reports/:id` | RPT-02 | Visual confirmation against UI-SPEC (inline, not tooltip/footer) | Generate a report for the owner subject, open `/reports/:id`, confirm each recommendation shows `K{N} ({label}): {text}` in the body |
| Corpus content is owner-complete & evidence-tiering is defensible | ENG-02 | Human-review gate on LLM-extracted content (D-11/D-19) | Reviewer cross-checks extracted findings against owner's PureInsights/SelfDecode/labs PDFs before seed |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
