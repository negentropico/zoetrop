---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: M1 Operations
status: active
last_updated: "2026-06-14"
last_activity: 2026-06-14
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-14 — v1.0 milestone evolution)

**Core value:** Confidence-graded protocol-decision engine — heterogeneous diagnostics + genetics → personalized, evidence-weighted (K1–K4) protocol with honest uncertainty (not faked certainty)
**Current focus:** v1.1 — M1 Operations — Phase 1: Client Lifecycle (next)

> ✅ **v1.0 — M1 Foundations shipped 2026-06-14.** 9 phases / 50 plans / 116 tasks; 27/29 requirements satisfied (COMP-02/03 deferred to the v1.1 compliance gate). Live at **https://zoetrop.vercel.app** (Vercel `zoetrop`/negentropico, standard Pro) on Neon `orange-paper-97068012`. Archived to `.planning/milestones/v1.0-*`; audit at `milestones/v1.0-MILESTONE-AUDIT.md`; tag `v1.0`. Gates green; integration 5/5 flows; prod healthy.
> **v1.1 roadmap created 2026-06-14.** 6 phases, 11 requirements (OPS-01..09 + COMP-02/03). Spine: subjects become real (Phase 1) → onboard-a-client data (Phase 2) → per-client protocol authoring + cadence (Phase 3) → WHOOP persist (Phase 4) → E2E proof slice (Phase 5) → compliance gate (Phase 6).

## Current Position

Phase: 1 — Client Lifecycle: Subjects Become Real
Plan: —
Status: Not started
Last activity: 2026-06-14 — v1.1 roadmap created

```
v1.1 Progress: ░░░░░░░░░░░░░░░░░░░░ 0% (0/6 phases)
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
| 06 | — | — | — |

**Recent Trend:** No v1.1 data yet

*Updated after each plan completion*

## Accumulated Context

### Roadmap Evolution

- v1.0 archived 2026-06-14: 9 phases (1–7 + 3.1/4.1), 50 plans, 116 tasks, 27/29 reqs. Full record in `milestones/v1.0-ROADMAP.md`.
- v1.1 roadmap created 2026-06-14: 6 phases, 11 requirements (OPS-01..09 + COMP-02/03). Phase numbering reset to 1. Phase sequence determined by the user (authoritative); roadmapper formalized goals/criteria/coverage.
- Phase 4 (instrument continuity) is parallelizable with Phases 2–3 — depends only on Phase 1.
- Phase 6 (compliance gate) can only fire after Phase 5 (proof slice) — coherent because a real client must exist before the pre-client gate triggers.
- Phase 03.1 residual UAT (invite-redemption private-window + client-403) carries into Phase 1 and closes when real client traffic flows.
- Phase-7 security warnings WR-02 (open-redirect) and WR-03 (BYPASSRLS pdf read) fold into Phase 6 compliance gate; WR-01 and CR-01 to clear via `/gsd:code-review`.

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

- [2026-06-14 MILESTONE CLOSE]: Close v1.0 as M1 Foundations; open v1.1 M1 Operations. Phase 8 (compliance envelope) re-homes as v1.1 Phase 6 — coherent because the gate can only fire once a real client can exist (after the proof slice).
- [Carried from v1.0]: Pilot-first PHI hardening: standard-tier infra + subscription API until Phase 6. HIPAA/BAA/RLS enforcement gate fires before the first external client's PHI (now v1.1 Phase 6).
- [Carried from v1.0]: LLM provider BAA (Anthropic) deferred to Phase 6. External-client PHI extraction blocked until then.
- [Carried from v1.0]: Neon host: stay on Neon for v1.1 with host-portable GUC RLS. Host/BAA comparison (Phase 6) decides whether to migrate before the first external client.
- [Carried from v1.0]: `SET LOCAL` + NOBYPASSRLS `app_user` RLS pattern is the tenancy mechanism (proven in v1.0 Phase 7).

### Pending Todos

- [Phase 1]: Parameterize the hardwired `getOwnerSubject` call across all 13 PHI loaders + ingest + reports — largest surface change in v1.1.
- [Phase 1 carry-forward]: Phase 03.1 residual UAT — invite-redemption end-to-end (private window) + client-role 403 (real client). Close when Phase 1 has real client traffic.
- [Phase 6 carry-forward]: WR-02 open-redirect (unvalidated `next` in `consent.tsx`) and WR-03 BYPASSRLS pdf read (`document.tsx`) — security items; fold into Phase 6 compliance gate.
- [Phase 6 carry-forward]: WR-01 audit-log `?? 'owner'` role fallback + CR-01 `assignSubject` 23505 dead code — clear via `/gsd:code-review` before or during Phase 6.

### Blockers/Concerns

- [Phase 1 risk]: Parameterizing `getOwnerSubject` across 13 PHI loaders is broad; ensures no loader is missed and isolation tests confirm correctness.
- [Phase 6 gate]: LLM provider BAA (Anthropic HIPAA-Ready) + Neon/Vercel BAAs + pgAudit verification + host decision — all required before first external client PHI. NOT a blocker for the single-user pilot or v1.1 Phases 1–5.
- [Phase 4 note]: Vault import (`import/vault`) decision deferred in v1.1 — Phase 4 decides whether to include or defer.

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

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v1.1 Phase 6 | COMP-02/03 — compliance envelope & host gate (BAAs, host cost/BAA, pgAudit/SELECT-logging) | Active — v1.1 Phase 6 | v1.0 close |
| v1.1 Phase 1 | Phase 03.1 invite-redemption E2E (private window) + client-role 403 (real client) | Active — close in Phase 1 when real traffic flows | v1.0 close |
| v1.1 Phase 6 | WR-02 open-redirect, WR-03 BYPASSRLS pdf read (security) | Active — fold into Phase 6 | v1.0 close |
| v1.1 code-review | WR-01 audit-log role fallback, CR-01 assignSubject dead code | Active — clear via code-review | v1.0 close |
| nyquist | Partial/missing VALIDATION.md (phases 02/03/04.1/05/03.1/07) | Discovery-only; optional retro-fill | v1.0 close |
| M2 | Client-facing branded app | Deferred | M1 scope definition |
| M2+ | Training / Nutrition / Modalities delivery surfaces | Deferred | M1 scope definition |
| M3 | Multi-tenant productization / engine-as-product | Deferred | M1 scope definition |

## Session Continuity

Last session: 2026-06-14
Stopped at: v1.1 roadmap created — 6 phases, 11 requirements. ROADMAP.md, STATE.md, REQUIREMENTS.md (traceability) all written.
Resume file: .planning/ROADMAP.md (v1.1 Phase 1 — Client Lifecycle: Subjects Become Real — next)

## Operator Next Steps

- `/gsd:plan-phase 1` — plan Phase 1 (Client Lifecycle: Subjects Become Real)
