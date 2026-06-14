---
phase: 02-phi-baa-compliance-gate-vercel-cutover
plan: 03
subsystem: infra
status: complete
completed: 2026-06-08
tags: [vercel, neon, env-vars, deploy-baseline, pilot]

# Dependency graph
requires:
  - phase: 02-02
    provides: docs/COMPLIANCE-RUNBOOK.md scaffold (Pilot Deploy Baseline section)
provides:
  - "Vercel project 'zoetrop' (prj_vmXuyOyn3sItL3BdjHZ8jtOHVjSA) created on team negentropico (Pro, no HIPAA add-on)"
  - "DATABASE_URL, DATABASE_URL_UNPOOLED, BETTER_AUTH_SECRET, BETTER_AUTH_URL set in Vercel (Production + Preview) with REAL values"
  - "local .env template placeholders filled with real Neon connection strings + generated BETTER_AUTH_SECRET + Vercel deploy creds"
affects: [02-04]
---

## Summary

Re-scoped (2026-06-08, pilot-first): this plan no longer does Neon HIPAA / Vercel HIPAA add-on / Anthropic BAA — those moved to Phase 7. It now sets the **standard** env vars needed for the pilot deploy. Executed by the assistant using the NGT Vercel API token (`trousant.env`) and the project-scoped `NEON_API_KEY` on the user's authorization.

## What was done

- Discovered there was **no zoetrop Vercel project**; created `zoetrop` on the **negentropico** team (Pro plan, no HIPAA add-on).
- Discovered the zoetrop root `.env` held **template placeholders** (`host.region.aws.neon.tech`, `replace-with-…base64-32`) for the DB URLs + auth secret; only `NEON_API_KEY` was real.
- Used the project-scoped `NEON_API_KEY` → Neon API to pull the **authoritative** pooled + unpooled connection URIs for the verified existing project **`orange-paper-97068012`** (branch `main`, db `neondb`, role `neondb_owner`).
- Generated a real `BETTER_AUTH_SECRET` (32 random bytes, base64).
- Set all four env vars in Vercel (Production + Preview): `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=https://zoetrop.vercel.app`.
- Filled the local `.env` placeholders with the real values + added a Vercel deploy section (`VERCEL_API_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID`). `.env` is gitignored.

## Key files
- `docs/COMPLIANCE-RUNBOOK.md` — Pilot Deploy Baseline section recorded (no secrets)
- `/Users/mac/Code/zoetrop/.env` — placeholders → real values (gitignored, not committed)
- `remix-app/.vercel/project.json` — project link (gitignored)

## Deviations
- Plan assumed a dashboard/human action; instead executed via API tokens per the user's explicit instruction ("you do this via vercel tokens in ngt/ngtop").
- Caught and corrected an initial push of the `.env` **placeholder** values into Vercel before deploy verification.

## Self-Check: PASSED
- 4 env vars present in Vercel (Production + Preview) with real values; both DB URLs target the verified existing Neon project `orange-paper-97068012`. No HIPAA add-on / HIPAA mode (deferred to Phase 7). No secrets written to the runbook or repo.
