# Phase 3: Identity + Tenancy Scoping - Context

**Gathered:** 2026-06-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 delivers the identity + tenancy **schema** layer for Zoetrop: Better-Auth email/password authentication with an owner/practitioner/client role model, a tenants/users/subjects spine, and `tenantId`/`subjectId` columns (+ composite index + per-subject protocol-version uniqueness) on all 8 data tables — seeded to the owner. A public landing page is added; the rest of the app is gated behind login; signup is invite-only.

**In scope:** Better-Auth config (email/password) + auth schema tables, role enum, tenants/users/subjects tables, `tenantId`/`subjectId` columns on the 8 data tables (backfilled to the owner), invite-only signup, public-landing + private-app routing, session-gated route protection, and removal of the throwaway `PILOT_BASIC_AUTH` gate.

**Out of scope (→ Phase 7):** RLS enable + policies, the `SET LOCAL` `withTenantDb` enforcement wrapper, cross-tenant isolation tests (TEN-02/03), practitioner subject-scoping (AUTH-03), immutable auth/access audit log (AUTH-04). Phase 3 builds the schema so the Phase 7 RLS retrofit is non-breaking; it does NOT enforce isolation at the DB layer yet.

</domain>

<decisions>
## Implementation Decisions

### Registration model
- **D-01:** **Invite-only signup.** The owner account is seeded; new accounts require an invite token/code. No open public signup. (Anticipates adding testers/clients soon.) → Researcher: evaluate Better-Auth's **organization plugin** invitations vs a hand-rolled invite-token table.

### Access / route protection
- **D-02:** **Public landing + private app.** A public landing/marketing page is reachable without login; all dashboard + data routes require a valid session (unauthenticated → login). Today every route is public and the dashboard lives at `/`. Planning must decide the routing split — lean: keep app routes under an authenticated parent `layout()`, landing on a public path (e.g., landing at `/`, app under a gated layout/`/dashboard`).

### Identity + tenancy depth
- **D-03:** **Full spine.** Build the role enum (`owner`/`practitioner`/`client`), `tenants` + `users` + `subjects` tables, AND `tenantId`/`subjectId` columns on all 8 data tables, seeded to the owner (owner = tenant 1, owner-as-subject). Matches the ROADMAP; makes the Phase 7 RLS retrofit non-breaking. Only the `owner` role is exercised in the pilot.
- **D-04:** **Auth = Better-Auth** (already installed, `1.6.14`) with email/password + the Drizzle adapter against the existing Neon project. Strong candidate: Better-Auth's **organization plugin** (orgs = tenants, members, roles, invitations) — would cover D-01 + D-03 in one. Researcher to confirm fit and how its org/member tables relate to our `tenants`/`subjects` model.

### Interim exposure (ops — resolved out-of-band)
- **D-05:** A throwaway HTTP Basic-Auth gate is live on the pilot (`remix-app/app/root.tsx` loader + `headers()` forward + `PILOT_BASIC_AUTH` Vercel env, prod+preview) to lock public exposure until this phase's real auth lands. **MUST be removed during Phase 3** (delete the loader + `headers()` + the Vercel env var) once Better-Auth gating is in place.

### Claude's Discretion
- Better-Auth table layout, session/cookie config, migration structure, and the exact public/private routing mechanism are implementation details for research + planning.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth / tenancy approach (CRITICAL)
- `.planning/phases/01-schema-baseline-engine-tests-auth-spike/01-SPIKE-FINDINGS.md` — the auth/RLS spike. Chosen path: app verifies the Better-Auth session → `SET LOCAL request.jwt.claims` + RLS under a **`NOBYPASSRLS`** role; fail-closed policy via `NULLIF(current_setting('request.jwt.claims', true), '')::jsonb`. The app DB role must NOT be `neondb_owner` (it bypasses RLS). NOTE: RLS *enforcement* is Phase 7 — Phase 3 lays the groundwork (tenant/subject columns + the values the claims will carry). MUST read.

### Scope + requirements
- `.planning/ROADMAP.md` — Phase 3 goal + success criteria (sign-in+roles; columns+composite index; per-subject `(tenantId, subjectId, version)` uniqueness). Phase 7 holds the deferred RLS/BAA hardening.
- `.planning/REQUIREMENTS.md` — Phase 3 closes **AUTH-01, AUTH-02, TEN-01, TEN-04**; TEN-02/TEN-03 (RLS/isolation) + AUTH-03/AUTH-04 (subject-scoping/audit) are Phase 7.
- `docs/PRINCIPLES.md` — engineering constraints (TS strict, no `any`).

### Code to modify
- `remix-app/db/schema.ts` — the 8 data tables that gain `tenantId`/`subjectId`; the new `tenants`/`users`/`subjects` + Better-Auth tables live here.
- `remix-app/app/lib/db.server.ts` — `drizzle-orm/neon-serverless` Pool; the Better-Auth Drizzle adapter + (Phase 7) `withTenantDb` wrapper attach here.
- `remix-app/app/routes.ts` — explicit route table; add auth + landing routes, gate app routes under an authenticated `layout()`.
- `remix-app/app/root.tsx` — REMOVE the throwaway `PILOT_BASIC_AUTH` loader + `headers()` when real auth ships.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `better-auth@1.6.14` already in `remix-app/package.json` — configure it (no install needed). Consider the organization plugin for tenants+roles+invites.
- `app/lib/db.server.ts` — existing Drizzle (neon-serverless `Pool`) client to reuse for the Better-Auth adapter + auth queries.
- `app/components/shell/AppShell.tsx` — wraps the authenticated app; gated routes render inside it, a public landing renders outside it.
- Phase 4.1 brand design system + `UI-SPEC.md` — login/signup/landing pages must be in-brand.

### Established Patterns
- Explicit route table in `app/routes.ts` (`RouteConfig`: index/route/layout) — auth gating via an authenticated parent `layout()` is the idiomatic fit.
- Drizzle migrations baseline committed (Phase 1) — schema changes go through `npm run db:generate` + `db:migrate` against Neon project `orange-paper-97068012`.

### Integration Points
- Neon project `orange-paper-97068012` (8 tables live, connectivity confirmed Phase 2) — migrations add auth + tenancy tables + columns here.
- Vercel env already holds `DATABASE_URL`/`DATABASE_URL_UNPOOLED`/`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` (Phase 2) — Better-Auth reads `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL` at runtime.

</code_context>

<specifics>
## Specific Ideas

- Invite-only + public landing + full tenancy spine signals near-term multi-user (the HIGHER pilot). Build with that trajectory in mind (don't hard-code single-user assumptions), but only the owner is seeded/exercised now.

</specifics>

<deferred>
## Deferred Ideas

- RLS enable + policies, `SET LOCAL` `withTenantDb` enforcement wrapper, cross-tenant isolation tests → **Phase 7** (TEN-02/03).
- Practitioner subject-scoping (AUTH-03), immutable auth/access audit log (AUTH-04) → **Phase 7**.
- Remove the throwaway `PILOT_BASIC_AUTH` gate (`root.tsx`) → during Phase 3 execution, once Better-Auth gating is live.
- JWK-native `pg_session_jwt` verification (Neon Authorize/Data API) → deferred per spike; revisit only if DB-native signature verification is wanted over the app-layer `SET LOCAL` path.

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 3-identity-tenancy-scoping*
*Context gathered: 2026-06-08*
