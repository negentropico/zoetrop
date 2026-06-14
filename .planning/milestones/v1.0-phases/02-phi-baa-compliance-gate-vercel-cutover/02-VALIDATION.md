---
phase: 2
slug: phi-baa-compliance-gate-vercel-cutover
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-08
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
>
> **Phase 2 is a compliance + deploy-cutover gate.** Most success criteria are verified by
> legal/ops actions (signed BAAs, Neon HIPAA enablement) or a Neon Support ticket (pgAudit log
> sample), NOT by unit tests. The automatable surface is small: keep the Phase 1 Vitest suite
> green, prove the Vercel-preset build, and assert Netlify removal via shell. This file makes that
> split explicit so Dimension 8 doesn't expect Vitest coverage of inherently-manual gate items.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8 (existing from Phase 1) |
| **Config file** | `remix-app/vite.config.ts` (test block present) |
| **Quick run command** | `cd remix-app && npm test` |
| **Full suite command** | `cd remix-app && npm test` |
| **Build smoke command** | `cd remix-app && npm run build` (must succeed with the Vercel preset) |
| **Estimated runtime** | ~5 seconds (unit) / ~30–60 seconds (build) |

---

## Sampling Rate

- **After every task commit:** Run `cd remix-app && npm test` (Phase 1 engine suite must stay green — no regressions from config changes)
- **After every plan wave:** Run `cd remix-app && npm run build` (Vercel preset build must succeed)
- **Before `/gsd:verify-work`:** Full suite green **AND** the manual SC checklist (BAAs + Neon HIPAA + pgAudit ticket) complete and recorded in `docs/COMPLIANCE-RUNBOOK.md`
- **Max feedback latency:** ~60 seconds (automatable surface); manual SC items are gated by vendor turnaround, tracked in the runbook

---

## Per-Task Verification Map

> Task IDs bind during planning (Step 8). Rows below are the requirement-level verification contract
> the planner's tasks must satisfy. `❌ W0` = Wave 0 must create the check; `manual` = recorded in
> the runbook, not automatable.

| Req / SC | Behavior | Test Type | Automated Command | File Exists | Status |
|----------|----------|-----------|-------------------|-------------|--------|
| SC#5 | RR7 Vercel preset configured; build passes | build | `cd remix-app && npm run build` | ✅ (existing CI) | ⬜ pending |
| SC#5 | `netlify.toml` absent from repo root | smoke | `test ! -f netlify.toml` | ❌ W0 (shell assertion) | ⬜ pending |
| SC#5 | Phase 1 engine suite still green after config changes | unit | `cd remix-app && npm test` | ✅ (existing) | ⬜ pending |
| SC#5 | Post-deploy DB connectivity on Vercel | smoke | health-check loader or `curl` to deployed URL | ❌ W0 (deploy procedure) | ⬜ pending |
| SC#5 | CLAUDE.md + docs/PLATFORM.md reflect Vercel (no Netlify site id) | manual review | `grep -L netlify CLAUDE.md docs/PLATFORM.md` (no Netlify deploy refs remain) | manual | ⬜ pending |
| COMP-02 / SC#1 | Neon Scale + HIPAA mode + signed Neon BAA | manual | N/A — account action + legal signing; recorded in runbook | manual | ⬜ pending |
| COMP-02 / SC#2 | Vercel deployed (Netlify retired) + Vercel BAA on BAA-eligible plan | manual | N/A — Pro HIPAA add-on + legal signing; recorded in runbook | manual | ⬜ pending |
| COMP-02 / SC#3 | Chosen LLM provider (Anthropic) BAA covering extraction tier | manual | N/A — sales/legal signing; recorded in runbook | manual | ⬜ pending |
| COMP-03 / SC#4 | pgAudit enabled; entry records {user, table, operation, timestamp}, NOT bind params (`log_parameter=off`) | manual | N/A — Neon auto-configures on HIPAA; sample retrieved via Neon Support ticket | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test ! -f netlify.toml` shell assertion — provable Netlify-config removal (CI `check` step or task acceptance criterion)
- [ ] Vercel-preset build smoke — `npm run build` succeeds with `@vercel/react-router` preset installed
- [ ] Post-deploy DB connectivity check — health-check loader or documented `curl` confirming `DATABASE_URL` is wired on Vercel

*No new Vitest test files are needed for Phase 2 — the compliance verifications are manual/ops procedures, not unit tests. The Phase 1 suite must remain green throughout.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Neon Scale plan active + HIPAA mode enabled on the **existing** project | COMP-02 / SC#1 | Account/billing action in Neon Console; **irreversible** — cannot be scripted/asserted from the repo | In Neon Console: confirm plan = Scale; confirm HIPAA badge on the existing project (verify project ID matches the live `DATABASE_URL`); record execution date + signing contact in `docs/COMPLIANCE-RUNBOOK.md` |
| Signed Neon BAA | COMP-02 / SC#1 | Legal agreement (click-to-accept at org level) | Accept BAA in Neon org settings; record status + date in runbook |
| Signed Vercel BAA on a BAA-eligible plan | COMP-02 / SC#2 | Pro HIPAA add-on (Settings → Billing) + legal acceptance; vendor-side | Enable the HIPAA add-on on the Pro team; record plan/tier + BAA date in runbook |
| Signed Anthropic (LLM provider) BAA covering the extraction tier | COMP-02 / SC#3 | Sales-gated (dedicated HIPAA org provisioned); not self-serve | Email claude.com/contact-sales; once provisioned, record org + BAA date + tier in runbook; note Phase 5 is blocked until signed |
| pgAudit entry format proof (`{user, table, operation, timestamp}`, **no** bind params) | COMP-03 / SC#4 | Audit-log retrieval on Neon is **not self-serve** — requires a Neon Support ticket | Open a Neon Support ticket requesting an audit-log sample for a test `write`; confirm the entry shows the four fields and `log_parameter=off` (no parameter values); paste the redacted sample + ticket ref into the runbook |

*These items are gated by vendor legal/support turnaround. They are recorded as completed in `docs/COMPLIANCE-RUNBOOK.md`, which is the auditable proof-of-gate referenced by Phases 3 and 5.*

---

## Validation Sign-Off

- [ ] Every automatable task has a `<automated>` verify or a Wave 0 dependency
- [ ] Sampling continuity: Phase 1 suite + build run after each wave (no 3 consecutive tasks without an automated check on the code/config track)
- [ ] Wave 0 covers the Netlify-removal assertion, the preset build smoke, and the post-deploy connectivity check
- [ ] No watch-mode flags
- [ ] Manual-only gate items each have a runbook recording instruction (not a fake unit test)
- [ ] Feedback latency < 60s on the automatable surface
- [ ] `nyquist_compliant: true` set in frontmatter after planning binds task IDs

**Approval:** pending
