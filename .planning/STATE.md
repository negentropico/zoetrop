---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 4 context gathered
last_updated: "2026-06-10T18:10:59.931Z"
last_activity: 2026-06-10 -- Phase 04 planning complete
progress:
  total_phases: 9
  completed_phases: 5
  total_plans: 34
  completed_plans: 32
  percent: 56
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-07)

**Core value:** Confidence-graded protocol-decision engine — heterogeneous diagnostics + genetics → personalized, evidence-weighted (K1–K4) protocol with honest uncertainty (not faked certainty)
**Current focus:** Phase 04 — static-to-db-data-layer-migration

> Note: Phases 1, 2, 3, 3.1, and 4.1 are complete (3.1 completed 2026-06-10). Phase 4.1 (design system) was executed early on 2026-06-08, so the next incomplete phase is **Phase 4 (Static-to-DB Data Layer Migration)**, NOT 4.1 — `phase.complete` mis-pointed to 4.1 and this was corrected by hand. Phase 2 was re-scoped (pilot-first, 2026-06-08) to "Vercel Cutover + Pilot Deploy Baseline" and closed: the app is **live at https://zoetrop.vercel.app** (Vercel project `zoetrop` on team negentropico, standard Pro — no HIPAA add-on) against the existing Neon project `orange-paper-97068012` (8 M0 tables, connectivity confirmed). PHI/BAA/HIPAA/RLS hardening deferred to new **Phase 7**. Engine-first critical path resumes at **Phase 3 (Identity + Tenancy Scoping)** — no BAA gate.
> ✓ 04.1-09 grid-blowout gap-closure complete + **browser-verified** (16/16 routes overflow-free; R3 by concurrent session; 04.1-HUMAN-UAT recorded).

## Current Position

Phase: 04 (static-to-db-data-layer-migration) — EXECUTING
Plan: 1 of 5
Status: Ready to execute
Last activity: 2026-06-10 -- Phase 04 planning complete

Progress: [█████████░] 93%

## Performance Metrics

**Velocity:**

- Total plans completed: 31
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 5 | - | - |
| 04.1 | 9 | - | - |
| 02 | 4 | - | - |
| 03 | 5 | - | - |
| 03.1 | 4 | - | - |

**Recent Trend:** No data yet

*Updated after each plan completion*
| Phase 04.1-design-system-adoption P01 | 3min | 3 tasks | 3 files |
| Phase 04.1 P02 | 8min | 3 tasks | 11 files |
| Phase 04.1 P03 | 384 | 3 tasks | 16 files |
| Phase 04.1 P05 | 356 | 3 tasks | 5 files |
| Phase 04.1 P06 | 338 | 3 tasks | 7 files |
| Phase 04.1 P07 | 7m | 3 tasks | 8 files |
| Phase 04.1-design-system-adoption P08 | 1m | 1 tasks | 1 files |
| Phase 02 P02-02 | 133 | 2 tasks | 3 files |
| Phase 02 P02-01 | 69s | 2 tasks | 4 files |
| Phase 04.1 P09 (gap-closure) | 6m | 3 tasks | 14 files |
| Phase 03-identity-tenancy-scoping P02 | 401 | 3 tasks | 7 files |
| Phase 03-identity-tenancy-scoping P01 | 9min | 3 tasks | 9 files |
| Phase 03-identity-tenancy-scoping P03 | 403s | 2 tasks | 8 files |
| Phase 03-identity-tenancy-scoping P04 | ~35m | 3 tasks | 8 files |
| Phase 03-identity-tenancy-scoping P05 | 9min | 3 tasks | 24 files |
| Phase 03.1 P01 | 15min | 3 tasks | 8 files |

## Accumulated Context

### Roadmap Evolution

