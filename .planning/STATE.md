# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-07)

**Core value:** Confidence-graded protocol-decision engine — heterogeneous diagnostics + genetics → personalized, evidence-weighted (K1–K4) protocol with honest uncertainty (not faked certainty)
**Current focus:** Phase 1 — Schema Baseline + Engine Tests + Auth Spike

## Current Position

Phase: 1 of 6 (Schema Baseline + Engine Tests + Auth Spike)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-06-07 — ROADMAP.md and STATE.md initialized; M1 roadmap created (6 phases, 28 requirements mapped)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:** No data yet

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap init]: Hard dependency chain confirmed — each phase is a gate for the next; Phase 2 (BAA) must complete before Phase 3 (RLS retrofit) and Phase 5 (lab ingest) can write client PHI
- [Roadmap init]: DECISION-01 (Better-Auth↔Neon-JWK seam) resolved by Phase 1 spike — spike outcome gates Phase 3 build
- [Roadmap init]: DECISION-02 (LLM provider BAA) is open — must be resolved and recorded in ops runbook during Phase 2 before Phase 5 is unblocked

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2 gate]: LLM provider BAA is an open decision. OpenAI has a BAA for API customers — confirm the account tier is covered. Alternative: Anthropic Claude API. Must be resolved before Phase 5 can send PHI to any model.
- [Phase 3 risk]: RLS retrofit on 8 live tables is the highest-risk migration. Use a Neon branch to rehearse before applying to production. RLS-enable and policies must be in the same atomic migration (Pitfall 2).

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| M2 | Client-facing branded app | Deferred | M1 scope definition |
| M2+ | Training / Nutrition / Modalities delivery surfaces | Deferred | M1 scope definition |
| M3 | Multi-tenant productization / engine-as-product | Deferred | M1 scope definition |

## Session Continuity

Last session: 2026-06-07
Stopped at: Roadmap and STATE initialized — ready to plan Phase 1
Resume file: None
