---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: First Client (practitioner-operated)
status: executing
stopped_at: Completed 01-06-PLAN.md
last_updated: "2026-06-14T19:55:59.471Z"
last_activity: 2026-06-14
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 7
  completed_plans: 6
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-14 — v1.0 milestone evolution)

**Core value:** Confidence-graded protocol-decision engine — heterogeneous diagnostics + genetics → personalized, evidence-weighted (K1–K4) protocol with honest uncertainty (not faked certainty)
**Current focus:** Phase 01 — client-onboarding-practitioner-operated

> ✅ **v1.0 — M1 Foundations shipped 2026-06-14.** 9 phases / 50 plans / 116 tasks; 27/29 requirements satisfied (COMP-02/03 deferred to the v1.1 compliance gate). Live at **https://zoetrop.vercel.app** (Vercel `zoetrop`/negentropico, standard Pro) on Neon `orange-paper-97068012`. Archived to `.planning/milestones/v1.0-*`; audit at `milestones/v1.0-MILESTONE-AUDIT.md`; tag `v1.0`. Gates green; integration 5/5 flows; prod healthy.
> **v1.1 roadmap RECUT 2026-06-14.** 5 phases, 12 requirements (ONB-01..04, ING-01..03, PRO-01, LIB-01..03, PROOF-01, POL-01). Replaces the stale "M1 Operations" (OPS-01..09 + COMP-02/03) plan, now parked as `v1.2-OPERATIONS-PLAN.md`. Spine: client onboarding (Phase 1) → data ingest (Phase 2) → library curation (Phase 3, parallelizable) → per-client protocol authoring (Phase 4) → first-client proof + polish (Phase 5).

## Current Position

Phase: 01 (client-onboarding-practitioner-operated) — EXECUTING
Plan: 7 of 7
Status: Ready to execute
Last activity: 2026-06-29 - Completed quick task 260629-h1h: B01 SSOT screen-kit (lo-fi/hi-fi/full from one data source)

```
v1.1 Progress: ░░░░░░░░░░░░░░░░░░░░ 0% (0/5 phases)
```

## Performance Metrics

**Velocity:**

- Total plans completed: 55 (v1.0 cumulative)
- Average duration: —
- Total execution time: —

**By Phase (v1.1):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | — | — | — |
| 02 | — | — | — |
| 03 | — | — | — |
| 04 | — | — | — |
| 05 | — | — | — |

**Recent Trend:** No v1.1 data yet

*Updated after each plan completion*
| Phase 01 P01 | 25 | 3 tasks | 8 files |
| Phase 01 P02 | 6 | 3 tasks | 12 files |
| Phase 01-client-onboarding-practitioner-operated P03 | 10min | 2 tasks | 4 files |
| Phase 01-client-onboarding-practitioner-operated P04 | 4min | 2 tasks | 3 files |
| Phase 01-client-onboarding-practitioner-operated P05 | 6min | 2 tasks | 7 files |
| Phase 01 P06 | 6min | 2 tasks | 3 files |

## Accumulated Context

### Roadmap Evolution

- v1.0 archived 2026-06-14: 9 phases (1–7 + 3.1/4.1), 50 plans, 116 tasks, 27/29 reqs. Full record in `milestones/v1.0-ROADMAP.md`.
- v1.1 roadmap created 2026-06-14 (first pass): 6 phases, 11 requirements (OPS-01..09 + COMP-02/03). Stale — replaced below.
- v1.1 roadmap RECUT 2026-06-14: replaced the multi-client "M1 Operations" plan. 5 phases, 12 requirements (ONB/ING/PRO/LIB/PROOF/POL). Multi-client work parked as v1.2; compliance gate (COMP-02/03) deferred into v1.2 (no longer a v1.1 phase). Phase numbering reset to 1.
- Phase 3 (library curation) is parallelizable with Phase 2 (data ingest) — both depend only on Phase 1 subject context.
- Phase 4 (protocol authoring) depends on both Phase 2 (ingest data) and Phase 3 (library rules) before the engine can produce a meaningful report draft.
- Phase 5 (first-client proof) depends on Phase 4 (full pipeline wired). WR-02/WR-03 security items fold into Phase 5 polish (not held to a separate compliance gate).
- Phase 03.1 residual UAT (invite-redemption private-window + client-role 403) gets real traffic in Phase 1 and closes there.

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