- Phase 04.1 inserted after Phase 4: Design System Adoption — bridge Zoetrope brand tokens into Tailwind, port signature components to TSX, retrofit M0 screens, commit binding UI-SPEC.md; gated on a claude.ai/design roundtrip (see docs/DESIGN-SYSTEM-ADOPTION.md)

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [2026-06-08 RE-SCOPE]: Pilot-first — PHI hardening (Neon HIPAA + Neon/Vercel/LLM BAAs + pgAudit verification + RLS enforcement/isolation) deferred to new **Phase 7 (Pre-Client Gate)**, triggered before the first external client's PHI. SUPERSEDES the "Phase 2 BAA gate blocks Phase 3/5" chain.
- [Roadmap init][SUPERSEDED]: ~~Phase 2 (BAA) must complete before Phase 3 (RLS) and Phase 5~~ → Phases 2–6 now build single-user on standard-tier infra; the BAA/HIPAA gate is Phase 7.
- [Roadmap init]: DECISION-01 (Better-Auth↔Neon-JWK seam) resolved by Phase 1 spike — spike outcome gates Phase 3 build
- [2026-06-08 RE-SCOPE]: DECISION-02 (LLM provider BAA) deferred to Phase 7 — single-user/owner extraction may use the standard subscription API; external-client PHI extraction is blocked until the Phase 7 LLM BAA.
- [Phase ?]: D-10 delivered: dashboard + metrics section (archetypes 01-04) fully in-brand
- [Phase ?]: D-10 delivered: all 7 protocol routes fully in-brand (layout, overview, cessation, versions, version-detail, supplements, compare)
- [Phase ?]: SC3 complete: protocol overview (archetype 05) + cessation (archetype 06) render in-brand with MetricRing/PhaseBar/Card/Badge
- [Phase ?]: D-10: all 8 insights + import routes retrofit in-brand (no half-branded section)
- [Phase ?]: D3 defer-dark superseded by D-09; warm-dark theme shipped in Phase 04.1; adoption doc updated
- [Phase 02-02]: D-10/D-11: docs/COMPLIANCE-RUNBOOK.md scaffolded — per-vendor BAA registers (Neon/Vercel/Anthropic) + pgAudit status + Phase 3 carry-forward; no secrets
- [Phase 02-02]: D-04: zoetrop.vercel.app is canonical deploy URL — propagated to CLAUDE.md Deployment/Naming/Database + PLATFORM.md §5.7; no netlify.app URLs remain
- [Phase 02-02]: D-12/D-13: pgAudit auto-configured by Neon (all,-misc, log_parameter=off, superset of D-12 baseline); SELECT logging deferred to Phase 3 — carry-forward recorded in runbook (T-02-06 mitigated)
- [Phase 04.1-09]: Grid-blowout fixed at the source `.zt-grid-*` helper (`minmax(0,1fr)` tracks + `min-width:0` on children) so every consumer is fixed at once; route-local inline multi-column grids hardened the same way; `UI-01-n` ds-audit gate locks it in. Orchestrator browser visual pass (16 routes × 1280/390 × light/dark) still pending.
- [Phase 03-01]: better-auth bumped ^1.6.14 -> ^1.6.15 to satisfy @better-auth/drizzle-adapter's @better-auth/core ^1.6.15 peer (within already-verified package family; no --force/--legacy-peer-deps)
- [Phase 03-01]: Wave-0 RED contracts live — 6 test files bind AUTH-01/AUTH-02/TEN-01/TEN-04/D-01; auth/route red on not-yet-built modules, DB introspection skip-guards on DATABASE_URL_UNPOOLED||DATABASE_URL. Plans 03/05 + 02/04 turn them green.
- [Phase ?]: 03-03: Better-Auth singleton wired to Neon via getDb(); invite hook via createAuthMiddleware+APIError; role input:false; NETLIFY_DATABASE_URL test stub
- [Phase 03-04]: Expand-contract tenancy migration COMPLETE on live Neon (orange-paper-97068012) — TEN-01 (16 NOT NULL tenant_id/subject_id + composite index on all 8 tables) + TEN-04 (composite UNIQUE(tenant_id,subject_id,version); old global UNIQUE absent); owner seeded (tenant + owner-subject + role=owner user m@negentropi.co). Journal-split execution (0001/0002 → seed → 0003/0004) avoided the backfill-before-spine guardrail trip.
- [Phase 03-04]: Deviation 0644fa7 — constraints.test.ts array-parsing bug: @neondatabase/serverless returns array_agg as a pg text-array STRING not a JS array; parsePgTextArray() added. DB contract tests 18/18 green against live Neon; full suite 99 passing (only auth-layout.test.ts red — Plan 05 builds it).
- [Phase ?]: [Phase 03-05]: Public/private auth surface split shipped — landing.tsx at / (no AppShell), auth/login+logout, and one authenticated _app/layout.tsx loader gating all 16 app routes (getSession → redirect /login). AppShell moved off root.tsx (bare Outlet). PILOT_BASIC_AUTH stopgap removed from code (D-05); Vercel env-var deletion + prod 200-check deferred to post-deploy (prod still serves old code). Local smoke test: signed-out /dashboard 302, owner sign-in 30-day persistent cookie, /logout 302. AUTH-01/AUTH-02 satisfied.
- [Phase ?]: [Phase 03.1-01]: invites table in schema.ts, hand-corrected 0005 migration (Drizzle snapshot drift from custom 0002-0004), user.tenantId nullable expand-contract, authz helpers RLS-compatible

### Pending Todos

- [Plan 05 / Vercel]: Set OWNER_INVITE_TOKEN in Vercel env (production + preview). ✓ DONE — orchestrator pre-staged OWNER_INVITE_TOKEN to Production + Preview (encrypted; CLI for prod, REST for preview). Do NOT commit the value.
- [Post-deploy / Vercel — D-05]: After merging `003-remix-foundation` to production + deploying: delete PILOT_BASIC_AUTH from Vercel (Prod+Preview), then `curl -I https://zoetrop.vercel.app/` expects 200 (not 401). Deferred because prod still runs the OLD Basic-Auth code; deleting pre-deploy would expose prod. resolves_phase: 03. See `.planning/todos/pending/delete-pilot-basic-auth-post-deploy.md`.

### Blockers/Concerns

- [Phase 7 gate]: LLM provider BAA + Neon/Vercel BAAs + Neon HIPAA-mode + pgAudit verification — deferred to Phase 7 (pre-client gate). NOT a blocker for the single-user pilot (standard-tier infra + subscription API). Required before any external client's PHI.
- [Phase 7 risk]: RLS retrofit on 8 live tables is the highest-risk migration (now Phase 7). Rehearse on a Neon branch; RLS-enable + policies in one atomic migration (Pitfall 2). Phase 3 adds the tenant/subject columns up front so this retrofit is non-breaking.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| M2 | Client-facing branded app | Deferred | M1 scope definition |
| M2+ | Training / Nutrition / Modalities delivery surfaces | Deferred | M1 scope definition |
| M3 | Multi-tenant productization / engine-as-product | Deferred | M1 scope definition |

## Session Continuity

Last session: 2026-06-10T13:41:49.940Z
Stopped at: Phase 4 context gathered
Resume file: .planning/phases/04-static-to-db-data-layer-migration/04-CONTEXT.md
