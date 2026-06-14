# Zoetrop — Living Retrospective

## Milestone: v1.0 — M1 Foundations

**Shipped:** 2026-06-14
**Phases:** 9 (1–7 + inserted 3.1/4.1) | **Plans:** 50 | **Tasks:** 116 | **Requirements:** 27/29

### What Was Built
The engine-first platform foundation: Better-Auth identity + owner/practitioner/client roles, tenant/subject scoping with host-portable GUC RLS on 16 PHI tables, a live Neon data layer (static-TS retired), a lab-ingest → grounded-review → approve pipeline with consent + PHI-free audit, a pure confidence-graded engine + first-class genetics/rule corpus, and a deterministic K1–K4 lab→protocol report generator — all in-brand via the adopted design system, live at zoetrop.vercel.app on n=1 owner data.

### What Worked
- **Pilot-first re-scope (2026-06-08).** Deferring PHI *hardening* (BAAs/HIPAA/RLS-enforcement) to a pre-client gate unblocked Phases 2–6 on standard-tier infra while still adding tenant/subject *columns* in Phase 3 — so the Phase 7 RLS retrofit was non-breaking. Decoupling the gate from build velocity was the single highest-leverage call.
- **Expand-contract migrations on live Neon** (nullable → backfill → NOT NULL), journal-split to dodge the backfill-before-spine guardrail. Tenancy landed on production data without a rebuild.
- **Purity enforced by gates, not vigilance.** `engine.ts` no-Drizzle/Remix imports + the `.server`-bundle-leak build gate + the `*-data.ts` ESLint rule caught regressions that typecheck/tests alone missed.
- **Safety-first lab review:** per-field approve/edit/reject with no bulk-approve, every write behind `assertSubjectAccess` + PHI-free audit in one transaction.
- **Design roundtrip harness** (unbundle/css-delta + RETURN-SPEC) made the brand adoption repeatable instead of hand-decoding bundler HTML.

### What Was Inefficient
- **Tracking drift accumulated silently.** REQUIREMENTS checkboxes (AUTH-03/04, TEN-02/03, LAB-04), STATE narrative notes, and the milestone audit all lagged reality — the 2026-06-08 audit still read "5 of 7 phases not executed" at close. Required a dedicated truth-reconciliation pass before this milestone could close cleanly.
- **GSD out-of-sequence `phase.complete`** repeatedly mis-pointed "next" after the inserted 3.1/4.1 and early-executed phases — corrected by hand each time.
- **Duplicated fix work:** the design-r35 adoption re-implemented fixes that also lived on an abandoned `fix/04.1-design-critique` branch; reconciling required verifying the branch was 100% superseded.

### Patterns Established
- Pilot-first deferral gate (HIPAA/BAA obligations attach to *others'* PHI; gate before the first external client).
- Host-portable GUC-based RLS under a NOBYPASSRLS role + `withTenantDb` SET LOCAL wrapper (no host lock-in).
- Confidence-under-uncertainty (K1–K4) as a first-class, non-null schema + visible-UI concept.
- Atomic RLS retrofit rehearsed on a Neon branch; enable + policies in one migration.

### Key Lessons
- **Reconcile tracking at every phase close, not at the milestone.** The drift was cheap to prevent and expensive to clean.
- **The milestone boundary earns its keep.** The forced Core-Value recheck surfaced the structural gap the build had been compounding: the platform scopes everything to a hardwired owner subject — "subjects become real" (a practitioner runs a *real* client) is the actual M1 exit, and it's v1.1's spine.
- **A deferred gate must be able to fire.** Phase 8 ("plan when the first external client is imminent") could never trigger because no client could exist; re-homing it after the v1.1 operations slice makes the gate coherent.

### Cost Observations
- Model mix: predominantly Sonnet execution with Opus orchestration/review; concurrent sessions on a shared tree (commit hygiene required explicit staging).
- Notable: heavy reliance on live-Neon verification (DB introspection tests, real migrations) over mocks — slower per-step but caught empty-DB and pooled-connection realities the plans assumed away.

## Cross-Milestone Trends

| Milestone | Phases | Plans | Reqs | Shipped |
|-----------|--------|-------|------|---------|
| v1.0 M1 Foundations | 9 | 50 | 27/29 | 2026-06-14 |
