---
phase: 01-client-onboarding-practitioner-operated
plan: 04
subsystem: auth/invites
tags: [auth, invites, subjectId, ONB-02, D-01, D-03]
dependency_graph:
  requires: [01-01, 01-02, 01-03]
  provides: [subjectId-threaded-invite-write-path]
  affects: [invites.server.ts, auth.server.ts]
tech_stack:
  added: []
  patterns: [nullable-FK-thread, PendingInvite-extension, request-scoped-state]
key_files:
  created: []
  modified:
    - remix-app/app/lib/invites.server.ts
    - remix-app/app/lib/auth.server.ts
    - remix-app/tests/auth/invites-consume.test.ts
decisions:
  - "No extra assignment-table write at redemption (v1.1 correct wiring): the subject association is recorded on the invite row's subject_id column and resolved at the call site in Plan 06"
  - "subjectId threaded into audit via comment reference; auth_audit_log.subjectId remains null for auth events (schema intent preserved)"
  - "invite variable type annotation updated in beforeSignUp to carry subjectId: string | null from extended resolveInviteByToken return type"
metrics:
  duration: "4 min"
  completed: "2026-06-14"
  tasks: 2
  files: 3
---

# Phase 01 Plan 04: subjectId Thread Through Invite Write Path Summary

One-liner: Nullable subjectId FK threaded through GenerateInviteOpts/Result + resolve/consume return types + PendingInvite + both beforeSignUp paths, closing the ONB-02 invite-to-subject binding write path without adding a redemption-time table write.

## What Was Built

### Task 1: Thread subjectId through invites.server.ts

Extended the invite lifecycle API to carry a nullable subjectId from creation through resolution and consumption:

- `GenerateInviteOpts` gains `subjectId?: string | null` (D-01 binding — owner passes a server-resolved subjectId from their own subject list; never raw client input per IDOR mitigation)
- `GenerateInviteResult` gains `subjectId: string | null`
- `generateInvite` writes `subjectId: opts.subjectId ?? null` to the `db.insert(invites).values()` call and returns it
- `resolveInviteByToken` return type extended to `{ role: string; tenantId: string; subjectId: string | null } | null`; returns `invite.subjectId ?? null`
- `consumeInviteByToken` return type extended identically; returns `invite.subjectId ?? null`
- All existing token hashing, single-use consumption, expiry, role policy, consumedBy/consumedAt logic unchanged

Also updated `tests/auth/invites-consume.test.ts` mock rows and assertions to include `subjectId` in the return shapes (the mock was asserting exact `toEqual` shapes — extending the return type required matching updates to the mock expectations).

### Task 2: Thread subjectId through the Better-Auth redemption hooks

Extended `auth.server.ts` to carry subjectId through the request-scoped invite state:

- `PendingInvite` interface gains `subjectId: string | null`
- Per-invite `pendingInvite.set({...})` in `beforeSignUp` includes `subjectId: invite.subjectId ?? null` (threaded from the now-extended `resolveInviteByToken`)
- Break-glass `pendingInvite.set({...})` includes `subjectId: null` (break-glass has no subject binding)
- `invite` variable type annotation updated from `{ role: string; tenantId: string }` to `{ role: string; tenantId: string; subjectId: string | null }` to match the extended return type
- `user.create.after` audit block documents `pending?.subjectId` availability with comments; no extra table write (v1.1 correct wiring — subject association lives on the invite row, resolved by Plan 06 call site)
- Existing role + tenantId injection in `user.create.before` preserved exactly; redemption non-blocking (null subjectId accepted for practitioner/owner invites)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated invites-consume.test.ts mock assertions to match extended return shape**
- **Found during:** Task 1 — after extending the return types of resolveInviteByToken and consumeInviteByToken to include subjectId
- **Issue:** The consume mock test used `toEqual` with exact shapes `{ role, tenantId }` that would fail once the functions returned `{ role, tenantId, subjectId }`. The mock `selectRows` also lacked the `subjectId` field so `invite.subjectId ?? null` would produce `null` (undefined coalesced).
- **Fix:** Updated all 4 `toEqual` expectations and 4 mock `selectRows` objects in `invites-consume.test.ts` to include `subjectId` — with `null` or a fixture value as appropriate for the test scenario
- **Files modified:** `remix-app/tests/auth/invites-consume.test.ts`
- **Commit:** `686e58a`

## Verification

| Gate | Result |
|------|--------|
| `tests/auth/invites-server.test.ts` | 17/17 passed (ONB-02 subjectId assertions GREEN) |
| `tests/auth/invites-consume.test.ts` | 8/8 passed (no consume regression) |
| Full test suite (`npm test`) | 316 passed, 89 skipped (expected — DB-dependent) |
| `npx tsc --noEmit` | 0 errors |
| `npm run build` | Clean (SSR + client builds) |

## Known Stubs

None — the subjectId thread is complete end-to-end for the write path. The Plan 06 call site (which passes a server-resolved subjectId to `generateInvite`) is the next wiring step; this plan delivers the receptacle.

## Threat Flags

No new security-relevant surface introduced. All STRIDE mitigations from the plan's threat register are satisfied:
- T-01-invite-IDOR: subjectId accepted by generateInvite but not validated against practitioner's subjects here — validation deferred to call site (Plan 06), per plan spec
- T-01-redemption-elevation: role + tenantId injection preserved; subjectId does not affect role/tenant delivery
- T-01-token-replay: single-use SHA-256 consumption unchanged; subjectId thread does not touch the consume-once guard
- T-01-orphan-account: redemption still injects role+tenantId with no orphaned account; null subjectId is accepted

## Self-Check: PASSED

Files exist:
- `/Users/mac/Code/zoetrop/remix-app/app/lib/invites.server.ts` - FOUND
- `/Users/mac/Code/zoetrop/remix-app/app/lib/auth.server.ts` - FOUND
- `/Users/mac/Code/zoetrop/remix-app/tests/auth/invites-consume.test.ts` - FOUND

Commits exist:
- `686e58a` feat(01-04): thread subjectId through invites.server.ts (ONB-02)
- `d6e9adb` feat(01-04): thread subjectId through Better-Auth redemption hooks (ONB-02)
