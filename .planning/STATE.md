---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: Phase 7 context gathered
last_updated: "2026-06-12T16:05:24.455Z"
last_activity: "2026-06-12 - Completed quick task 260612-d8s: round3 self-rendering design package + reference screenshots"
progress:
  total_phases: 9
  completed_phases: 8
  total_plans: 42
  completed_plans: 42
  percent: 89
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-07)

**Core value:** Confidence-graded protocol-decision engine — heterogeneous diagnostics + genetics → personalized, evidence-weighted (K1–K4) protocol with honest uncertainty (not faked certainty)
**Current focus:** Phase 7 — phi compliance hardening — pre client gate (deferred hardening)

> Note: Phases 1, 2, 3, 3.1, 4, and 4.1 are complete (Phase 4 completed 2026-06-10 with verification passed 4/4). Phase 4.1 (design system) was executed early on 2026-06-08; `phase.complete` for Phase 4 again mis-pointed "next" at the already-complete 4.1 and was corrected by hand — **the next incomplete phase is Phase 5 (Lab Ingest Pipeline)**. Phase 2 was re-scoped (pilot-first, 2026-06-08) to "Vercel Cutover + Pilot Deploy Baseline" and closed: the app is **live at https://zoetrop.vercel.app** (Vercel project `zoetrop` on team negentropico, standard Pro — no HIPAA add-on) against the existing Neon project `orange-paper-97068012` (8 M0 tables, connectivity confirmed). PHI/BAA/HIPAA/RLS hardening deferred to new **Phase 7**. Engine-first critical path resumes at **Phase 3 (Identity + Tenancy Scoping)** — no BAA gate.
> ✓ 04.1-09 grid-blowout gap-closure complete + **browser-verified** (16/16 routes overflow-free; R3 by concurrent session; 04.1-HUMAN-UAT recorded).

## Current Position

Phase: 7
Plan: Not started
Status: Ready to plan
Last activity: 2026-06-12 - Completed quick task 260612-d8s: round3 self-rendering design package + reference screenshots

Progress: [████████░░] 78%

> ✓ Phase 6 (Engine Promotion + Confidence-Graded Reports) complete 2026-06-12 — 5/5 plans, verification 5/5; pure engine.ts, corpus on Neon (30 variant + 22 metric rules, non-null K), deterministic report generator with inline K + K4 disclaimer. Next incomplete phase is **Phase 7 (PHI Compliance Hardening — Pre-Client Gate)**.

## Performance Metrics

**Velocity:**

- Total plans completed: 47
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
| 04 | 7 | - | - |
| 05 | 3 | - | - |
| 06 | 5 | - | - |

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
| Phase 05 P01 | 25min | 4 tasks | 15 files |
| Phase 05-lab-ingest-pipeline P02 | 6 | 3 tasks | 10 files |
| Phase 05-lab-ingest-pipeline P03 (code; Task 4 E2E pending UAT) | ~18m | 3 tasks | 7 files |

## Accumulated Context

### Roadmap Evolution

