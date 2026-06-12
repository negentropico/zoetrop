# Phase 7: Supabase Migration + RLS/Auth Consolidation + PHI Hardening — Research

**Researched:** 2026-06-12
**Domain:** Supabase migration, Postgres RLS, Better-Auth interop, HIPAA compliance
**Confidence:** MEDIUM (Supabase API verified via official docs; HIPAA pricing confirmed at multiple sources; Better-Auth+RLS pattern verified via community and official Drizzle RLS docs; exact JWT wire-up is MEDIUM due to Supabase's evolving auth hook API)

---

## Re-Scoped Phase Statement

The ROADMAP entry for Phase 7 describes Neon HIPAA-mode + pgAudit verification + SET LOCAL wrapper — all Neon-specific framing. That framing is **stale**. The user confirmed on 2026-06-12 that Phase 7 is now:

**Neon → Supabase migration + RLS/auth consolidation + PHI hardening (pre-first-external-client gate)**

This research is scoped to the Supabase-native equivalents of COMP-02, COMP-03, TEN-02, TEN-03, AUTH-03, AUTH-04. Every reference to "Neon HIPAA-mode," "Neon BAA," or "Neon Scale plan" in the ROADMAP is superseded.

---

## Summary

Five decision areas govern this phase, each with a hard dependency chain. The pivotal decision is the auth seam: whether Better-Auth is replaced by Supabase Auth (GoTrue), kept as the sole auth layer (Supabase used as a plain Postgres host), or wired in a hybrid where Better-Auth issues session cookies but also mints Supabase-signed JWTs for the DB's RLS evaluator. This decision determines the RLS mechanism, the migration scope for the invite/role model, and the compliance envelope.

The migration itself (Neon → Supabase) is mechanically straightforward — `pg_dump` / `psql` restore with minor schema fixups — but the connection driver changes (from `@neondatabase/serverless` to `postgres-js` with `prepare: false`) require touching `db.server.ts` and `drizzle.config.ts`. Supabase's Supavisor pooler is the functional equivalent of Neon's serverless pool for Vercel.

HIPAA on Supabase requires the **Team plan ($599/mo) + HIPAA add-on (~$350/mo)** totaling ~$950/mo before compute. This is a material cost decision. The HIPAA add-on enables the BAA, High Compliance project mode, PITR, SSL enforcement, and Network Restrictions. Supabase's pgAudit support is self-serve and configurable; object-level SELECT logging on PHI tables is achievable but `pgaudit.log_parameter` is intentionally disabled by Supabase (pgsodium safety).

**Primary recommendation:** Keep Better-Auth, use Supabase as a plain Postgres host for the migration, and wire RLS via a `withTenantDb` wrapper that issues `set_config('request.jwt.claims', ...)` + `SET LOCAL ROLE authenticated` per-transaction using the Supabase JWT secret. This avoids rewriting the invite/role model while satisfying RLS isolation.

**Scope recommendation:** This is likely two phases, not one. The discuss-phase must decide the split point.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Authentication (sign-in, session, invite) | API / Backend (Better-Auth) | — | Already established; Better-Auth owns sessions + cookies |
| Authorization (role, RBAC, subject access) | API / Backend (authz.server.ts) | DB (RLS) | App layer enforces role; DB layer is the isolation backstop |
| Tenant/subject context to DB | API / Backend (withTenantDb) | — | Must be per-request; the wrapper issues SET LOCAL |
| RLS policy evaluation | Database / Storage (Supabase Postgres) | — | Postgres enforces the policy; app layer can't substitute |
| PHI audit logging (SELECT-level) | Database / Storage (pgAudit) | API / Backend (auditLog table) | DB-level for tamper resistance; app-level for workflow events |
| BAA / compliance envelope | Infrastructure (Supabase Team + HIPAA add-on) | Vercel (HIPAA add-on) + Anthropic BAA | All three subprocessors must be covered before client PHI |
| Migration (Neon→Supabase) | Infrastructure / Operations | API / Backend (db.server.ts driver swap) | Connection driver, env vars, drizzle.config change |

---

## Decision Area 1: The Auth Seam (Pivotal)

This is the gate decision. Everything downstream depends on it.

### Option A — Replace Better-Auth with Supabase Auth (GoTrue)

**What it means:** Rip out `auth.server.ts`, `auth-client.ts`, `invites.server.ts`, the `drizzleAdapter`, all `databaseHooks`, the `beforeSignUp` invite gate, the `pendingInvite` request-state slot, and the `OWNER_INVITE_TOKEN` break-glass path. Reimplement the invite/role model using Supabase Auth's invite API + custom Access Token hook + user metadata.

**Tradeoffs:**
- Pro: RLS works out of the box — `auth.uid()` and `auth.jwt()` are populated automatically by Supabase's PostgREST layer. No JWT exchange plumbing needed.
- Pro: Supabase Auth natively supports email invites (inviteUserByEmail) and user metadata for roles/tenants.
- Con: The Phase 3.1 invite model is highly customized — single-use hash-at-rest, role-scoped, 7-day-expiring, atomic burn adjacent to user create, break-glass-hardened. Replicating all this in GoTrue's user metadata + custom hook is non-trivial and the semantics differ.
- Con: GoTrue has no per-invite `consumedAt` / `revokedAt` state machine. The `invites` table (token_hash, role, tenant_id, consumed_at, revoked_at) would need to be kept anyway as a shadow table.
- Con: Supabase Auth is owned by the Supabase project; Better-Auth is self-hosted in the repo with full source visibility. Switching auth systems mid-project carries session invalidation risk for the owner's existing session.
- Con: The Remix session handling (`auth.api.getSession`) is wired to Better-Auth's cookie model. Supabase Auth uses a different session/cookie flow (access_token + refresh_token in cookies or localStorage). All 16 authenticated loaders + `_app/layout.tsx` would need rewiring.
- Risk: HIGH rewrite scope. Estimated disruption: 10–15 files across auth.server.ts, routes, loaders.

**Recommendation:** NOT recommended for Phase 7. The existing invite model is battle-tested (Phase 3.1); the Remix integration is deep. Switching auth systems at the same time as migrating DB + enabling RLS is a compounding risk surface.

### Option B — Keep Better-Auth; Supabase is a Plain Postgres Host (No RLS via GoTrue)

**What it means:** Supabase is used only for its Postgres + HIPAA infrastructure. The RLS enforcement mechanism is a `SET LOCAL` wrapper per-request (identical to the original Neon plan), but using `set_config('request.jwt.claims', ...)` + `SET LOCAL ROLE authenticated` signed with the **Supabase JWT secret** rather than a Neon-specific mechanism.

The `withTenantDb(tenantId, subjectId, fn)` wrapper mentioned in the Phase 3/4 comments becomes the implementation point. Each call:
1. Mints (or caches) a short-lived Supabase-signed JWT containing `{ sub: userId, tenant_id: tenantId, subject_id: subjectId, role: "authenticated" }` — signed with the `SUPABASE_JWT_SECRET`.
2. Wraps the Drizzle calls in a Postgres transaction that issues `SELECT set_config('request.jwt.claims', $claims, TRUE)` + `SET LOCAL ROLE authenticated`.
3. RLS policies on each table use `auth.jwt() ->> 'tenant_id'` and `auth.jwt() ->> 'subject_id'`.

The corpus tables (non-PHI, no tenantId) use the service role bypass path — connect with a direct Drizzle client using the service role JWT or Postgres superuser credentials (never exposed to client).

**Tradeoffs:**
- Pro: Zero rewrite of Better-Auth's invite model, session handling, or Remix loader wiring.
- Pro: The `getDb()` → `withTenantDb()` retrofit boundary was deliberately designed for this pattern (comments in `data.server.ts`, `consent.server.ts`).
- Pro: The Phase 1 spike (`01-SPIKE-FINDINGS.md`) already validated `SET LOCAL` + NOBYPASSRLS — the only difference is signing the JWT with Supabase's secret instead of relying on Neon's JWK endpoint.
- Con: Requires a new server-side JWT signing step per-request (or per-session with short-lived tokens). The `SUPABASE_JWT_SECRET` must be in the Vercel env and treated as a highly privileged secret.
- Con: Does not use `auth.uid()` in RLS policies (since GoTrue doesn't issue the JWT). Must use `auth.jwt() ->> 'tenant_id'` custom claims. This is a supported pattern but less idiomatic than GoTrue-native.
- Con: Supabase dashboard "Table Editor" / "SQL Editor" won't understand the app's user model without extra configuration.
- Risk: LOW to existing application code. Medium implementation effort for `withTenantDb`.

**Recommendation:** RECOMMENDED. This is the path of least disruption and directly honors the retrofit boundary already coded into the data layer.

### Option C — Hybrid: Better-Auth Sessions + Supabase Auth as Shadow Identity

**What it means:** Keep Better-Auth for Remix session management. Also provision GoTrue users (mirrored via Better-Auth databaseHooks) so that `auth.uid()` works in RLS policies. JWTs passed to Postgres come from GoTrue.

**Tradeoffs:**
- Pro: RLS uses native `auth.uid()` — the most idiomatic Supabase pattern.
- Con: Dual identity systems. User IDs in Better-Auth (UUIDs from `crypto.randomUUID()`) differ from GoTrue UUIDs unless explicitly synchronized. Drift is a maintenance burden.
- Con: GoTrue's invite/sign-up flow still needs to be suppressed or mirrored; the custom Phase 3.1 invite model remains in tension.
- Risk: HIGH complexity for marginal benefit over Option B.

**Recommendation:** NOT recommended.

### Auth Seam Decision Summary

| Option | Invite Model Disruption | Remix Loader Disruption | RLS Mechanism | Recommended |
|--------|------------------------|------------------------|---------------|-------------|
| A (Replace BA with GoTrue) | HIGH | HIGH | auth.uid() native | No |
| B (Keep BA, custom JWT) | None | None (getDb→withTenantDb only) | auth.jwt() custom claims | Yes |
| C (Hybrid) | Medium | Low | auth.uid() native | No |

---

## Decision Area 2: RLS Model

Assumes Option B (Better-Auth kept, custom JWT signing).

### How Tenant Claims Reach Postgres RLS

**The withTenantDb wrapper pattern** (Drizzle + Supabase, confirmed via rphlmr/drizzle-supabase-rls and Drizzle's official RLS docs [CITED: orm.drizzle.team/docs/rls]):

```typescript
// lib/db.server.ts — new withTenantDb addition
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sign } from 'jose'; // or jsonwebtoken

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
export const getDb = () => drizzle(client, { schema });

export async function withTenantDb<T>(
  ctx: { userId: string; tenantId: string; subjectId: string },
  fn: (db: ReturnType<typeof getDb>) => Promise<T>
): Promise<T> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const claims = JSON.stringify({
      sub: ctx.userId,
      tenant_id: ctx.tenantId,
      subject_id: ctx.subjectId,
      role: 'authenticated',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60, // 60-second window
    });
    await tx.execute(sql`
      SELECT set_config('request.jwt.claims', ${claims}, TRUE);
      SET LOCAL ROLE authenticated;
    `);
    return fn(tx);
  });
}
```

**RLS policy pattern per table:**

```sql
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics FORCE ROW LEVEL SECURITY;  -- applies even to superuser roles (except BYPASSRLS)

CREATE POLICY "tenant_subject_isolation" ON metrics
  FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')
    AND subject_id = (auth.jwt() ->> 'subject_id')
  )
  WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')
    AND subject_id = (auth.jwt() ->> 'subject_id')
  );
```

**Non-PHI corpus tables** (geneticVariants, variantProtocolMap, metricProtocolMap) have no tenantId. These should be accessed via the admin/service-role path (bypass RLS) since they are population-level knowledge, not subject data. The `corpus.server.ts` comment already confirms this: "corpus tables are population-level non-PHI. They do NOT need the withTenantDb() retrofit from Phase 7."

**Auth tables** (user, session, account, verification, invites) are managed by Better-Auth via `getDb()` (service-role equivalent, no RLS). These tables must NOT have tenant-scoped RLS or Better-Auth's internal queries will fail.

### Original SET LOCAL Plan vs Supabase Custom JWT

| Aspect | Original Neon Plan (SET LOCAL app.current_tenant) | Supabase Custom JWT Plan |
|--------|--------------------------------------------------|--------------------------|
| Mechanism | `SET LOCAL app.current_tenant_id = $1` | `set_config('request.jwt.claims', $claims, TRUE)` |
| RLS reads claims via | `current_setting('app.current_tenant_id')` | `auth.jwt() ->> 'tenant_id'` |
| JWT signing required | No | Yes (SUPABASE_JWT_SECRET) |
| Pool leak risk | SET LOCAL is transaction-scoped (safe) | set_config with TRUE is transaction-scoped (safe) |
| Native Supabase support | No | Yes — auth.jwt() is a first-class Supabase function |

Both approaches use transaction-scoped config, so pool-reuse context leak is not a risk with either.

### Cross-Tenant Isolation Test Strategy

A cross-tenant isolation test must:
1. Insert rows for Tenant A + Subject A.
2. Create a `withTenantDb` call scoped to Tenant B + Subject B.
3. Assert that the Tenant B query returns zero rows.
4. Insert via withTenantDb(B) with a `tenant_id` mismatch — assert the WITH CHECK policy rejects it.

This test requires a live Supabase connection (cannot mock at the Drizzle level). It must run in CI gated by `DATABASE_URL` presence, using a test-only tenant pair created in the test setup and cleaned up after.

### Tables Requiring RLS

All 8 original data tables + Phase 5–6 additions that are tenant/subject-scoped:

| Table | Has tenantId | Has subjectId | RLS needed |
|-------|-------------|--------------|------------|
| metrics | yes | yes | yes |
| protocol_versions | yes | yes | yes |
| protocol_changes | yes | yes | yes |
| milestones | yes | yes | yes |
| supplements | yes | yes | yes |
| supplement_log | yes | yes | yes |
| correlations | yes | yes | yes |
| cessation_log | yes | yes | yes |
| subject_genotypes | yes | yes | yes |
| lab_documents | yes | yes | yes |
| lab_extractions | yes | yes | yes |
| audit_log | yes | yes | yes |
| consent_log | no | yes | subject-only |
| reports | yes | yes | yes |
| invites | yes | no | tenant-only (Better-Auth managed, may skip RLS) |
| tenants | no | no | no (admin-only) |
| subjects | yes | no | tenant-only |
| user (BA) | no | no | no (Better-Auth managed) |
| session (BA) | no | no | no (Better-Auth managed) |
| genetic_variants | no | no | no (non-PHI corpus) |
| variant_protocol_map | no | no | no (non-PHI corpus) |
| metric_protocol_map | no | no | no (non-PHI corpus) |

---

## Decision Area 3: Migration Strategy (Neon → Supabase)

### Scope

- 10 Drizzle migrations (0000–0009) applied to live Neon project `orange-paper-97068012`
- All owner data: M0 metrics, protocol versions, supplements, cessation log, correlations, genotypes
- Phase 5–6 data: lab_documents, lab_extractions, audit_log, consent_log, genetic_variants, variant_protocol_map, metric_protocol_map, reports
- Better-Auth tables: user, session, account, verification, invites

### Recommended Approach: pg_dump / psql restore

[CITED: supabase.com/docs/guides/platform/migrating-to-supabase/neon]

```bash
# Step 1: Export from Neon (use direct/unpooled URL)
pg_dump "$DATABASE_URL_UNPOOLED" \
  --clean \
  --if-exists \
  --quote-all-identifiers \
  --no-owner \
  --no-privileges \
  > neon-dump.sql

# Step 2: Import to Supabase (use SESSION pooler or direct URL)
psql "$SUPABASE_DIRECT_URL" -f neon-dump.sql
```

**Known schema fixups required** [MEDIUM confidence — from community reports, not official docs]:
- Supabase stores extensions in the `extensions` schema, not `public`. If the Neon dump contains `CREATE EXTENSION ... WITH SCHEMA public`, change to `extensions`.
- Drizzle's `CREATE TYPE ... AS ENUM(...)` in the migration files will collide with the dump if re-run via `drizzle-kit migrate` after restore. Options: (a) skip running migrations after restore (the dump includes the schema), or (b) delete migration history and re-baseline.
- The `_drizzle_migrations` tracking table needs to be inspected after restore — if the dump includes it, Drizzle will believe all migrations were already run. This is correct; do not re-run.

### Connection Driver Change

The current `db.server.ts` uses `@neondatabase/serverless` with `Pool`. Supabase requires `postgres-js` with `prepare: false`.

```typescript
// BEFORE (Neon)
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// AFTER (Supabase)
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client, { schema });
```

New packages: `postgres` (runtime dep). Remove: `@neondatabase/serverless`.

### Connection String Structure (Supabase)

| Use | URL | Port | prepare |
|-----|-----|------|---------|
| Application queries (Vercel serverless) | Transaction pooler (Supavisor) | 6543 | false |
| Migrations (drizzle-kit) | Direct connection | 5432 | (n/a) |

`DATABASE_URL` → Transaction pooler URL (port 6543, `prepare: false`)
`DATABASE_URL_UNPOOLED` → Direct connection URL (port 5432, migrations only)

`drizzle.config.ts` already uses `DATABASE_URL_UNPOOLED || DATABASE_URL` — this is correct; just update the values.

### Environment Variable Changes

| Old Variable | New Variable | Note |
|--------------|-------------|------|
| `DATABASE_URL` (Neon pooled) | `DATABASE_URL` (Supabase Transaction pooler 6543) | Update in Vercel + .env |
| `DATABASE_URL_UNPOOLED` (Neon direct) | `DATABASE_URL_UNPOOLED` (Supabase direct 5432) | Update in Vercel + .env |
| — | `SUPABASE_SERVICE_ROLE_KEY` | Already staged in repo root .env |
| — | `SUPABASE_JWT_SECRET` | New: needed for withTenantDb JWT signing |
| — | `SUPABASE_URL` | New: needed if using any Supabase client SDK |

`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `OWNER_INVITE_TOKEN`, `OWNER_TENANT_ID`, `ANTHROPIC_API_KEY` are unchanged.

### Cutover / Rollback

Recommended approach: Supabase branch feature (or a separate Supabase project for staging) to validate before cutting over production.

Rollback path: The Neon project remains live until the Supabase restore is verified. Switching back is a `DATABASE_URL` env var change + Vercel redeploy.

Downtime window: The migration can be done with a read-only maintenance window. Estimated downtime: < 30 minutes for the current data volume (owner's own data, small tables).

### Data Integrity Verification

Post-restore checks:
1. Row counts: `SELECT COUNT(*) FROM metrics` etc. — compare against Neon.
2. Enum types: `\dT+` in psql — all 11 custom enums present.
3. Foreign key constraints: `\d+ metrics` — all FKs intact.
4. Indexes: `SELECT schemaname, tablename, indexname FROM pg_indexes WHERE schemaname = 'public'` — composite tenant/subject indexes present.
5. Better-Auth tables: owner user row present, session valid.

---

## Decision Area 4: PHI / BAA on Supabase

### Plan Requirements

[CITED: supabase.com/docs/guides/platform/hipaa-projects, supabase.com/pricing, github.com/orgs/supabase/discussions/35594]

| Requirement | Details |
|-------------|---------|
| Minimum plan | **Team Plan** ($599/mo base) |
| HIPAA add-on | ~**$350/mo** additional (confirmed August 2025 pricing) |
| Total minimum | ~$950/mo for Supabase alone (before compute add-ons) |
| BAA | Signed via Supabase dashboard by Team/Enterprise customers |
| What it enables | "High Compliance" project mode, additional security checks, PITR required, SSL Enforcement required, Network Restrictions required |

**This is a material cost decision.** The discuss-phase must confirm the user accepts ~$950/mo for Supabase (vs Neon's current standard-tier cost) before this work is scoped.

### Required HIPAA Project Configuration

1. **Point-in-Time Recovery (PITR)** — requires at least a "small" compute add-on (~$10–25/mo additional)
2. **SSL Enforcement** — toggle in dashboard; no extra cost
3. **Network Restrictions** — restrict inbound to Vercel's outbound IPs + developer IPs; dashboard-managed
4. **MFA** on all Supabase dashboard accounts

### pgAudit on Supabase

[CITED: supabase.com/docs/guides/database/extensions/pgaudit]

Supabase pgAudit is self-serve (enable via SQL or dashboard). No Neon Support ticket required (unlike the Neon HIPAA plan where pgAudit was "auto-configured by Neon" per COMPLIANCE-RUNBOOK.md comments).

**Critical difference from Neon:** `pgaudit.log_parameter` is **intentionally disabled** by Supabase because enabling it would expose values from pgsodium-encrypted columns in logs. The Phase 7 SC4 requirement ("pgAudit verified: log_parameter = off") is already satisfied by Supabase's design — Supabase never logs parameters. Document this in COMPLIANCE-RUNBOOK.md.

**Object-level SELECT logging on PHI tables:**

```sql
-- Create an auditor role
CREATE ROLE phi_auditor NOINHERIT;

-- Grant SELECT on PHI tables (not corpus/auth tables)
GRANT SELECT ON metrics TO phi_auditor;
GRANT SELECT ON lab_documents TO phi_auditor;
GRANT SELECT ON lab_extractions TO phi_auditor;
GRANT SELECT ON reports TO phi_auditor;
GRANT SELECT ON subject_genotypes TO phi_auditor;

-- Direct pgAudit to log via this role
ALTER ROLE postgres SET pgaudit.role TO 'phi_auditor';

-- Enable pgAudit
CREATE EXTENSION IF NOT EXISTS pgaudit;
```

This achieves PHI read-access (SELECT) logging per the stale ROADMAP SC6 requirement, without needing Neon Support.

**Platform-level audit logs:** Supabase provides platform audit logs (dashboard actions, project config changes) separately from pgAudit. These cover compliance-relevant admin events.

### Vercel BAA

[ASSUMED — based on training knowledge] Vercel HIPAA add-on is a self-serve Pro plan feature (confirmed in Phase 2 notes as "self-serve Pro add-on"). Still required. The COMPLIANCE-RUNBOOK.md already scaffolds this.

### Anthropic BAA

[ASSUMED — based on training knowledge] Anthropic offers HIPAA-Ready / BAA coverage. This is DECISION-02 deferred from earlier phases. Required before any external client's PHI is processed by the lab ingest LLM extraction. The COMPLIANCE-RUNBOOK.md already scaffolds this.

### Re-scoped Requirement Mapping

| Old Neon-Framed Requirement | Supabase Equivalent |
|-----------------------------|---------------------|
| COMP-02: Neon BAA + Neon HIPAA-mode | Supabase Team plan + HIPAA add-on + BAA signed via dashboard |
| COMP-03: pgAudit verified (Neon Support sample) | Supabase pgAudit self-serve; log_parameter=off by design; object-level audit role created for PHI tables |
| TEN-02: RLS prevents cross-tenant reads | Supabase RLS policies using auth.jwt() custom claims; cross-tenant isolation test in CI |
| TEN-03: SET LOCAL per-request, no pool leak | withTenantDb wrapper using set_config(TRUE) (transaction-scoped) + SET LOCAL ROLE authenticated |
| AUTH-03: Practitioner sees only assigned subjects | Application layer assertSubjectAccess + (new) practitioner→subject assignment table or column |
| AUTH-04: Immutable auth/access audit log | auditLog table (already exists, Phase 5) + pgAudit platform audit logs; immutability via no-delete RLS policy on audit_log |

---

## Decision Area 5: Scope Shape — One Phase or Two?

### Arguments for One Phase

- The migration + RLS + BAA are tightly coupled: you cannot enable RLS before migrating, and you cannot sign the BAA before having the Supabase project.
- The "pre-client gate" framing is a single compliance gate, not a feature release.

### Arguments for Two Phases

- Scope: DB migration + driver swap + env var change + RLS enable on 14 tables + withTenantDb implementation + cross-tenant isolation test + auth seam decision + pgAudit + BAA paperwork + Vercel BAA + Anthropic BAA = very large phase.
- Risk profile differs: the migration (Phase 7a) carries infrastructure risk; the RLS/compliance hardening (Phase 7b) carries correctness/security risk. Mixing them means a migration failure can block the compliance work.
- The ROADMAP note says "Plan when approaching multi-client launch" — the BAA/pgAudit work can be deferred another week if the migration + RLS work needs stabilization time.

**Proposed split:**

| Phase | Scope | Gate |
|-------|-------|------|
| 7a (Migration + Auth Seam) | Neon→Supabase pg_dump restore, driver swap, env vars, withTenantDb wrapper, RLS enable+policies on all tenant-scoped tables, cross-tenant isolation test | Supabase project live, RLS green, isolation test passing |
| 7b (BAA + Compliance Envelope) | Team plan upgrade, HIPAA add-on + BAA, PITR + SSL + Network Restrictions, pgAudit object-level logging, Vercel BAA, Anthropic BAA, COMPLIANCE-RUNBOOK.md complete | All BAAs signed, pgAudit verified, runbook complete — pre-client gate satisfied |

The discuss-phase must decide whether 7a and 7b are planned together or sequentially.

---

## Standard Stack

### Core Changes from Neon Stack

| Component | FROM (Neon) | TO (Supabase) |
|-----------|------------|---------------|
| DB driver | `@neondatabase/serverless` + `Pool` | `postgres` (postgres-js) |
| Drizzle driver import | `drizzle-orm/neon-serverless` | `drizzle-orm/postgres-js` |
| Connection pooling | Neon serverless HTTP pooler | Supavisor (Transaction mode, port 6543, prepare:false) |
| JWT for RLS | (unused, SET LOCAL planned) | `jose` or `jsonwebtoken` — sign with SUPABASE_JWT_SECRET |
| Migrations connection | `DATABASE_URL_UNPOOLED` (Neon direct) | `DATABASE_URL_UNPOOLED` (Supabase direct, port 5432) |

### Package Changes

**Add:**
```bash
npm install postgres
npm install jose  # for JWT signing in withTenantDb
```

**Remove:**
```bash
npm uninstall @neondatabase/serverless
```

`drizzle-orm` and `drizzle-kit` versions are unchanged — they support both drivers.

### Package Legitimacy Audit

| Package | Registry | Notes | Disposition |
|---------|----------|-------|-------------|
| `postgres` | npm | Mature postgres-js driver, widely used, official Drizzle recommendation | Approved [ASSUMED — not slopcheck-verified] |
| `jose` | npm | Standard JOSE/JWT library, widely used | Approved [ASSUMED — not slopcheck-verified] |

*slopcheck was not available at research time. Both packages are `[ASSUMED]`. The planner must add a checkpoint:human-verify before install.*

---

## Common Pitfalls

### Pitfall 1: Prepared Statements Error in Transaction Mode

**What goes wrong:** Queries fail with "prepared statement already exists" on Supabase.
**Why it happens:** Supavisor Transaction mode (port 6543) does not support prepared statements. `@neondatabase/serverless` handled this automatically; `postgres-js` sends prepared statements by default.
**How to avoid:** `postgres(url, { prepare: false })` — required in `db.server.ts` when using the pooler URL.
**Warning signs:** 503 errors or prepared statement errors on first deploy to Vercel.

### Pitfall 2: RLS WITH CHECK vs USING

**What goes wrong:** RLS blocks legitimate writes even when the tenant context is correctly set.
**Why it happens:** `USING` filters reads; `WITH CHECK` validates writes. If `WITH CHECK` is missing or stricter than needed, INSERTs fail even when the JWT has the right claims.
**How to avoid:** Define both `USING` and `WITH CHECK` clauses on every policy. Test write operations in the cross-tenant isolation test.

### Pitfall 3: SET LOCAL Scope — Must Be Inside a Transaction

**What goes wrong:** `set_config('request.jwt.claims', ..., TRUE)` without a transaction wrapper leaks across connection pool sessions.
**Why it happens:** The third argument to `set_config` being `TRUE` means "local to transaction". If called outside an explicit transaction, it's session-scoped, not transaction-scoped, and can bleed to the next request reusing that connection.
**How to avoid:** `withTenantDb` MUST wrap in `db.transaction()`. Never call `set_config` outside a transaction.

### Pitfall 4: Better-Auth Tables and RLS Conflict

**What goes wrong:** Better-Auth internal queries fail with RLS policy violations.
**Why it happens:** If RLS is enabled on the `user`, `session`, `account`, or `verification` tables, Better-Auth's drizzleAdapter (which uses `getDb()` / service-role equivalent) will hit policies that filter by `auth.jwt()` — but at sign-in time, there is no JWT yet.
**How to avoid:** Do NOT enable RLS on Better-Auth tables (user, session, account, verification, invites). Leave them accessible via the service-role connection path only.

### Pitfall 5: pg_dump Enum Collision with Drizzle Migrations

**What goes wrong:** After restoring the Neon dump and then running `drizzle-kit migrate`, Drizzle tries to create enums that already exist, causing migration failures.
**Why it happens:** The pg_dump includes `CREATE TYPE ... AS ENUM` statements. If `drizzle-kit migrate` is run against the already-restored schema, it replays those statements.
**How to avoid:** After restore, do NOT run `drizzle-kit migrate` — the schema is already in place. Only run it for new schema changes going forward. Verify the `_drizzle_migrations` table is intact from the dump.

### Pitfall 6: Supabase Extension Schema Conflict

**What goes wrong:** `CREATE EXTENSION` statements in the Neon dump fail on Supabase.
**Why it happens:** Supabase places extensions in the `extensions` schema, not `public`. Any `CREATE EXTENSION ... WITH SCHEMA public` in the dump must be changed to `WITH SCHEMA extensions`.
**How to avoid:** Inspect the dump file for `CREATE EXTENSION` statements before importing. The project's current schema is simple (no exotic extensions beyond what's in Supabase by default).

### Pitfall 7: SUPABASE_JWT_SECRET Is a Critical Secret

**What goes wrong:** Anyone with the JWT secret can forge authenticated requests that bypass RLS.
**Why it happens:** The JWT secret is the symmetric key used to sign tokens that Postgres trusts for RLS evaluation.
**How to avoid:** Store only in Vercel environment variables (encrypted at rest). Never in `.env` committed to git. Never log. Rotate if leaked.

### Pitfall 8: Supabase HIPAA Requires PITR (Compute Add-On)

**What goes wrong:** HIPAA configuration is blocked by missing PITR.
**Why it happens:** Point-in-Time Recovery requires a compute add-on on Supabase. If the project is on the free compute tier, PITR cannot be enabled, and the HIPAA security advisor will flag it.
**How to avoid:** Size the compute add-on (minimum "Small") when creating the HIPAA project.

---

## Architecture Patterns

### withTenantDb Retrofit Boundary

The existing code already isolates `getDb()` to three files: `data.server.ts`, `consent.server.ts`, and `corpus.server.ts`. The retrofit is surgical:

```
data.server.ts      → replace getDb() calls with withTenantDb(ctx, fn)
consent.server.ts   → replace getDb() calls with withTenantDb(ctx, fn)  
audit.server.ts     → may need withTenantDb for audit_log inserts
auth.server.ts      → keep getDb() (Better-Auth tables, no RLS)
invites.server.ts   → keep getDb() (invites table, no RLS or admin access)
corpus.server.ts    → keep getDb() (non-PHI corpus, no RLS needed)
```

The comment boundary in those files ("Phase 7 replaces getDb() with withTenantDb()") is the exact contract to fulfill.

### RLS Policy Schema Diagram

```
Request arrives at Remix loader
  │
  ▼
requireUser(request)         ← Better-Auth session gate (unchanged)
  │                             returns { user.id, user.tenantId, user.role }
  ▼
withTenantDb(ctx, fn)        ← NEW: wraps DB calls in RLS context
  │                             ctx = { userId, tenantId, subjectId }
  ├─ BEGIN TRANSACTION
  ├─ set_config('request.jwt.claims', JSON.stringify({sub, tenant_id, subject_id, role:'authenticated'}), TRUE)
  ├─ SET LOCAL ROLE authenticated
  │
  ├─ fn(tx)                   ← Drizzle queries run here
  │     │
  │     └─ SELECT * FROM metrics
  │           │
  │           ▼
  │         [RLS USING clause evaluated]
  │           auth.jwt() ->> 'tenant_id' = metrics.tenant_id
  │           AND auth.jwt() ->> 'subject_id' = metrics.subject_id
  │           ← only matching rows returned
  │
  ├─ COMMIT (or ROLLBACK on error)
  └─ (context automatically cleared — transaction-scoped)
```

### Project Structure After Migration

```
remix-app/
├── app/lib/
│   ├── db.server.ts          # postgres-js driver (was neon-serverless)
│   ├── withTenantDb.server.ts # NEW: RLS context wrapper
│   ├── auth.server.ts        # unchanged (Better-Auth)
│   ├── authz.server.ts       # unchanged
│   ├── data.server.ts        # getDb() → withTenantDb()
│   ├── consent.server.ts     # getDb() → withTenantDb()
│   └── corpus.server.ts      # unchanged (non-PHI, no RLS)
├── db/
│   └── schema.ts             # add pgPolicy() definitions per table
└── migrations/
    └── 0010_rls_policies.sql  # new: ALTER TABLE ENABLE RLS + policy DDL
```

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase HIPAA add-on is ~$350/mo on top of Team plan ($599/mo) | Decision Area 4 | Actual cost could be higher; budget planning affected |
| A2 | Vercel HIPAA add-on is self-serve on Pro plan | Decision Area 4 | May require Enterprise upgrade |
| A3 | Anthropic provides a HIPAA-Ready BAA for the extraction use case | Decision Area 4 | May need a different LLM provider; blocks client-PHI extraction |
| A4 | `postgres-js` package is the correct Drizzle driver for Supabase (not `pg`) | Standard Stack | Wrong driver causes connection failures |
| A5 | `jose` is the appropriate JWT signing library for the withTenantDb wrapper | Standard Stack | Any JWT library signing HS256 with the Supabase secret works; jose is widely used |
| A6 | The pg_dump from Neon will restore cleanly to Supabase without major schema conflicts (no exotic extensions used) | Decision Area 3 | Unexpected extension conflicts require manual fixups |
| A7 | `pgaudit.log_parameter=off` is enforced by Supabase by design (not configurable) | Decision Area 4 | If Supabase changed this, the COMP-03 verification requirement changes |

---

## Open Questions

1. **Auth seam confirmation**
   - What we know: Option B (keep Better-Auth, custom JWT for RLS) is recommended and least disruptive.
   - What's unclear: User must explicitly confirm this — it is the pivotal decision that gates all downstream work.
   - Recommendation: Confirm Option B in discuss-phase before any planning begins.

2. **HIPAA cost acceptance**
   - What we know: ~$950/mo (Supabase Team + HIPAA add-on) before compute. Current Neon cost is standard-tier (much lower).
   - What's unclear: User may want to defer the HIPAA add-on to immediately before onboarding the first paying client (i.e., complete 7a migration+RLS first, then 7b BAA+compliance when the client is imminent).
   - Recommendation: Decide in discuss-phase whether 7a and 7b run together or sequentially.

3. **Phase split (7a vs 7b)**
   - What we know: Two distinct risk profiles; splitting is cleaner.
   - What's unclear: Timeline urgency. If the first client (HIGHER) is weeks away, the split gives flexibility. If it is months away, they can be planned together.
   - Recommendation: User to decide based on client timeline.

4. **AUTH-03: Practitioner → Subject Assignment**
   - What we know: AUTH-03 requires a practitioner to access only subjects assigned to them within their tenant. `assertSubjectAccess` currently only checks that `subject.tenantId === user.tenantId` — it does not check per-assignment.
   - What's unclear: Does Phase 7 add a `practitioner_subject_assignments` table, or is AUTH-03 satisfied by the existing tenant-scoping for the pilot (single tenant, single practitioner)?
   - Recommendation: Clarify scope in discuss-phase. A full per-assignment model is a new schema addition.

5. **AUTH-04: Immutable Audit Log**
   - What we know: The `audit_log` table exists (Phase 5). "Immutable" means no deletes.
   - What's unclear: Is "immutable" satisfied by (a) an RLS no-delete policy, (b) a Postgres trigger that raises on DELETE, or (c) a separate tamper-evident log service?
   - Recommendation: RLS no-delete policy is sufficient for M1. Confirm in discuss-phase.

6. **Supabase project region**
   - What we know: Vercel deploys on US East (or the user's selected region). Supabase project region should match for latency.
   - What's unclear: What region is the existing Neon project on? The project name is `orange-paper-97068012` — region not confirmed in codebase.
   - Recommendation: Check Neon console and Vercel deployment region before creating the Supabase project.

7. **SUPABASE_SERVICE_ROLE_KEY already staged**
   - What we know: Per MEMORY.md, `SUPABASE_SERVICE_ROLE_KEY` is already staged in the repo root `.env`.
   - What's unclear: Is this from an existing Supabase project that was already partially set up, or was it pre-generated for a future project?
   - Recommendation: Confirm in discuss-phase whether a Supabase project already exists or needs to be created.

---

## Requirement Re-Scoping

### Stale Neon-Framed Requirements → Supabase Equivalents

**COMP-02** (currently): "PHI infrastructure is BAA-covered (Neon, Vercel, and the chosen LLM provider) before any external client's PHI"
**COMP-02 (re-scoped):** "PHI infrastructure is BAA-covered (Supabase Team plan + HIPAA add-on + signed BAA, Vercel HIPAA add-on + signed BAA, Anthropic HIPAA-Ready BAA) before any external client's PHI is written — verified by dated BAA records in docs/COMPLIANCE-RUNBOOK.md"

**COMP-03** (currently): "PHI access is audit-logged with pgAudit verified (parameters off) — Phase 7 (pgAudit baseline auto-configures on Neon HIPAA enable; verification is the gate)"
**COMP-03 (re-scoped):** "Supabase pgAudit extension enabled; object-level audit role created and assigned to PHI tables (metrics, lab_documents, lab_extractions, reports, subject_genotypes); log_parameter=off confirmed by Supabase design (document in runbook); verification query returns audit entries for a test SELECT"

**TEN-02** (currently): "Postgres RLS prevents any query from returning another tenant's or subject's rows (proven by an automated cross-tenant isolation test)"
**TEN-02 (re-scoped):** Same behavioral requirement, new mechanism: "Supabase RLS policies using auth.jwt() custom claims (tenant_id, subject_id) enabled on all 14 tenant-scoped tables; cross-tenant isolation test (Tenant A writes, Tenant B reads zero) committed to tests/ and passing in CI"

**TEN-03** (currently): "Tenant/subject context is set per-request via SET LOCAL inside a transaction, with no leakage across pooled connections"
**TEN-03 (re-scoped):** "withTenantDb(ctx, fn) wrapper issues set_config('request.jwt.claims', claims, TRUE) + SET LOCAL ROLE authenticated inside a Drizzle transaction; pool-reuse leak test confirms zero context bleed between requests; all tenant-scoped data access goes through withTenantDb"

**AUTH-03** (currently): "A practitioner can access only the subjects assigned to them within their tenant"
**AUTH-03 (re-scoped):** Same requirement. Mechanism: application-layer assertSubjectAccess enforces tenant isolation; per-assignment scoping (practitioner sees only their assigned subjects) requires either (a) a `practitioner_subject_assignments` table + RLS policy or (b) a confirmed decision that single-practitioner pilot makes this moot for M1.

**AUTH-04** (currently): "Authentication and access events are written to an immutable audit log"
**AUTH-04 (re-scoped):** "The existing audit_log table (Phase 5) has a no-delete RLS policy (immutability); Better-Auth's platform-level auth events (sign-in, sign-out, sign-up) are queryable via Supabase Auth Audit Logs; combined coverage documents the auth event audit trail"

---

## Decisions for discuss-phase

The following questions must be resolved before planning begins. Each is a genuine decision point, not a research gap.

### D1 — Auth Seam (REQUIRED before any planning)
**Question:** Confirm Option B — keep Better-Auth, use Supabase as a plain Postgres host, implement withTenantDb + custom JWT for RLS. Do not replace Better-Auth with Supabase Auth (GoTrue).
**Options:** A (replace), B (keep, recommended), C (hybrid)
**Stakes:** Gates the entire phase scope. Option A means ~15-file rewrite of auth. Option B is surgical.

### D2 — Phase Split (REQUIRED)
**Question:** Should Phase 7 be split into 7a (migration + RLS) and 7b (BAA + HIPAA compliance), or executed as one phase?
**Options:** (a) Single phase — all at once; (b) Split — 7a first, 7b when client is imminent
**Stakes:** If the first client (HIGHER) is more than ~4 weeks away, splitting makes sense. If imminent, run together.

### D3 — HIPAA Cost Acceptance (REQUIRED)
**Question:** Accept ~$950/mo for Supabase (Team plan + HIPAA add-on) as the compliance cost? Or explore lower-cost alternatives (e.g., defer the HIPAA add-on until immediately before client onboarding, accepting the migration/RLS work now at standard pricing)?
**Options:** (a) Upgrade immediately; (b) Migrate to Supabase standard tier now, upgrade to HIPAA tier when client is confirmed
**Stakes:** If option (b), the Supabase project starts on Pro plan (~$25/mo) and upgrades to Team+HIPAA when needed.

### D4 — AUTH-03 Scope (REQUIRED)
**Question:** Does AUTH-03 (practitioner sees only assigned subjects) require a new `practitioner_subject_assignments` table in Phase 7, or is it satisfied by existing tenant-scoped isolation for the pilot?
**Options:** (a) Add assignment table + RLS policy (full scope); (b) Defer per-assignment to M2 (client UI phase), treat Phase 7 as tenant-isolation only
**Stakes:** Option (a) adds schema work + new UI for managing assignments. Option (b) is M1-sufficient for a single-practitioner pilot.

### D5 — Supabase Project Status (REQUIRED)
**Question:** Does the `SUPABASE_SERVICE_ROLE_KEY` in `.env` correspond to an existing Supabase project, or was it pre-generated? If an existing project exists, what is its state (empty, partially migrated, etc.)?
**Stakes:** Determines whether to create a new project or continue with the existing one.

### D6 — Immutability Definition for AUTH-04
**Question:** Is an RLS no-delete policy on `audit_log` sufficient for AUTH-04 "immutable audit log" in M1, or does this require a separate tamper-evident service?
**Options:** (a) RLS no-delete (simple, M1-appropriate); (b) Append-only Postgres partition + no-delete trigger; (c) External log service (M2/M3)
**Recommendation:** Option (a) for M1.

### D7 — Migration Timing / Cutover Window
**Question:** Is there a preferred maintenance window for the Neon→Supabase cutover? The owner's own data is in Neon; the app is the only user.
**Stakes:** The cutover requires a brief read-only window (~15–30 min). Confirm preferred timing.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `pg_dump` | DB migration | ✗ (not checked) | — | Install postgres CLI tools |
| `psql` | DB migration | ✗ (not checked) | — | Install postgres CLI tools |
| `postgres` npm package | db.server.ts | Not yet installed | — | Run `npm install postgres` |
| `jose` npm package | withTenantDb JWT signing | Not yet installed | — | Use `jsonwebtoken` instead |
| Supabase project | All DB work | Staged (KEY exists) | — | Create project if none exists |
| Supabase Team plan | HIPAA add-on | ✗ (currently standard or Pro) | — | Upgrade required |

---

## Sources

### Primary (HIGH confidence)
- [CITED: supabase.com/docs/guides/platform/hipaa-projects] — HIPAA project requirements (PITR, SSL, Network Restrictions, BAA)
- [CITED: supabase.com/docs/guides/platform/migrating-to-supabase/neon] — pg_dump/psql migration steps
- [CITED: supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac] — Custom JWT claims via Auth Hooks, auth.jwt() in RLS
- [CITED: supabase.com/docs/guides/database/extensions/pgaudit] — pgAudit enable, object-level audit roles, log_parameter unsupported
- [CITED: supabase.com/docs/guides/database/connecting-to-postgres] — Supavisor ports, transaction vs session mode, prepare:false requirement
- [CITED: orm.drizzle.team/docs/rls] — Drizzle pgPolicy, set_config pattern for RLS, Supabase predefined roles
- [CITED: orm.drizzle.team/docs/connect-supabase] — postgres-js driver, prepare:false, connection string setup

### Secondary (MEDIUM confidence)
- [CITED: github.com/rphlmr/drizzle-supabase-rls] — createDrizzle pattern with rls()/admin split, set_config JWT claims
- [CITED: queen.raae.codes/2025-05-01-supabase-exchange/] — JWT exchange pattern for custom auth providers with Supabase RLS
- [CITED: github.com/orgs/supabase/discussions/35594] — HIPAA add-on Team plan availability confirmation

### Tertiary (LOW confidence / ASSUMED)
- HIPAA add-on price ~$350/mo — cited from multiple sources but pricing may have changed; verify at supabase.com/pricing
- Vercel HIPAA add-on on Pro plan — from Phase 2 planning notes; verify current Vercel pricing
- Anthropic BAA availability — from training knowledge; verify at anthropic.com before planning

---

## Metadata

**Confidence breakdown:**
- Migration steps: HIGH (official Supabase docs)
- HIPAA cost/plan: MEDIUM (multiple sources agree, but pricing may change; verify before budget commitment)
- Better-Auth + custom JWT RLS pattern: MEDIUM (community-verified pattern, not official Better-Auth docs)
- Drizzle driver swap: HIGH (official Drizzle docs)
- pgAudit configuration: HIGH (official Supabase docs)

**Research date:** 2026-06-12
**Valid until:** 2026-07-12 (30 days) — Supabase pricing and HIPAA add-on availability should be re-verified before final planning if more than 2 weeks elapse.
