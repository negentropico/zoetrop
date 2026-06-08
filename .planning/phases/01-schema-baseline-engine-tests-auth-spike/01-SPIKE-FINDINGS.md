# Auth/RLS Spike Findings

**Spike date:** 2026-06-08
**Run against:** disposable Neon branch `spike-auth-rls` (br-rough-rice-aexcqurz) on project `orange-paper-97068012` (zoetrop1) — torn down after this note.
**pg_session_jwt:** available, **v0.5.0** (resolves Open Question 3 / Assumption A5 — extension installs via `CREATE EXTENSION`).

## Verdict: **SET LOCAL `request.jwt.claims` + RLS (D-04 path)** — recommended for M1

The JWK-native `pg_session_jwt` path is real and the extension is present, but the
clean, role-agnostic, fully-proven path on Neon today is the **SET LOCAL claims**
pattern. The app layer verifies the Better-Auth session, then sets the tenant/subject
claims with `SET LOCAL request.jwt.claims` inside the request transaction; an RLS
policy keyed on the claim enforces isolation. This is the D-04 fallback, and the spike
proves it works end-to-end.

## Verdict Details
- [x] Claims readable inside a transaction via `auth.session()` / `auth.user_id()` (they read `request.jwt.claims`): **YES** — `auth.session()` returned `{sub, tenantId}`, `auth.user_id()` returned the sub.
- [x] Row visibility flips on the tenant claim: **YES** — under a `NOBYPASSRLS` role, claim `tenant-a` → only the tenant-a row; claim `tenant-b` → only the tenant-b row.
- [x] `SET LOCAL` isolation confirmed (no cross-transaction leak): **YES** — `SET LOCAL` did NOT leak into the next transaction on the same pooled connection; bare `SET` DID leak. (D-05 satisfied.)
- [~] Better-Auth JWT verified by `pg_session_jwt` (JWK-native `jwt_session_init`): **NOT EXERCISED in the timebox** — see "JWK-native path" below. Not needed for the recommended M1 path.

## Key Findings (drive Phase 3)

1. **The app DB role must be `NOBYPASSRLS`.** Neon's `neondb_owner` has `rolbypassrls = true` (and is the table owner), so RLS is silently bypassed for it even with `FORCE ROW LEVEL SECURITY`. The flip only appeared once queries ran as a dedicated `NOSUPERUSER NOBYPASSRLS` role via `SET LOCAL ROLE`. Phase 3 must run tenant-scoped queries as such a role (or `SET LOCAL ROLE` to one), never as `neondb_owner`.

2. **`FORCE ROW LEVEL SECURITY` is required** if the querying role could ever be the table owner; `ENABLE` alone is not enough for owners.

3. **The `auth` schema is owned by Neon's internal `cloud_admin`** (ACL `{cloud_admin=UC/cloud_admin}`). `neondb_owner` **cannot** grant `USAGE` on it to a custom role (the grant silently no-ops — `has_schema_privilege` stays false). Consequences:
   - A custom app role **cannot** use `auth.session()` in a policy unless Neon's **"Authorize" / Data API** feature is enabled (it provisions the `authenticated` role with the right `auth`-schema grants + a JWKS provider). The `authenticated` role does **not** exist on a plain branch.
   - The **`current_setting('request.jwt.claims', true)` policy predicate needs no `auth` schema** and works for any `NOBYPASSRLS` role — this is why it is the recommended M1 path.

4. **Empty-claims guard.** A policy of the form `current_setting('request.jwt.claims', true)::jsonb ->> 'tenantId'` throws `invalid input syntax for type json` when the GUC is unset/empty. Production policy must use `NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'tenantId'` (NULL → no rows, fail-closed).

## Path Taken for Phase 3

**SET LOCAL fallback (D-04):**
- Better-Auth (app layer) verifies the session; the loader/action extracts `tenantId` + `subjectId`.
- Inside `db.transaction()` (or per-request): `SET LOCAL request.jwt.claims = '{"sub":...,"tenantId":...}'` (parameterized via `set_config(..., true)`), and `SET LOCAL ROLE <app_role>` where `<app_role>` is `NOSUPERUSER NOBYPASSRLS`.
- RLS policies on real tables: `USING ((NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'tenantId') = tenant_id::text)`.
- Use the Drizzle 1.0 RLS API (`withRLS`/`crudPolicy`) once on Drizzle 1.0 (D-02), or hand-write the policies in a migration.

## JWK-native path (deferred, not blocking M1)
`auth.jwt_session_init(jwt)` exists in pg_session_jwt 0.5.0, but verifying a Better-Auth-issued JWT through it requires a configured JWKS provider + the `authenticated` role, which come from enabling Neon's **Authorize/Data API** feature on the project. That setup (register Better-Auth's `/api/auth/jwks` URL as the JWKS provider; use the provisioned `authenticated` role) was out of the ~1-day timebox (D-03). Revisit in Phase 3 only if signature-verified DB-native auth is wanted over the app-layer-verified SET LOCAL path; the latter is sufficient and simpler for M1.

## Phase 3 Implications (summary)
- Provision a dedicated `NOBYPASSRLS` application role; grant it table DML, not ownership.
- Tenancy spine: `withTenantDb` wrapper sets `SET LOCAL ROLE` + `SET LOCAL request.jwt.claims` per transaction (the spike's D-05 result makes `SET LOCAL` mandatory — bare `SET` leaks across the pooler).
- RLS policies read claims via `NULLIF(current_setting('request.jwt.claims', true), '')::jsonb` (fail-closed on missing claim).
- If JWK-native verification is later required, enable Neon Authorize and register the Better-Auth JWKS endpoint; otherwise the app-layer-verified SET LOCAL path stands.
- No secrets, tokens, or connection strings are recorded here; the disposable branch and throwaway spike code were torn down.

---
*Phase: 01-schema-baseline-engine-tests-auth-spike · Plan 03*
