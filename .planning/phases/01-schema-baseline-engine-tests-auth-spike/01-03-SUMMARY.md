---
phase: 01-schema-baseline-engine-tests-auth-spike
plan: 03
subsystem: auth
tags: [better-auth, pg_session_jwt, neon, rls, set-local, spike]

requires:
  - phase: 01-01
    provides: better-auth devDependency
  - phase: 01-02
    provides: applied schema on the Neon project (branch parent)
provides:
  - Verdict for Phase 3 tenancy spine — SET LOCAL request.jwt.claims + RLS (D-04)
  - Proof that pg_session_jwt (v0.5.0) is available on Neon
  - Proof that RLS row-visibility flips on the tenant claim under a NOBYPASSRLS role
  - Proof that SET LOCAL isolates and bare SET leaks across pooled transactions (D-05)
  - Phase 3 role/grant constraints (neondb_owner bypasses RLS; auth schema is cloud_admin-owned)
affects: [03-auth, 03-tenancy, rls]

tech-stack:
  added: []
  patterns: ["Tenant isolation via SET LOCAL request.jwt.claims + current_setting-based RLS policy under a NOBYPASSRLS role"]

key-files:
  created:
    - .planning/phases/01-schema-baseline-engine-tests-auth-spike/01-SPIKE-FINDINGS.md
  modified:
    - remix-app/tsconfig.json

key-decisions:
  - "Verdict: SET LOCAL fallback (D-04) is the recommended M1 tenancy path — proven, role-agnostic, needs no Neon Authorize setup"
  - "JWK-native jwt_session_init deferred: requires Neon Authorize/Data API (authenticated role + JWKS provider), out of the ~1-day timebox (D-03)"
  - "Throwaway spike code (spikes/auth-rls/*) deleted after the verdict; disposable Neon branch torn down (D-03)"

patterns-established:
  - "Disposable Neon branch via the project-scoped Neon API for throwaway DB experiments"

requirements-completed: []

duration: ~75 min (incl. provisioning + iterative RLS discovery)
completed: 2026-06-08
---

# Phase 01 Plan 03: Better-Auth ↔ Neon RLS Spike Summary

**Verdict for Phase 3: use the SET LOCAL `request.jwt.claims` + RLS pattern (D-04) under a dedicated NOBYPASSRLS role — proven end-to-end on a disposable Neon branch, including the SET-LOCAL-vs-SET leak distinction (D-05); the JWK-native pg_session_jwt path is viable but needs Neon's Authorize feature and is deferred.**

## Performance

- **Duration:** ~75 min
- **Completed:** 2026-06-08
- **Tasks:** 3 (1 build + 2 human-gated, run via NEON_API_KEY)
- **Deliverable:** 01-SPIKE-FINDINGS.md

## Accomplishments
- Provisioned a disposable Neon branch (`spike-auth-rls`) via the project-scoped Neon API and enabled `pg_session_jwt` (v0.5.0) — resolves Open Question 3 (extension IS available).
- Proved `auth.session()`/`auth.user_id()` read `request.jwt.claims` set via `SET LOCAL`.
- Proved the **RLS row-visibility flip** under a `NOBYPASSRLS` role (claim tenant-a → only tenant-a row; tenant-b → only tenant-b).
- Proved **D-05**: `SET LOCAL` does not leak across sequential transactions on one pooled connection; bare `SET` does.
- Surfaced Phase 3 constraints: `neondb_owner` has BYPASSRLS; the `auth` schema is `cloud_admin`-owned (custom roles can't be granted USAGE → use a `current_setting`-based policy or enable Neon Authorize); policies must guard empty claims with `NULLIF(...,'')`.
- Tore down: dropped the throwaway objects, **deleted the Neon branch**, and **deleted the throwaway spike code**.

## Task Commits

1. **Task 1: Provision disposable branch** - operational (Neon API; no commit)
2. **Task 2: Build throwaway harness** - throwaway (not committed, D-03); supporting `984dfef` (chore: tsconfig exclude spikes/)
3. **Task 3: Run spike + verdict + teardown** - deliverable committed as 01-SPIKE-FINDINGS.md

## Files Created/Modified
- `.planning/.../01-SPIKE-FINDINGS.md` - the verdict + Phase 3 implications (committed)
- `remix-app/tsconfig.json` - excludes spikes/ from typecheck (kept; forward-useful)
- `remix-app/spikes/auth-rls/*` - throwaway harness, created then DELETED per D-03

## Decisions Made
- SET LOCAL fallback (D-04) is the M1 verdict; JWK-native deferred to Phase 3 (needs Neon Authorize).

## Deviations from Plan

### Rule 1 — plan assumptions corrected by empirical spike findings
- **Provisioning automated via Neon API** rather than a manual dashboard branch (user supplied a project-scoped `NEON_API_KEY`); branch created and torn down programmatically.
- **RLS policy predicate switched from `auth.session()` to `current_setting('request.jwt.claims')`** for the demonstration, because the `auth` schema is `cloud_admin`-owned and `neondb_owner` cannot grant a custom role USAGE on it (the `auth.session()` path needs Neon's Authorize-provisioned `authenticated` role). The `current_setting` predicate is role-agnostic and became the recommended M1 path.
- **JWK-native `jwt_session_init` not exercised** (Better-Auth JWT → pg_session_jwt verification) — it requires enabling Neon Authorize within the timebox; per D-04 the spike fails closed to the proven SET LOCAL path and records that as the verdict.

---

**Total deviations:** 3 (provisioning method, policy predicate, JWK path deferral) — all within D-03/D-04 scope; the verdict is stronger and better-evidenced than the plan anticipated.

## Issues Encountered
- Iterative discovery of the BYPASSRLS / `auth`-schema-ownership constraints (documented as Phase 3 findings). Resolved by demonstrating the flip via a `current_setting`-based policy under a `NOBYPASSRLS` role.

## Next Phase Readiness
- Phase 3 has a proven, de-risked tenancy seam + concrete role/grant/policy requirements. The headline M1 unknown is settled.

---
*Phase: 01-schema-baseline-engine-tests-auth-spike*
*Completed: 2026-06-08*
