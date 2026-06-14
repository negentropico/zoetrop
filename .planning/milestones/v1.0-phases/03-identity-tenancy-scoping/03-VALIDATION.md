---
phase: 3
slug: identity-tenancy-scoping
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-09
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `03-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8 (installed Phase 1) |
| **Config file** | `remix-app/vite.config.ts` (test block) |
| **Quick run command** | `cd remix-app && npm test` |
| **Full suite command** | `cd remix-app && npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd remix-app && npm test`
- **After every plan wave:** Run `cd remix-app && npm test` + manual schema inspection (`\d+ <table>` via Drizzle Studio / psql)
- **Before `/gsd:verify-work`:** Full suite green + manual session-persistence test + `grep` confirming `PILOT_BASIC_AUTH` absence
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

> Task IDs are assigned during planning (`*-PLAN.md`). This map binds each phase requirement to its automated proof; the planner/executor fills the Task ID + Status columns.

| Task ID | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | 1 | AUTH-01 | T-03-session | `getSession()` returns user for a valid cookie | unit | `npm test -- tests/auth/session.test.ts` | ❌ W0 | ⬜ pending |
| TBD | 1 | AUTH-02 | T-03-role-self-assign | `session.user.role === "owner"` for seeded owner; role is `input:false` | unit | `npm test -- tests/auth/role.test.ts` | ❌ W0 | ⬜ pending |
| TBD | 2 | AUTH-02 | T-03-unauth-access | Authenticated layout loader `redirect("/login")` when no session | unit | `npm test -- tests/routes/auth-layout.test.ts` | ❌ W0 | ⬜ pending |
| TBD | 2 | TEN-01 | — | All 8 tables have non-null `tenant_id` + `subject_id`; composite `(tenant_id, subject_id)` index present | integration | `npm test -- tests/db/schema-columns.test.ts` | ❌ W0 | ⬜ pending |
| TBD | 2 | TEN-04 | — | `UNIQUE(tenant_id, subject_id, version)` present on `protocol_versions`; old global `UNIQUE(version)` absent | integration | `npm test -- tests/db/constraints.test.ts` | ❌ W0 | ⬜ pending |
| TBD | 3 | D-05 (open-signup) | T-03-open-signup | `beforeSignUp`/invite hook returns 403 without a valid invite token | unit | `npm test -- tests/auth/invite.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `remix-app/tests/auth/session.test.ts` — AUTH-01 `getSession()` returns user for valid cookie
- [ ] `remix-app/tests/auth/role.test.ts` — AUTH-02 `session.user.role` field + `input:false`
- [ ] `remix-app/tests/auth/invite.test.ts` — invite-only hook rejects sign-up without token (D-01)
- [ ] `remix-app/tests/routes/auth-layout.test.ts` — AUTH-02 authenticated layout loader redirect
- [ ] `remix-app/tests/db/schema-columns.test.ts` — TEN-01 tenant_id/subject_id NOT NULL + composite index on all 8 tables
- [ ] `remix-app/tests/db/constraints.test.ts` — TEN-04 constraint swap (new composite UNIQUE present, old global UNIQUE absent)

*Vitest harness itself already exists (Phase 1) — Wave 0 adds test files only, no framework install.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stay signed in across browser sessions | AUTH-01 | Requires closing + reopening a real browser with a persisted session cookie | After deploy, sign in, close the browser fully, reopen `zoetrop.vercel.app/dashboard` — still authenticated (no re-login) |
| Schema introspection of live Neon tables | TEN-01 / TEN-04 | Confirms the migration actually applied against Neon, not just generated | `\d+ metrics` (and the other 7 tables) + `\d+ protocol_versions` via Drizzle Studio or `psql` — confirm columns, composite index, and constraint swap |
| Throwaway Basic-Auth gate removed | D-05 | Edge behavior of the live deployment | `curl -I https://zoetrop.vercel.app/` returns `200` (not `401`) after deploy; `PILOT_BASIC_AUTH` env var deleted from Vercel |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (6 test files above)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