- [2026-06-14 ROADMAP RECUT]: v1.1 recut from multi-client "M1 Operations" to "First Client (practitioner-operated)". Multi-client operations (OPS scale/self-service/cadence/wearables), compliance gate (COMP-02/03), and the v1.1 compliance phase all parked to v1.2.
- [2026-06-14 MILESTONE CLOSE]: Close v1.0 as M1 Foundations; open v1.1 M1 Operations. (Still valid — just recut scope.)
- [Carried from v1.0]: Pilot-first PHI hardening: standard-tier infra + subscription API for the v1.1 single real client pilot. Compliance gate deferred to v1.2 (before first *external* client's PHI under a formal arrangement).
- [Carried from v1.0]: LLM provider BAA (Anthropic) deferred to v1.2 compliance gate. PHI extraction in v1.1 is for the owner acting as practitioner on one pilot client.
- [Carried from v1.0]: `SET LOCAL` + NOBYPASSRLS `app_user` RLS pattern is the tenancy mechanism (proven in v1.0 Phase 7).
- [Phase ?]: InferInsertModel<typeof subjects> for CreateSubjectData — enforces enum literals for biologicalSex/programType at compile time
- [Phase ?]: consentLog has no tenantId column — subjectId-only scope is correct for consent reads in checklist
- [Phase ?]: Invite lookup uses getDb() inside withTenantDb callback — intentional admin-path mixing; invites not subject-scoped under RLS
- [Phase ?]: Checklist strip inlined as 6 explicit spans for grep-c source-verifiability
- [Phase ?]: IDOR guard: subjectId re-resolved server-side before generateInvite

### Pending Todos

- [Phase 1]: Minimal active-subject context — practitioner can select owner or the one client; all PHI loaders scope to selected subject. (Thin slice — NOT the at-scale switcher.)
- [Phase 1 carry-forward]: Phase 03.1 residual UAT — invite-redemption end-to-end (private window) + client-role 403 (real client). Close when Phase 1 has real client traffic.
- [Phase 5]: WR-02 open-redirect (unvalidated `next` in `consent.tsx`) and WR-03 BYPASSRLS pdf read (`document.tsx`) — resolve during polish phase.
- [Code review — any phase]: WR-01 audit-log `?? 'owner'` role fallback + CR-01 `assignSubject` 23505 dead code — clear via `/gsd:code-review`.

### Blockers/Concerns

- [Phase 1 scope]: ONB-03 minimal active-subject context is a thin 2-subject slice — reuses existing per-invite tokens + subjects table. The at-scale subject-switcher UX is v1.2 scope; do not over-build here.
- [Phase 2 + 3 parallelize]: These phases share the same dependency (Phase 1) and can run concurrently if separate plans are tracked carefully.
- [Phase 4 dependency]: Protocol authoring requires both an ingested client record (Phase 2) and a curated library (Phase 3) before the engine can seed the draft. Plan Phase 4 after both are in place.
- [v1.2 carry]: COMP-02/03 compliance envelope (BAAs, pgAudit, host gate) still required before first *external* client's PHI — tracked in `v1.2-OPERATIONS-PLAN.md`, not here.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260610-q56 | Consolidated left sidebar nav chrome refactor (prototype port: rail+accordion+flyout, cookie collapse, mobile drawer, breadcrumbs, routes flatten + /ingest index fix) — branch `left-nav-refactor` | 2026-06-11 | f585795 | [260610-q56-refactor-app-chrome-to-consolidated-left](./quick/260610-q56-refactor-app-chrome-to-consolidated-left/) |
| 260610-rj2 | Merge breadcrumb into PageHeader meta row — crumb right-aligned on eyebrow line, ZOETROP segment dropped, single-segment crumbs suppressed | 2026-06-11 | ee771d4 | [260610-rj2-merge-breadcrumb-into-pageheader-meta-ro](./quick/260610-rj2-merge-breadcrumb-into-pageheader-meta-ro/) |
| 260610-rwg | Unify page headers — PageHeader icon/titleAccessory props; metrics category + detail migrated off hand-rolled headers | 2026-06-11 | 299c488 | [260610-rwg-unify-page-headers-extend-pageheader-ico](./quick/260610-rwg-unify-page-headers-extend-pageheader-ico/) |
| 260611-j6n | Design-roundtrip integration harness (unbundle/css-delta + RETURN-SPEC protocol) + round2 archive + round3 outbound package | 2026-06-11 | 19cad6e | [260611-j6n-design-roundtrip-integration-harness-rou](./quick/260611-j6n-design-roundtrip-integration-harness-rou/) |
| 260611-jq8 | Repo-wide rename Zoetrop→Zoetrop (all case variants, 95 files + round1 filename; includes wordmark rebrand edit) | 2026-06-11 | 1ed1ba6 | [260611-jq8-repo-wide-rename-zoetrop-to-zoetrop-all](./quick/260611-jq8-repo-wide-rename-zoetrop-to-zoetrop-all/) |
| 260611-py7 | Canonical platform history doc — docs/HISTORY.md (Bwell vault origins → Tracker/Astro → Remix/Neon → Zoetrop platform pivot → GSD M1) + CLAUDE.md pointer | 2026-06-11 | d90fc96 | [260611-py7-canonical-platform-history-doc-docs-hist](./quick/260611-py7-canonical-platform-history-doc-docs-hist/) |
| 260612-d8s | Round3 self-rendering design package (build-free prototype: left-nav chrome + Part A screens + Recharts idiom + theme toggle; README/BRIEF re-pointed off basic-auth preview) + 50 light/dark reference screenshots of live app | 2026-06-12 | 837dd96 | [260612-d8s-round3-self-rendering-design-package-ref](./quick/260612-d8s-round3-self-rendering-design-package-ref/) |
| 260620-rd4 | round5 LINE-signature design integration (Phase 5) — spiral/phyllotaxis "signature" layer (motif watermark · "the settle" φ-stagger motion · paper grain · branded chart empty/loading · frame-dot iconography) across dashboard·metric-detail·metrics; within-LOCK, **zero token delta**; 3 atomic commits, build green | 2026-06-20 | b0705ae | [260620-rd4-r5-signature-integrate](./quick/260620-rd4-r5-signature-integrate/) |
| 260629-h1h | B01 "System & surfaces" service-blueprint boards rebuilt onto a single SSOT screen-kit (`design-bridge/diagrams/_kit/zoetrop/` — AppScreen.jsx + screens.B01.js + app-screen.css, DC-runtime), modeled on the Stripe Atlas kit. lo-fi/hi-fi/full now render from ONE data source (contentType×fidelity matrix, shell defined once); full tier = real app views (TopBar+Sidebar+PageHeader, native 1280×800 scaled). Navigator-verified light+dark; **dark-theme root-scoping fix** + Inter-link cleanup (7209f92) | 2026-06-29 | 798a257 | [260629-h1h-rebuild-b01-service-blueprint-boards-ont](./quick/260629-h1h-rebuild-b01-service-blueprint-boards-ont/) |

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v1.2 | COMP-02/03 — compliance envelope & host gate (BAAs, host cost/BAA, pgAudit/SELECT-logging) | Parked → v1.2 | v1.1 recut 2026-06-14 |
| v1.1 Phase 1 | Phase 03.1 invite-redemption E2E (private window) + client-role 403 (real client) | Active — close in Phase 1 when real traffic flows | v1.0 close |
| v1.1 Phase 5 | WR-02 open-redirect, WR-03 BYPASSRLS pdf read (security) | Active — resolve in Phase 5 polish | v1.0 close |
| code-review | WR-01 audit-log role fallback, CR-01 assignSubject dead code | Active — clear via /gsd:code-review | v1.0 close |
| v1.2 | Multi-client at scale, subject-switcher UX, client self-service | Parked → v1.2 | v1.1 recut 2026-06-14 |
| v1.2 | Cadence + monitoring (review-due surfacing, 4-week iteration flow) | Parked → v1.2 | v1.1 recut 2026-06-14 |
| v1.2 | Apple Watch + Oura ingest | Parked → v1.2 | v1.1 recut 2026-06-14 |
| v1.2 | Google Drive doc storage, PureInsight API | Parked → v1.2 | v1.1 recut 2026-06-14 |
| nyquist | Partial/missing VALIDATION.md (phases 02/03/04.1/05/03.1/07) | Discovery-only; optional retro-fill | v1.0 close |
| M2 | Client-facing branded app | Deferred | M1 scope definition |
| M2+ | Training / Nutrition / Modalities delivery surfaces | Deferred | M1 scope definition |
| M3 | Multi-tenant productization / engine-as-product | Deferred | M1 scope definition |

## Session Continuity

Last session: 2026-06-14T19:55:59.468Z
Stopped at: Completed 01-06-PLAN.md
Resume file: None

## Operator Next Steps

- `/gsd:plan-phase 1` — plan Phase 1 (Client Onboarding: practitioner-operated)
