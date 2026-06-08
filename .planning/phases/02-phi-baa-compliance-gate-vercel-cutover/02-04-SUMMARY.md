---
phase: 02-phi-baa-compliance-gate-vercel-cutover
plan: 04
subsystem: infra
status: complete
completed: 2026-06-08
tags: [vercel, neon, production-deploy, connectivity, pilot, phase-close]

# Dependency graph
requires:
  - phase: 02-01
    provides: Vercel preset + drizzle unpooled config
  - phase: 02-03
    provides: standard env vars set in Vercel + real .env
provides:
  - "Live production deploy at https://zoetrop.vercel.app (HTTP 200), built with @vercel/react-router preset"
  - "DB connectivity to the existing Neon project orange-paper-97068012 confirmed (8 M0 tables)"
  - "Phase-7 hardening deferral recorded; Phase 2 baseline closed"
affects: [03-identity-tenancy-scoping, 04-data-layer]
---

## Summary

Re-scoped (2026-06-08, pilot-first): the pgAudit sample / Neon Support ticket and all BAA/HIPAA work moved to Phase 7. This plan proves the **pilot deploy baseline**: a live Vercel production deploy + DB connectivity, recorded. Executed by the assistant via the NGT Vercel token on the user's authorization.

## What was done

- Triggered the production deploy via `vercel --prod` (remote build). The `@vercel/react-router` preset built clean (Build Output API artifacts, SSR function); `readyState: READY`.
- Production **aliased to https://zoetrop.vercel.app** → `curl` returns **HTTP 200**. (The deployment-specific URL returns 401 — standard Vercel deployment protection; the production alias is public.)
- Confirmed **DB connectivity** to the existing Neon project `orange-paper-97068012` via a `SELECT` over `DATABASE_URL_UNPOOLED`: **8 public tables** (M0 schema), `metrics` rows = 0 (data migration is Phase 4).
- Redeployed after correcting the env from placeholder → real values (02-03) so production runs on the real connection.
- Recorded deploy date / URL / 200 / connectivity + the Phase-7 deferral in `docs/COMPLIANCE-RUNBOOK.md`.

## Automatable baseline re-checks (all green)
- `test ! -f netlify.toml` ✓ · `grep vercelPreset react-router.config.ts` ✓ · `vercel.app` in `CLAUDE.md` + `docs/PLATFORM.md` ✓ · runbook has the Deferral Decision banner ✓
- (npm test 75/75 + npm run build were green in 02-01; the Vercel remote build re-ran the production build successfully.)

## Key files
- `docs/COMPLIANCE-RUNBOOK.md` — Pilot Deploy Baseline filled (deploy + connectivity, no secrets)

## Deviations
- pgAudit verification + BAAs deferred to Phase 7 per the re-scope — explicitly NOT done here.
- Minor: a non-fatal `Dropzone.tsx` sourcemap warning appears during the Vercel build (build still READY) — noted as a low-priority follow-up.

## Self-Check: PASSED
- https://zoetrop.vercel.app returns 200 from a successful preset build; DB connectivity to the existing Neon project confirmed; Netlify retired; Phase-7 deferral recorded. Phase 2 (Vercel Cutover + Pilot Deploy Baseline) is complete.
