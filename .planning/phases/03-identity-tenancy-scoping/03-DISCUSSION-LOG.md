# Phase 3: Identity + Tenancy Scoping — Discussion Log

**Date:** 2026-06-08
*Human-reference record of the discuss-phase session. Not consumed by downstream agents (see 03-CONTEXT.md for the canonical decisions).*

## Trigger
User: "ok! now need auth on this app." → routed to Phase 3 (Identity + Tenancy Scoping), the now-unblocked engine-path next step. Flagged that the live pilot (`zoetrop.vercel.app`) was 100% public.

## Carried forward (locked — not re-discussed)
- `better-auth@1.6.14` already installed; email/password (AUTH-01).
- Spike (01-SPIKE-FINDINGS.md): SET LOCAL `request.jwt.claims` + RLS under a NOBYPASSRLS role, fail-closed policy. RLS enforcement itself deferred to Phase 7.
- Role enum owner/practitioner/client (AUTH-02).
- Phase 3 = AUTH-01/02 + TEN-01/04 (columns); TEN-02/03 + AUTH-03/04 → Phase 7.

## Gray areas presented → user selected all four

### 1. Registration model
Options: Seeded owner (no signup) / **Invite-only** / Open public signup.
**Selected:** Invite-only. → D-01.

### 2. What gets locked
Options: Entire app private / **Public landing + private app**.
**Selected:** Public landing + private app. → D-02.

### 3. Roles + tenancy depth
Options: **Full spine** / Lean / Minimal auth-only.
**Selected:** Full spine (role enum + tenants/users/subjects + columns, seeded to owner). → D-03.

### 4. Interim lock (urgent)
Options: **Yes, lock now** / No.
**Selected:** Yes. Follow-up: Vercel-native protection (SSO + Password) both 428'd — require the paid "Advanced Deployment Protection" add-on (not included in Pro). User chose the **free Basic-Auth edge gate**. → D-05.
**Action taken:** shipped throwaway HTTP Basic-Auth on `root.tsx` (loader + `headers()` re-export of `WWW-Authenticate`) gated on `PILOT_BASIC_AUTH` (Vercel prod+preview). Verified: 401 + browser dialog for public, 200 with creds. Commits `d16831d`, `dcceb…`. MUST be removed in Phase 3.

## Deferred / redirected
- No scope creep. RLS/isolation, AUTH-03/04 → Phase 7 (already in roadmap).

## Notes
- Choices (invite-only + public landing + full spine) indicate near-term multi-user intent (HIGHER pilot) — build with that trajectory, seed/exercise owner only.
- Strong research lead: Better-Auth **organization plugin** (orgs=tenants, members, roles, invitations) may cover D-01 + D-03 + D-04 together.

---
*Phase: 3-identity-tenancy-scoping*
