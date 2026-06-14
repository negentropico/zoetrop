---
phase: 1
slug: client-onboarding-practitioner-operated
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-14
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `01-RESEARCH.md` § Validation Architecture. Per-task rows are
> requirement-level until the planner assigns task IDs — refine during planning.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8 |
| **Config file** | `remix-app/vite.config.ts` (test section) |
| **Quick run command** | `cd remix-app && npm test` |
| **Full suite command** | `cd remix-app && npm test && npm run typecheck && npm run build` |
| **Estimated runtime** | ~5–15s (unit) · +~30–60s for typecheck+build gate |

Default test environment: `node`. Component tests use `// @vitest-environment jsdom` pragma per-file.

---

## Sampling Rate

- **After every task commit:** Run `cd remix-app && npm test`
- **After every plan wave:** Run `cd remix-app && npm test && npm run typecheck && npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15s (unit); build gate is mandatory at wave merge — typecheck + vitest can pass while `npm run build` fails on `.server` module leaks into the client bundle

---

## Per-Task Verification Map

> Task IDs are TBD until `/gsd:plan-phase` assigns them. Rows below are the
> requirement-level proofs from RESEARCH.md; the planner/executor maps each to a
> concrete `{N}-PP-TT` task.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | ONB-01 | — | `createSubject` persists all intake fields | unit | `npm test -- tests/lib/subjects.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | ONB-01 | — | `subjects` schema has dob, biologicalSex, programType, etc. | integration | `npm test -- tests/lib/schema-integrity.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | ONB-02 | T-invite-IDOR | `generateInvite` binds correct server-resolved `subjectId` | unit | `npm test -- tests/auth/invites-server.test.ts` | ✅ extend | ⬜ pending |
| TBD | TBD | TBD | ONB-02 | — | `resolveInviteByToken`/`consumeInviteByToken` return `subjectId` | unit | `npm test -- tests/auth/invites-server.test.ts` | ✅ extend | ⬜ pending |
| TBD | TBD | TBD | ONB-03 | T-cookie-tamper | `getActiveSubject` falls back to owner when cookie unset | unit | `npm test -- tests/lib/active-subject.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | ONB-03 | T-cross-tenant | `getActiveSubject` rejects cross-tenant cookie value | unit | `npm test -- tests/lib/active-subject.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | ONB-03 | T-client-403 | `assertSubjectAccess` Gate 1 still 403s for client role | unit | `npm test -- tests/lib/require-subject-ctx.test.ts` | ✅ unchanged | ⬜ pending |
| TBD | TBD | TBD | ONB-04 | — | Checklist returns `missing` when no lab_documents for subject | unit | `npm test -- tests/lib/checklist.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | ONB-04 | — | Checklist labs `done` only when approved extraction exists | unit | `npm test -- tests/lib/checklist.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | ONB-04 | — | Checklist WHOOP `done` when metrics with source=whoop exist | unit | `npm test -- tests/lib/checklist.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/lib/subjects.test.ts` — `createSubject`, `listClientSubjects` (ONB-01)
- [ ] `tests/lib/active-subject.test.ts` — `getActiveSubject` fallback + cookie parse + cross-tenant rejection (ONB-03)
- [ ] `tests/lib/checklist.test.ts` — 3-state checklist logic for labs/genetics/WHOOP/report/protocol (ONB-04)
- [ ] `tests/lib/schema-integrity.test.ts` — `subjects` + `invites` column assertions (ONB-01, ONB-02)
- [ ] Extend `tests/auth/invites-server.test.ts` — `subjectId` field assertions (ONB-02)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Invite redemption end-to-end | SC-5 / 03.1 UAT | Crosses Better-Auth signup + browser session; needs a clean session | In a private window, redeem a generated invite token; confirm a `subjects` row is created/linked with no orphaned account, and `invites.consumedAt` is set |
| Client-role 403 on PHI route | ONB-03, SC-5 / 03.1 UAT | Requires a real client account + live session to exercise `assertSubjectAccess` Gate 1 | Log in as the redeemed client account, attempt a PHI route (e.g. `/dashboard`), confirm 403 |
| Active-subject switch scopes all PHI surfaces | ONB-03 | End-to-end visual confirmation across ingest/report/protocol surfaces | As owner, switch active subject to a client via the chip; confirm ingest/report/protocol all show only that subject's data; switch back resets to owner on new session |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (subjects/active-subject/checklist/schema-integrity test files)
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