- Phase 04.1 inserted after Phase 4: Design System Adoption — bridge Zoetrop brand tokens into Tailwind, port signature components to TSX, retrofit M0 screens, commit binding UI-SPEC.md; gated on a claude.ai/design roundtrip (see docs/DESIGN-SYSTEM-ADOPTION.md)

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
- [Phase ?]: [Phase 05-01]: 4 lab-ingest tables (lab_documents/lab_extractions/audit_log/consent_log) applied to live Neon via reviewed migration 0007; data_source enum +lab (D-16); audit_log PHI-free by design (D-13); enum ADD VALUE not in transaction (Pitfall 3 cleared at apply)
- [Phase ?]: [Phase 05-01]: analyte dictionary is a server-only TS module (D-01) — 101 entries seeded from owner 38 live-Neon analytes + D-03 common panels, no PHI; re-runnable via npm run db:seed-dictionary
- [Phase 05-03]: Review surface + write-path code complete (LAB-04/LAB-05/LAB-06). routes.ts reconciled (index + documents/:id into existing ingest block — single upload surface); PdfPageViewer (react-pdf, renderTextLayer snippet highlight, worker via import.meta.url, pdfjs-dist peer-dep-only — Pitfall 6); authed PDF byte stream (document.tsx, T-05-DOC); review loader+UI with useFetcher status polling (D-11); per-field approve/edit/reject write path — assertSubjectAccess BEFORE write (D-15/CR-01) + metrics INSERT source='lab' + PHI-free auditLog + pdfBytes purge, all in a Drizzle transaction, NO bulk-approve (T-05-BULK/LAB-04). approve-action.test.ts 14/14 GREEN; full suite 195 pass/58 skip. Commits 301d826/b12692e/6e15a2c + SUMMARY 42e361d.
- [Phase 05-03][Rule-3 deviation]: dynamic import() of the auditLog table inside the review action tripped React Router's "Server-only module referenced by client" build guard — switched to a static schema import (tx.insert(auditLog)). Pattern: never dynamic-import server modules inside route action bodies.
- [Phase 05-03][PENDING]: Task 4 E2E UAT on Vercel preview is DEFERRED / pending human verification (owner runs upload→extract→review→approve against a real lab PDF). Infra staged: ANTHROPIC_API_KEY in Vercel Preview+Production, repo negentropico/zoetrop connected (rootDirectory=remix-app), preview built at https://zoetrop-gtpsezj4x-negentropico.vercel.app (SSO-protected). Phase NOT complete until E2E approved + phase verification.

### Pending Todos

- [Plan 05 / Vercel]: Set OWNER_INVITE_TOKEN in Vercel env (production + preview). ✓ DONE — orchestrator pre-staged OWNER_INVITE_TOKEN to Production + Preview (encrypted; CLI for prod, REST for preview). Do NOT commit the value.
- [Post-deploy / Vercel — D-05]: After merging `003-remix-foundation` to production + deploying: delete PILOT_BASIC_AUTH from Vercel (Prod+Preview), then `curl -I https://zoetrop.vercel.app/` expects 200 (not 401). Deferred because prod still runs the OLD Basic-Auth code; deleting pre-deploy would expose prod. resolves_phase: 03. See `.planning/todos/pending/delete-pilot-basic-auth-post-deploy.md`.
- [Phase 05-03 / Owner — E2E UAT]: Run the lab-ingest end-to-end on the Vercel preview (https://zoetrop-gtpsezj4x-negentropico.vercel.app or latest 003-remix-foundation preview): sign in as owner → /ingest/upload → consent → upload a real text-extractable lab PDF → confirm <2s + processing→pending_review (~30-60s, waitUntil) → /ingest/review real PDF + located snippet + per-field-only approve/edit/reject (no bulk) → approve a couple (edit one), reject one → verify approved metrics appear with source='lab', rejected writes none, consentLog row + PHI-free auditLog rows exist. Reply "approved" or describe failures. Steps + acceptance criteria in 05-03-SUMMARY.md §Task 4. Blocks phase-05 completion.

### Blockers/Concerns

- [Phase 7 gate]: LLM provider BAA + Neon/Vercel BAAs + Neon HIPAA-mode + pgAudit verification — deferred to Phase 7 (pre-client gate). NOT a blocker for the single-user pilot (standard-tier infra + subscription API). Required before any external client's PHI.
- [Phase 7 risk]: RLS retrofit on 8 live tables is the highest-risk migration (now Phase 7). Rehearse on a Neon branch; RLS-enable + policies in one atomic migration (Pitfall 2). Phase 3 adds the tenant/subject columns up front so this retrofit is non-breaking.

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
| M2 | Client-facing branded app | Deferred | M1 scope definition |
| M2+ | Training / Nutrition / Modalities delivery surfaces | Deferred | M1 scope definition |
| M3 | Multi-tenant productization / engine-as-product | Deferred | M1 scope definition |

## Session Continuity

Last session: 2026-06-12T16:05:24.447Z
Stopped at: Phase 7 context gathered
Resume file: .planning/phases/07-phi-compliance-hardening-pre-client-gate-deferred-hardening/07-CONTEXT.md
