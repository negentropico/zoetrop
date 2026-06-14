---
phase: 02-phi-baa-compliance-gate-vercel-cutover
plan: "02"
subsystem: compliance-docs
tags: [compliance, baa, hipaa, vercel, docs]
dependency_graph:
  requires: []
  provides: [docs/COMPLIANCE-RUNBOOK.md, CLAUDE.md@vercel, docs/PLATFORM.md@vercel]
  affects: [Phase 3 gate (runbook must be filled before RLS retrofit), Phase 5 gate (Anthropic BAA required before lab ingest)]
tech_stack:
  added: []
  patterns: [per-vendor BAA register, Phase 3 carry-forward documentation pattern]
key_files:
  created:
    - docs/COMPLIANCE-RUNBOOK.md
  modified:
    - CLAUDE.md
    - docs/PLATFORM.md
decisions:
  - "D-10: Runbook at docs/COMPLIANCE-RUNBOOK.md — confirmed, created"
  - "D-11: Full per-vendor register with no secrets — confirmed; only metadata (dates, plan/tier, org names, ticket numbers)"
  - "D-12: pgAudit baseline documented as auto-configured by Neon (all,-misc), log_parameter=off — superset of write,ddl spec, acceptable"
  - "D-13: Phase 3 carry-forward for SELECT audit logging explicitly recorded in runbook § Phase 3 Carry-Forward"
  - "D-04: Production domain zoetrop.vercel.app propagated to CLAUDE.md + PLATFORM.md"
metrics:
  duration: "2m 13s"
  completed_date: "2026-06-08"
  tasks_completed: 2
  files_modified: 3
---

# Phase 02 Plan 02: Compliance Runbook Scaffold + Vercel Doc Updates Summary

**One-liner:** Scaffolded `docs/COMPLIANCE-RUNBOOK.md` with fillable per-vendor BAA registers (Neon/Vercel/Anthropic), pgAudit status with verification procedure, and an explicit Phase 3 carry-forward for SELECT audit logging; updated CLAUDE.md and PLATFORM.md to reflect Vercel as the deploy target.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Scaffold docs/COMPLIANCE-RUNBOOK.md | 8e0fef4 | docs/COMPLIANCE-RUNBOOK.md (created, 120 lines) |
| 2 | Update CLAUDE.md + docs/PLATFORM.md from Netlify to Vercel | 59a3a9c | CLAUDE.md, docs/PLATFORM.md |

## Artifacts Created / Modified

### docs/COMPLIANCE-RUNBOOK.md (new, 120 lines)
- Top-of-file NO SECRETS note (D-11, T-02-04 mitigation)
- **Neon BAA section:** Scale plan, HIPAA mode steps, project-ID verification field (Pitfall 1 guard — ensures user verifies they are not accidentally pointing at a new empty project)
- **Vercel BAA section:** Pro + HIPAA add-on (self-serve; no Enterprise required), step-by-step instructions
- **LLM Provider BAA section:** Anthropic HIPAA-Ready API org recommended (D-02 tiebreaker applied); OpenAI documented as fallback; Phase 5 gate note; ZDR + no-training guarantee confirmed
- **pgAudit Status section:** auto-configured by Neon (`all,-misc`, `log_parameter=off`); full verification procedure via Neon Support ticket; log sample placeholder for SC #4 evidence
- **Phase 3 Carry-Forward section:** SELECT audit logging deferred (D-13); rationale (no PHI tables until Phase 3); required Phase 3 action; T-02-06 mitigation confirmed

### CLAUDE.md (modified)
- Tech Stack table: Deployment row → Vercel
- Database section: removed Netlify extension description + Netlify site id `0abb12f6-d11b-4f81-8a8d-86b44e99088f`; documented Vercel env var pattern (`DATABASE_URL` pooled + `DATABASE_URL_UNPOOLED` direct)
- Deployment section: replaced netlify.app URLs with `https://zoetrop.vercel.app`; updated CI/CD note to Vercel auto-deploy with per-branch previews
- Naming section: updated codename match from `zoetrop.netlify.app` to `zoetrop.vercel.app`

### docs/PLATFORM.md (modified)
- Line 5 Live URL: `zoetrop.netlify.app` → `zoetrop.vercel.app`
- Stack line: `Netlify CI/CD` → `Vercel CI/CD`
- Section 5.7 (PHI/security posture): replaced generic "BAA-readiness with vendors" with explicit reference to `docs/COMPLIANCE-RUNBOOK.md` as the auditable proof-of-gate for Phases 3 and 5

## Decisions Made

- **D-10 confirmed:** Runbook location `docs/COMPLIANCE-RUNBOOK.md` as specified
- **D-11 confirmed:** No secrets in runbook; only metadata (dates, plan/tier, org names, non-secret org IDs, ticket numbers)
- **D-12 recorded:** Neon auto-configures `pgaudit.log = 'all, -misc'` (superset of the D-12 `write, ddl` baseline — satisfies D-12 intent and COMP-03 without manual configuration)
- **D-13 recorded:** Phase 3 carry-forward explicitly documented in runbook section; T-02-06 mitigation in place
- **D-04 propagated:** `zoetrop.vercel.app` now the canonical URL in all project docs

## Deviations from Plan

None — plan executed exactly as written. All five runbook sections created per template in RESEARCH.md. All CLAUDE.md and PLATFORM.md targets updated to Vercel. The pgAudit section notes the `all,-misc` auto-configuration as a superset of the D-12 `write,ddl` baseline (this is consistent with RESEARCH.md § D2 which explicitly calls out this acceptable difference).

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. This plan creates only in-repo markdown. The NO SECRETS note in the runbook mitigates T-02-04 (information disclosure via accidentally-committed secrets).

## Known Stubs

All placeholder fields in `docs/COMPLIANCE-RUNBOOK.md` are intentional — they are designed to be filled by the user in plans 02-03 and 02-04 (user-action tasks). The runbook's purpose is to provide the scaffold; blanks are the expected state at Wave 1 close.

## Self-Check: PASSED

- `docs/COMPLIANCE-RUNBOOK.md` exists: FOUND
- `8e0fef4` exists in git log: FOUND
- `59a3a9c` exists in git log: FOUND
- No `netlify.app` in CLAUDE.md: CONFIRMED
- No `netlify.app` in PLATFORM.md: CONFIRMED
- Netlify site id removed from CLAUDE.md: CONFIRMED
- `vercel.app` present in both files: CONFIRMED
- Phase 3 Carry-Forward section in runbook: CONFIRMED
- `log_parameter` in runbook: CONFIRMED
- Anthropic in runbook: CONFIRMED
- NO SECRETS note in runbook: CONFIRMED
