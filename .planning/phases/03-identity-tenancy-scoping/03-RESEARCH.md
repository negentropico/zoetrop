# Phase 3: Identity + Tenancy Scoping — Research

**Researched:** 2026-06-09
**Domain:** Better-Auth 1.6 + Drizzle schema migration + React Router 7 route protection + Neon Postgres tenancy columns
**Confidence:** HIGH (core stack verified against official docs and live registry)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Invite-only signup. Owner account is seeded; new accounts require an invite token/code. No open public signup.
- **D-02:** Public landing + private app. Public landing page reachable without login; all dashboard + data routes require a valid session (unauthenticated → redirect to login).
- **D-03:** Full spine. Build role enum (`owner`/`practitioner`/`client`), `tenants` + `users` + `subjects` tables, AND `tenantId`/`subjectId` columns on all 8 data tables seeded to the owner.
- **D-04:** Auth = Better-Auth (already installed at `1.6.14`) with email/password + Drizzle adapter against the existing Neon project.
- **D-05:** Remove the throwaway `PILOT_BASIC_AUTH` loader + `headers()` from `root.tsx` once Better-Auth gating is live.

### Claude's Discretion
- Better-Auth table layout, session/cookie config, migration structure, and the exact public/private routing mechanism are implementation details for research + planning.

### Deferred Ideas (OUT OF SCOPE)
- RLS enable + policies, `SET LOCAL` `withTenantDb` enforcement wrapper, cross-tenant isolation tests → Phase 7.
- Practitioner subject-scoping (AUTH-03), immutable auth/access audit log (AUTH-04) → Phase 7.
- JWK-native `pg_session_jwt` verification → deferred per spike.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | A user can sign in with email + password and stay signed in across sessions | Better-Auth email/password config with `rememberMe: true` default; session cookie persists across browser sessions |
| AUTH-02 | Each user has a role (owner / practitioner / client) that gates what they can access | `additionalFields` on Better-Auth user table + `input: false` to prevent user-provided values; role readable in loader via `auth.api.getSession()` |
| TEN-01 | Every health-data table is scoped by `tenantId` + `subjectId` | Custom `tenants`/`subjects` tables in schema.ts; 3-migration sequence (add nullable → backfill → NOT NULL) on all 8 existing tables; composite index `(tenant_id, subject_id)` |
| TEN-04 | Protocol version lineage is per-subject, unique on `(tenantId, subjectId, version)` | Drop the global `UNIQUE(version)` constraint on `protocol_versions`; add composite unique index on `(tenant_id, subject_id, version)` via custom migration |
</phase_requirements>

---

## Summary

Phase 3 delivers the identity + tenancy schema layer for Zoetrop. Better-Auth 1.6 is already installed and has a stable, well-documented path for email/password auth with custom role fields via `additionalFields`. The Drizzle adapter (`@better-auth/drizzle-adapter`, same monorepo, 1.6.15) attaches to the existing `neon-serverless` Pool from `db.server.ts` with a `provider: "pg"` option.

The **organization plugin** (orgs = tenants) is a feature-rich option but adds tables and ceremony that do not cleanly map to the `tenants`/`users`/`subjects` spine required by D-03. The recommendation is **hand-roll the `tenants` and `subjects` tables** in Drizzle schema while using Better-Auth for auth exclusively — the org plugin brings invitation email infrastructure and active-org session fields that are over-build for a single-owner pilot. Invite-only signup is implemented as a `beforeSignUp` hook using `createAuthMiddleware` (not the org plugin).

The public/private routing split in React Router 7's explicit `routes.ts` uses an **authenticated `layout()` wrapper** containing all app routes; the public landing and auth routes sit outside that wrapper. The `AppShell` currently wraps everything via `root.tsx` — this changes: `root.tsx` renders a bare `Outlet`, and the authenticated layout route renders `AppShell` around its children.

Migration mechanics follow the expand-contract pattern using `drizzle-kit generate --custom`: three migrations are required (add nullable columns → backfill → NOT NULL + constraint swap).

**Primary recommendation:** Use Better-Auth email/password with `additionalFields` role (`owner`/`practitioner`/`client`) + hand-rolled `tenants`/`subjects` tables + authenticated layout route + 3-migration sequence for tenancy columns.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Email/password sign-in, session issue | API / Backend | — | Better-Auth handler at `/api/auth/*` runs server-side only |
| Session validation + role gating | Frontend Server (SSR) | — | Authenticated layout loader calls `auth.api.getSession()` on every request |
| Route protection / redirect-to-login | Frontend Server (SSR) | — | `redirect()` thrown from authenticated layout loader |
| `tenants`/`users`/`subjects` tables | Database / Storage | — | Drizzle schema + Neon Postgres; no client exposure |
| `tenantId`/`subjectId` columns on 8 tables | Database / Storage | — | Schema columns only; Phase 7 adds RLS; Phase 4 adds app-layer WHERE scoping |
| Public landing page | Browser / Client | Frontend Server (SSR) | Rendered outside the authenticated layout; no auth check |
| Login / sign-in form | Browser / Client | Frontend Server (SSR) | Client-side form, server-side action calls `auth.api.signInEmail()` |
| Invite-only gate | API / Backend | — | `beforeSignUp` hook on Better-Auth server instance; blocks sign-up unless invited |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `better-auth` | `1.6.15` (installed as `^1.6.14`) | Auth framework — email/password, session, user table | Already installed; official React Router 7 integration; active project (modified 2026-06-08) |
| `@better-auth/drizzle-adapter` | `1.6.15` | Connects Better-Auth to the existing Drizzle Postgres instance | Same monorepo as `better-auth`; `provider: "pg"` matches the Neon stack |
| `drizzle-orm` (existing) | `^0.45.1` | Schema definition + migration generation | Already in use; schema changes go into `db/schema.ts` |
| `drizzle-kit` (existing) | `^0.31.8` | Migration generation + apply | Already configured; `--custom` flag for multi-step backfill migrations |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `better-auth/react` (sub-export) | bundled with `better-auth` | Client-side auth methods (`createAuthClient`) | Used in login/signup pages for `signIn.email()`, `signOut()` |
| `better-auth/plugins` `organization` | bundled | Org/tenant/invitation management | **Not recommended for Phase 3** — see "Alternatives Considered" |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled `tenants`/`subjects` tables | Better-Auth `organization` plugin (orgs = tenants) | Org plugin adds `organization`, `member`, `invitation`, `team`, `teamMember` tables + requires `activeOrganizationId` in session + requires `sendInvitationEmail` SMTP config. Maps clumsily to `tenants`/`subjects` because "organization = tenant" but "member" != "subject" (a subject is a tracked person who may not be a system user). Hand-rolled tables are 3 Drizzle table definitions and have zero overhead |
| `beforeSignUp` hook for invite-only | Better-Auth `disableSignUp: true` (no signup at all) | `disableSignUp: true` would permanently block ALL signup including the owner seed, requiring raw SQL to seed the owner. The hook approach allows the seed script to bypass the check programmatically |
| Authenticated `layout()` route | Individual route loader checks | Authenticated layout centralizes the session check — one loader, all app routes protected. Individual checks are error-prone (easy to miss a new route) |

**Installation (nothing new needed — `@better-auth/drizzle-adapter` is the only addition):**
```bash
cd remix-app && npm install @better-auth/drizzle-adapter
```

**Version verification:** Confirmed via `npm view`:
- `better-auth`: `1.6.15`, modified `2026-06-08`
- `@better-auth/drizzle-adapter`: `1.6.15`, modified `2026-06-08`

---

## Package Legitimacy Audit

> slopcheck was unavailable at research time — all packages are tagged `[ASSUMED]` and the planner must gate each install behind a `checkpoint:human-verify` task.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `better-auth` | npm | ~2 yrs (2024-04-22) | not checked | github.com/better-auth/better-auth | [ASSUMED] | Approved — official docs, active maintainer, existing dep |
| `@better-auth/drizzle-adapter` | npm | ~5 mo (2026-01-21) | not checked | github.com/better-auth/better-auth | [ASSUMED] | Approved — same org/monorepo as `better-auth`, official docs page |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none — both packages are from the official better-auth monorepo with official documentation. Newer age of `@better-auth/drizzle-adapter` (5 months) is expected (separated from monorepo package recently).

*If slopcheck was unavailable at research time, all packages above are tagged `[ASSUMED]` and the planner must gate each install behind a `checkpoint:human-verify` task.*

---

## Architecture Patterns

### System Architecture Diagram

```
Browser
  │
  ├─ GET /             → landing.tsx (public, no auth check)
  ├─ GET /login        → auth/login.tsx (public)
  ├─ POST /api/auth/*  → routes/api.auth.$.ts → auth.handler(request)
  │                       ↳ Better-Auth server (session issue, sign-in, sign-out)
  │
  └─ GET /dashboard/*  → authenticated layout loader
       │  auth.api.getSession({ headers }) → session | null
       │  null → redirect("/login?redirect=...")
       │  session.user.role → gates role-specific UI
       ↓
     AppShell (TopNav + main + footer + BottomTab)
       └─ Outlet → dashboard / metrics / protocol / insights / import routes
                    each loader receives { tenantId, subjectId } from session context
```

### Recommended Project Structure

```
remix-app/
├── app/
│   ├── lib/
│   │   ├── auth.server.ts     # Better-Auth instance (email/password + Drizzle adapter + hooks)
│   │   ├── auth-client.ts     # createAuthClient (browser-safe, no secret)
│   │   └── db.server.ts       # existing Pool + drizzle; @better-auth/drizzle-adapter attaches here
│   ├── routes/
│   │   ├── api.auth.$.ts      # catch-all resource route: loader + action → auth.handler(request)
│   │   ├── landing.tsx        # public landing page (/)
│   │   ├── auth/
│   │   │   ├── login.tsx      # sign-in form (/login)
│   │   │   └── logout.tsx     # sign-out action (/logout)
│   │   └── _app/              # authenticated layout + all gated routes
│   │       ├── layout.tsx     # loader: getSession → redirect if no session; renders AppShell
│   │       ├── dashboard.tsx  # /dashboard (was home.tsx at /)
│   │       ├── metrics/
│   │       ├── protocol/
│   │       ├── insights/
│   │       └── import/
│   └── routes.ts              # updated RouteConfig (see Pattern 3 below)
├── db/
│   └── schema.ts              # add tenants, subjects, Better-Auth tables, new columns
└── migrations/
    ├── 0000_light_blue_shield.sql  # existing baseline
    ├── 0001_better_auth_tables.sql # Better-Auth user/session/account/verification
    ├── 0002_tenancy_spine.sql      # tenants, subjects tables + app_role enum
    ├── 0003_tenancy_columns_nullable.sql  # ADD nullable tenant_id/subject_id to 8 tables
    ├── 0004_tenancy_backfill.sql   # UPDATE all rows with owner's tenantId/subjectId
    └── 0005_tenancy_not_null.sql   # SET NOT NULL + composite index + constraint swap
```

### Pattern 1: Better-Auth Server Instance

**What:** `auth.server.ts` configures Better-Auth with the Drizzle adapter, email/password, custom role field, and the invite-only `beforeSignUp` hook.

**When to use:** Single instance, imported by the API resource route and any loader that calls `auth.api.getSession()`.

```typescript
// Source: https://www.better-auth.com/docs/adapters/drizzle + https://www.better-auth.com/docs/concepts/database#extending-core-schema + https://www.better-auth.com/docs/concepts/hooks
// remix-app/app/lib/auth.server.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getDb } from "./db.server";
import * as schema from "../../db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema, // pass the full schema so Better-Auth can locate its tables
  }),
  emailAndPassword: {
    enabled: true,
    // disableSignUp: false — invite-only is enforced by the beforeSignUp hook below
  },
  user: {
    additionalFields: {
      role: {
        type: ["owner", "practitioner", "client"] as const,
        required: false,
        defaultValue: "client",
        input: false, // users cannot self-assign a role
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days — AUTH-01 "stay signed in"
    updateAge: 60 * 60 * 24,       // refresh session daily
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // cache for 5 minutes (reduces DB hits on every request)
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Invite-only gate — blocks /sign-up unless a valid invite token is present (D-01)
      // Phase 3 initial: only allow the owner seed (token = env var OWNER_INVITE_TOKEN)
      // Phase 4+: query an invite_tokens table
      if (ctx.path === "/sign-up/email") {
        const token = ctx.body?.inviteToken as string | undefined;
        const ownerToken = process.env.OWNER_INVITE_TOKEN;
        if (!ownerToken || token !== ownerToken) {
          throw new APIError("FORBIDDEN", { message: "Signup requires an invitation." });
        }
      }
    }),
  },
});
```

**Note on `createAuthMiddleware` and `APIError` imports:**
```typescript
import { createAuthMiddleware, APIError } from "better-auth/api";
```
[CITED: https://www.better-auth.com/docs/concepts/hooks]

### Pattern 2: API Resource Route (catch-all handler)

**What:** A single React Router 7 resource route mounts the entire Better-Auth HTTP handler. The `$` wildcard catches all sub-paths (`/api/auth/sign-in/email`, `/api/auth/sign-out`, etc.).

**When to use:** This is the only Better-Auth route — do not add individual routes per endpoint.

```typescript
// Source: https://better-auth.com/docs/integrations/react-router
// remix-app/app/routes/api.auth.$.ts
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  return auth.handler(request);
}

export async function action({ request }: ActionFunctionArgs) {
  return auth.handler(request);
}
```

The route path in `routes.ts` is:
```typescript
route("api/auth/*", "routes/api.auth.$.ts"),
```

### Pattern 3: Authenticated Layout Route (public/private split)

**What:** An authenticated parent `layout()` that validates session in its loader and redirects to `/login` if no session exists. All app routes nest inside it. The landing page and auth routes sit outside.

**When to use:** The idiomatic React Router 7 approach for protecting all app routes in one place.

```typescript
// Source: https://www.better-auth.com/docs/concepts/session-management + React Router 7 layout pattern
// remix-app/app/routes/_app/layout.tsx
import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { AppShell } from "~/components/shell/AppShell";
import { Outlet } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    const url = new URL(request.url);
    throw redirect(`/login?redirect=${encodeURIComponent(url.pathname)}`);
  }
  // Expose session data to child loaders via context or return it
  return { user: session.user };
}

export default function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
```

Updated `routes.ts` structure (abbreviated):
```typescript
// remix-app/app/routes.ts
import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  // PUBLIC routes (no auth check)
  index("routes/landing.tsx"),             // public landing at /
  route("login", "routes/auth/login.tsx"),
  route("logout", "routes/auth/logout.tsx"),
  route("api/auth/*", "routes/api.auth.$.ts"),

  // AUTHENTICATED routes — gated by _app/layout.tsx loader
  layout("routes/_app/layout.tsx", [
    route("dashboard", "routes/_app/dashboard.tsx"),   // home content moves here
    layout("routes/_app/metrics/layout.tsx", [
      route("metrics", "routes/_app/metrics/index.tsx"),
      route("metrics/:category", "routes/_app/metrics/category.tsx"),
      route("metrics/:category/:metricId", "routes/_app/metrics/detail.tsx"),
    ]),
    layout("routes/_app/protocol/layout.tsx", [
      route("protocol", "routes/_app/protocol/index.tsx"),
      // ... remaining protocol routes
    ]),
    // ... insights, import layouts
  ]),
] satisfies RouteConfig;
```

**Impact on root.tsx:** `AppShell` is removed from `root.tsx`'s default export. The root `App` component renders only `<Outlet />`. The `PILOT_BASIC_AUTH` loader and `headers()` export are deleted (D-05). [ASSUMED: exact root.tsx diff — implementation decision]

### Pattern 4: Better-Auth Drizzle Schema Tables

**What:** The `user`, `session`, `account`, and `verification` tables that Better-Auth requires, defined in Drizzle notation to live alongside the existing schema in `db/schema.ts` (or a separate `db/auth-schema.ts` imported by `db/schema.ts`).

**Core tables generated by `npx auth@latest generate` (or hand-written to match):**

```typescript
// Source: https://www.better-auth.com/docs/concepts/database
// db/auth-schema.ts (new file, imported into db/schema.ts)
import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  // additionalFields:
  role: text("role").default("client"),   // "owner" | "practitioner" | "client"
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
```
[CITED: https://www.better-auth.com/docs/concepts/database]

**Note on `drizzleAdapter` schema parameter:** When passing `schema` to `drizzleAdapter`, the schema must include the Better-Auth tables. The cleanest approach is to re-export everything from a barrel in `db/schema.ts`:

```typescript
// db/schema.ts — add at the top/bottom:
export * from "./auth-schema";
```

### Pattern 5: Tenancy Spine Tables

**What:** Custom `tenants` and `subjects` tables needed for D-03 full spine. These are NOT provided by Better-Auth — they are project-owned Drizzle tables.

**ID type decision:** Better-Auth uses `text` for user IDs (a UUID-like string). For consistency, `tenants.id` and `subjects.id` should also be `text` (UUID v4 string stored as text), matching the Better-Auth `user.id` FK pattern.

```typescript
// Source: project design (D-03) + schema.ts pattern analysis [ASSUMED: exact column names]
// db/schema.ts additions:
export const appRoleEnum = pgEnum("app_role", ["owner", "practitioner", "client"]);

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey(),           // UUID v4 text, matches Better-Auth user.id style
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const subjects = pgTable("subjects", {
  id: text("id").primaryKey(),           // UUID v4 text
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

**Why `text` for IDs (not `uuid`):** Better-Auth generates string IDs internally (not Postgres `uuid` type). Keeping `tenants.id` and `subjects.id` as `text` avoids FK type mismatches when `tenant_id` columns on the 8 data tables reference `tenants.id`. [ASSUMED: using text over uuid — aligns with Better-Auth's own user.id type]

### Pattern 6: Migration Sequence (expand-contract)

**What:** Adding NON-NULL `tenant_id`/`subject_id` to 8 tables that already have data requires three steps. drizzle-kit cannot auto-generate the backfill step — use `drizzle-kit generate --custom` for each.

**3-migration plan:**

**Migration A — Tenancy spine tables + Better-Auth tables (auto-generated):**
```bash
npx drizzle-kit generate
# Generates: CREATE TABLE tenants, subjects, user, session, account, verification
# Also: CREATE TYPE app_role
```

**Migration B — Add nullable columns (auto-generated, but may need custom merge):**
```sql
-- 0003_tenancy_columns_nullable.sql
ALTER TABLE "metrics" ADD COLUMN "tenant_id" text REFERENCES tenants(id);
ALTER TABLE "metrics" ADD COLUMN "subject_id" text REFERENCES subjects(id);
-- ... same for all 8 tables
-- Also drop old unique constraint on protocol_versions:
ALTER TABLE "protocol_versions" DROP CONSTRAINT "protocol_versions_version_unique";
```

**Migration C — Backfill owner IDs (custom SQL, requires knowing owner's tenant_id/subject_id at migration time):**
```bash
npx drizzle-kit generate --custom --name=backfill_owner_tenancy
```
```sql
-- 0004_backfill_owner_tenancy.sql
-- Owner's tenant_id and subject_id must be known before running this migration.
-- They are seeded in Migration A. Use a CTE to reference them:
DO $$
DECLARE
  v_tenant_id text;
  v_subject_id text;
BEGIN
  SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
  SELECT id INTO v_subject_id FROM subjects WHERE tenant_id = v_tenant_id LIMIT 1;
  
  UPDATE metrics     SET tenant_id = v_tenant_id, subject_id = v_subject_id WHERE tenant_id IS NULL;
  UPDATE protocol_versions SET tenant_id = v_tenant_id, subject_id = v_subject_id WHERE tenant_id IS NULL;
  UPDATE protocol_changes  SET tenant_id = v_tenant_id, subject_id = v_subject_id WHERE tenant_id IS NULL;
  UPDATE milestones        SET tenant_id = v_tenant_id, subject_id = v_subject_id WHERE tenant_id IS NULL;
  UPDATE supplements       SET tenant_id = v_tenant_id, subject_id = v_subject_id WHERE tenant_id IS NULL;
  UPDATE supplement_log    SET tenant_id = v_tenant_id, subject_id = v_subject_id WHERE tenant_id IS NULL;
  UPDATE correlations      SET tenant_id = v_tenant_id, subject_id = v_subject_id WHERE tenant_id IS NULL;
  UPDATE cessation_log     SET tenant_id = v_tenant_id, subject_id = v_subject_id WHERE tenant_id IS NULL;
END $$;
```

**Migration D — NOT NULL constraint + composite index + protocol version uniqueness swap (custom):**
```bash
npx drizzle-kit generate --custom --name=tenancy_not_null_constraints
```
```sql
-- 0005_tenancy_not_null_constraints.sql
-- Set NOT NULL on all 8 tables:
ALTER TABLE "metrics"           ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "metrics"           ALTER COLUMN "subject_id" SET NOT NULL;
ALTER TABLE "protocol_versions" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "protocol_versions" ALTER COLUMN "subject_id" SET NOT NULL;
-- ... remaining 6 tables

-- Composite index (TEN-01):
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_metrics_tenant_subject"
  ON "metrics"("tenant_id", "subject_id");
-- ... same pattern for all 8 tables (CREATE INDEX CONCURRENTLY)

-- Per-subject protocol version uniqueness (TEN-04):
ALTER TABLE "protocol_versions"
  ADD CONSTRAINT "protocol_versions_tenant_subject_version_unique"
  UNIQUE ("tenant_id", "subject_id", "version");
```

**Drizzle schema reflects the final state** (NOT NULL, unique composite) — drizzle-kit tracks this via the snapshot in `migrations/meta/`.

**CRITICAL drizzle-kit gotcha:** drizzle-kit `generate` sees the schema's final state (NOT NULL columns) and will attempt to generate a single migration that adds them as NOT NULL with no default — which fails because existing rows have null values. The workaround is to use `drizzle-kit generate --custom` for all tenancy-column migrations and bypass drizzle-kit's auto-detection for these tables. Alternatively, commit the schema in stages (nullable in schema → run generate → apply backfill manually → update schema to NOT NULL → run generate again). [ASSUMED: exact drizzle-kit behavior when schema says NOT NULL but DB has nulls — needs verification against drizzle-kit 0.31.8 behavior]

### Anti-Patterns to Avoid

- **Putting `AppShell` in `root.tsx` with auth gating:** Root wraps ALL routes (public + private). The shell belongs in the authenticated layout, not the root. Root must render a bare `<Outlet />` after Phase 3.
- **Using `set()` (bare SET) instead of `SET LOCAL` for JWT claims:** The spike (01-SPIKE-FINDINGS.md) proved bare SET leaks across pooled connections. Phase 3 does NOT yet need SET LOCAL (no RLS), but do not introduce bare SET patterns that Phase 7 will have to unwind.
- **Storing tenantId/subjectId in the Better-Auth session cookie cache:** The session should contain only the Better-Auth user's ID and role. TenantId and subjectId are resolved at the loader level (JOIN `user` → `tenants`/`subjects`). Do not conflate auth-session concerns with data-scoping concerns. [ASSUMED: exact session shape — implementation decision]
- **Using the org plugin's `organization.slug` as the `tenants.id`:** The org plugin generates its own IDs and the `activeOrganizationId` session field. This would create a parallel ID space that conflicts with the direct `tenants.id` FK approach.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing (bcrypt/argon2) | custom hash function | `better-auth` (built-in) | Edge cases in timing, salt management, algorithm selection |
| Session token generation | `crypto.randomUUID()` directly | `better-auth` (built-in) | Rotation, expiry, cookie signing are already solved |
| CSRF protection | custom token header | `better-auth` (built-in, SameSite cookie) | Subtle cross-origin attack surface |
| "Remember me" cookie duration | custom cookie `maxAge` | Better-Auth `expiresIn` config | Better-Auth handles cookie refresh and DB expiry together |
| Type-safe auth error handling | `try/catch` on fetch | Better-Auth client returns `{ data, error }` shape | Avoids untyped error strings |
| Sign-out session invalidation | `localStorage.clear()` | `authClient.signOut()` | Must invalidate server-side session record, not just client cookie |

**Key insight:** Better-Auth handles the entire session lifecycle including token rotation, cookie management, and server-side invalidation. Building any part of this manually will create subtle security holes that Better-Auth already solves.

---

## Common Pitfalls

### Pitfall 1: drizzle-kit adding NOT NULL columns with no default fails on live tables

**What goes wrong:** Changing a column to `notNull()` in schema.ts and running `drizzle-kit generate` produces `ALTER TABLE x ALTER COLUMN y SET NOT NULL` — which fails in Postgres if any row has a null value.
**Why it happens:** drizzle-kit's `generate` command diffs the schema declaration against the migration snapshot, not the live DB state. It generates the DDL to match the schema but does not insert a backfill UPDATE.
**How to avoid:** Use the 3-step expand-contract: (1) add nullable → apply, (2) backfill via custom migration, (3) set NOT NULL. Alternatively use `drizzle-kit generate --custom` for all three steps to maintain explicit control.
**Warning signs:** Migration fails with `ERROR: column "tenant_id" of relation "metrics" contains null values`.

### Pitfall 2: Forgetting to pass the full Drizzle schema to `drizzleAdapter`

**What goes wrong:** `drizzleAdapter(db, { provider: "pg" })` without `schema:` causes runtime errors — Better-Auth cannot locate its own tables in the Drizzle schema.
**Why it happens:** The adapter needs to find the `user`, `session`, `account`, `verification` table definitions to build queries.
**How to avoid:** Always pass `schema: { ...authSchema, ...appSchema }` or ensure all tables are re-exported from a single barrel that is passed to the adapter.
**Warning signs:** Runtime error "table 'user' not found in schema" or "fullSchema undefined".

### Pitfall 3: `root.tsx` AppShell wrapping public routes

**What goes wrong:** After Phase 3, `root.tsx` still renders `<AppShell>` around every route — including the public landing page and login form, which show the TopNav (requires auth context) and BottomTab.
**Why it happens:** Pre-Phase-3, all routes are private (Basic-Auth gate). After Phase 3, there are public routes that must render without the authenticated shell.
**How to avoid:** Move `<AppShell>` from `root.tsx` into the authenticated `layout()` route. Root renders only `<Outlet />`.
**Warning signs:** Login page shows TopNav with missing user data; public landing inherits the app shell layout.

### Pitfall 4: `getSession()` called without the correct headers

**What goes wrong:** `auth.api.getSession({ headers: request.headers })` returns `null` even when the user is signed in — because `request.headers` was not passed, or the loader is called in a context where request headers aren't forwarded.
**Why it happens:** Better-Auth session is identified by a signed cookie in the `Cookie` header. If `request.headers` is not passed, the session cannot be identified.
**How to avoid:** Always pass `headers: request.headers` (not `headers: new Headers()`) in server-side `getSession` calls.
**Warning signs:** Every authenticated request redirects to `/login` even after a successful sign-in.

### Pitfall 5: Invite-only hook blocking the owner seed script

**What goes wrong:** The `beforeSignUp` hook that enforces invite-only signup also blocks the seed script that creates the owner account, requiring a separate path to bypass it.
**Why it happens:** The hook fires for all sign-up attempts including programmatic ones via `auth.api.signUpEmail()`.
**How to avoid:** The seed script passes the `OWNER_INVITE_TOKEN` as `inviteToken` in the signup body, which the hook validates. Alternatively, seed the owner by inserting directly into the `user` table in the seed migration (bypassing Better-Auth's HTTP endpoint entirely) and hashing the password with Better-Auth's hash function. The direct DB insert approach is simpler but requires knowing the internal password hash format.
**Warning signs:** Seed script returns 403 Forbidden; no owner account in `user` table after migration.

### Pitfall 6: `protocol_versions` global unique constraint conflict during migration

**What goes wrong:** The existing `UNIQUE("version")` constraint on `protocol_versions` must be dropped before the new composite `UNIQUE("tenant_id", "subject_id", "version")` is added. If the migration adds the composite constraint first, the old constraint remains and single-tenant queries still work — but it creates schema drift that will fail when a second tenant's protocols are added.
**Why it happens:** drizzle-kit may generate the constraint swap in the wrong order, or generate the old constraint removal separately from the composite constraint addition.
**How to avoid:** Use a custom migration that explicitly `DROP CONSTRAINT "protocol_versions_version_unique"` before `ADD CONSTRAINT "protocol_versions_tenant_subject_version_unique"`.
**Warning signs:** `\d+ protocol_versions` shows two unique constraints after migration.

### Pitfall 7: NOBYPASSRLS role (Phase 7 setup)

**What goes wrong (for Phase 7):** If the app continues to run as `neondb_owner` when RLS is enabled in Phase 7, all RLS policies are silently bypassed (`rolbypassrls = true` for owners per the spike findings).
**Why it matters in Phase 3:** Phase 3 does NOT create this role — but the plan should note that the `tenantId`/`subjectId` columns it adds are the values that Phase 7's `SET LOCAL request.jwt.claims` will carry. No groundwork for the role itself is required in Phase 3 (that is Phase 7 work).
**How to avoid (Phase 7):** Provision a `NOSUPERUSER NOBYPASSRLS` app role via SQL in Phase 7; grant it DML on the 8 tables; never grant ownership. Use `SET LOCAL ROLE <app_role>` inside each transaction.

---

## Code Examples

### Reading Session + Role in an Authenticated Layout Loader

```typescript
// Source: https://www.better-auth.com/docs/concepts/session-management
// remix-app/app/routes/_app/layout.tsx
import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    const url = new URL(request.url);
    throw redirect(`/login?redirect=${encodeURIComponent(url.pathname)}`);
  }

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role, // "owner" | "practitioner" | "client"
    },
  };
}
```

### Sign-In Action (Login Route)

```typescript
// Source: https://www.better-auth.com/docs/authentication/email-password
// remix-app/app/routes/auth/login.tsx
import { auth } from "~/lib/auth.server";
import { redirect } from "react-router";
import type { ActionFunctionArgs } from "react-router";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirect") as string) ?? "/dashboard";

  const response = await auth.api.signInEmail({
    body: { email, password },
    // Better-Auth sets the session cookie in the response headers
    asResponse: true,
  });

  if (!response.ok) {
    return { error: "Invalid credentials" };
  }

  // Preserve the Set-Cookie header from Better-Auth's response
  throw redirect(redirectTo, { headers: response.headers });
}
```

### Invite-Only Gate Hook

```typescript
// Source: https://www.better-auth.com/docs/concepts/hooks
import { createAuthMiddleware, APIError } from "better-auth/api";

hooks: {
  before: createAuthMiddleware(async (ctx) => {
    if (ctx.path === "/sign-up/email") {
      const token = (ctx.body as Record<string, unknown>)?.inviteToken as string | undefined;
      const validToken = process.env.OWNER_INVITE_TOKEN;
      if (!validToken || token !== validToken) {
        throw new APIError("FORBIDDEN", {
          message: "signup_disabled",
        });
      }
    }
  }),
},
```

### Owner Seed (direct DB insert, bypasses invite gate)

```typescript
// Seed script: remix-app/scripts/seed-owner.ts
// Seeds owner user + tenant + subject into DB before any HTTP-layer signup
import { getDb } from "../app/lib/db.server";
import { user, tenants, subjects } from "../../db/schema";
import { hashPassword } from "better-auth/crypto"; // [ASSUMED: exact import path]

const db = getDb();
const tenantId = crypto.randomUUID();
const subjectId = crypto.randomUUID();
const userId = crypto.randomUUID();

await db.insert(tenants).values({ id: tenantId, name: "Owner Tenant" });
await db.insert(subjects).values({ id: subjectId, tenantId, displayName: "Owner" });
await db.insert(user).values({
  id: userId,
  email: process.env.OWNER_EMAIL!,
  name: process.env.OWNER_NAME ?? "Owner",
  password: await hashPassword(process.env.OWNER_PASSWORD!),
  role: "owner",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Netlify/`neondb_owner` connection string | Vercel + `DATABASE_URL`/`DATABASE_URL_UNPOOLED` via Vercel env | Phase 2 (2026-06-08) | `drizzle.config.ts` already uses `DATABASE_URL_UNPOOLED` for migrations |
| HTTP Basic-Auth pilot gate (`root.tsx`) | Better-Auth email/password sessions | Phase 3 | `root.tsx` loader + `headers()` must be deleted (D-05) |
| Single-table flat schema (no tenancy) | `tenantId`/`subjectId` on all 8 tables | Phase 3 | Enables Phase 4 app-layer WHERE scoping; Phase 7 RLS |
| Global `UNIQUE(version)` on `protocol_versions` | Per-subject `UNIQUE(tenantId, subjectId, version)` | Phase 3 | Required for TEN-04; no duplicates across multi-subject future |

**Deprecated/outdated:**
- `NETLIFY_DATABASE_URL` env var: present in `db.server.ts` as a fallback — can be cleaned up (no Netlify env on Vercel), but not blocking.
- `syncStatus`/`syncVersion` columns on `metrics`: legacy offline-sync vestiges per PRINCIPLES.md — out of scope for Phase 3 (Phase 4 / DATA-05).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `hashPassword` is exported from `better-auth/crypto` for direct DB seeding | Code Examples (owner seed) | Seed script compilation error; need to find the correct import or use `auth.api.signUpEmail()` with the invite token instead |
| A2 | `createAuthMiddleware` and `APIError` import from `"better-auth/api"` | Pattern 1 | TypeScript compile error; may be `"better-auth/server"` or the root package |
| A3 | Using `text` (not Postgres `uuid` type) for `tenants.id`/`subjects.id` aligns cleanly with Better-Auth `user.id` FK pattern | Pattern 5 | FK type mismatch if Better-Auth generates `uuid` columns — check generated SQL output |
| A4 | drizzle-kit `generate` will attempt a single-step NOT NULL alter when schema declares `notNull()` without a default | Pitfall 1 / Migration Pattern | May require adjustment to migration sequencing if drizzle-kit is smarter than assumed |
| A5 | The `_app/` folder-based route prefix is the clean way to namespace authenticated routes without a URL segment | Pattern 3 | Route file naming convention — verify with React Router 7 RouteConfig; `layout()` wrapper has no URL segment by design, so the folder name is arbitrary |
| A6 | Better-Auth `asResponse: true` in `auth.api.signInEmail()` returns a full `Response` with `Set-Cookie` headers that can be forwarded via React Router's `redirect()` | Code Examples | If wrong, the sign-in response does not set the session cookie; need to inspect Better-Auth's server-side API shape |

---

## Open Questions

1. **`hashPassword` import for direct DB seeding**
   - What we know: Better-Auth stores hashed passwords in the `account` table (`password` column), not in `user`. Passwords are associated via the `account` table's `providerId: "credential"` record.
   - What's unclear: The exact import path for hashing, and whether seeding requires inserting into both `user` AND `account` tables.
   - Recommendation: During the seed task, use `auth.api.signUpEmail()` with the invite token env var (set `OWNER_INVITE_TOKEN` in the seed environment) rather than direct DB inserts — avoids needing to know Better-Auth's internal hashing/account storage format.

2. **Session shape with `additionalFields`**
   - What we know: Better-Auth `additionalFields` on `user` appear in `session.user.role` after the user is signed in.
   - What's unclear: Whether the Drizzle adapter automatically includes `additionalFields` in the `getSession()` response, or if explicit schema mapping is needed.
   - Recommendation: After `auth.server.ts` is set up, verify `session.user.role` in a test loader before building role-gating logic.

3. **React Router 7 folder-based route organization (`_app/` prefix)**
   - What we know: React Router 7 with an explicit `routes.ts` `RouteConfig` does not use file-name conventions — the layout file path is explicit in `layout("routes/_app/layout.tsx", [...])`.
   - What's unclear: Whether the `_app/` convention has any special meaning in the React Router Vite plugin (some frameworks treat `_` prefixed folders specially).
   - Recommendation: The `_app/` folder is just a filesystem organization choice. The route table is explicit — there are no magic conventions. Verify with a minimal test during Wave 0.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All migration/seed scripts | ✓ | v25.6.0 | — |
| npm | Package install | ✓ | 11.8.0 | — |
| drizzle-kit | Migration generation + apply | ✓ (via npx) | 0.31.8 | — |
| Neon Postgres (orange-paper-97068012) | All DB migrations | runtime only | — | — |
| `DATABASE_URL_UNPOOLED` env var | drizzle-kit migrations | set in Vercel | — | Fails if missing |
| `BETTER_AUTH_SECRET` env var | Better-Auth session signing | set in Vercel (Phase 2) | — | Fails if missing |
| `BETTER_AUTH_URL` env var | Better-Auth cookie domain | set in Vercel (Phase 2) | — | — |
| `OWNER_INVITE_TOKEN` env var | Invite-only gate + seed | NOT YET SET | — | Must add to Vercel env + local .env |
| SMTP / email sending | Better-Auth `sendInvitationEmail` | NOT NEEDED (no email invites in Phase 3) | — | Invite-only via token in URL/env |

**Missing dependencies with no fallback:**
- `OWNER_INVITE_TOKEN` env var must be added to Vercel env (production + preview) and local `.env` before the seed script runs.

**Missing dependencies with fallback:**
- None.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8 |
| Config file | `remix-app/vite.config.ts` (test block) |
| Quick run command | `cd remix-app && npm test` |
| Full suite command | `cd remix-app && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Session persists across browser sessions (rememberMe) | integration/smoke | Manual browser test (cookie survives close) | ❌ Wave 0 |
| AUTH-01 | `getSession()` returns user when valid cookie present | unit | `vitest run tests/auth/session.test.ts` | ❌ Wave 0 |
| AUTH-02 | Session.user.role = "owner" for seeded owner | unit | `vitest run tests/auth/role.test.ts` | ❌ Wave 0 |
| AUTH-02 | Authenticated layout loader redirects when no session | unit | `vitest run tests/routes/auth-layout.test.ts` | ❌ Wave 0 |
| TEN-01 | All 8 tables have tenant_id + subject_id columns after migration | integration | `vitest run tests/db/schema-columns.test.ts` | ❌ Wave 0 |
| TEN-01 | tenant_id + subject_id are NOT NULL on all 8 tables | integration | (same file) | ❌ Wave 0 |
| TEN-01 | Composite index `(tenant_id, subject_id)` confirmed on all 8 tables | integration | (same file) | ❌ Wave 0 |
| TEN-04 | UNIQUE(tenant_id, subject_id, version) constraint present on protocol_versions | integration | `vitest run tests/db/constraints.test.ts` | ❌ Wave 0 |
| TEN-04 | Old global UNIQUE(version) constraint absent | integration | (same file) | ❌ Wave 0 |
| D-05 | root.tsx has no PILOT_BASIC_AUTH loader or headers() | static/lint | `grep -r "PILOT_BASIC_AUTH" remix-app/app/root.tsx` returns empty | manual check |

**Manual-only tests:**
- AUTH-01 "stay signed in across browser sessions" — requires closing and reopening browser with a valid session cookie. Verify manually after deploy.
- D-05 Basic-Auth removal — verify `curl -I https://zoetrop.vercel.app/` returns 200 (not 401) after deploy.

### Sampling Rate
- **Per task commit:** `npm test` (unit tests, < 30s)
- **Per wave merge:** `npm test` + manual schema inspection (`\d+ metrics` in Drizzle Studio or `psql`)
- **Phase gate:** Full suite green + manual session test + `grep` for PILOT_BASIC_AUTH absence before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `remix-app/tests/auth/session.test.ts` — covers AUTH-01 session persistence
- [ ] `remix-app/tests/auth/role.test.ts` — covers AUTH-02 role field
- [ ] `remix-app/tests/routes/auth-layout.test.ts` — covers AUTH-02 loader redirect
- [ ] `remix-app/tests/db/schema-columns.test.ts` — covers TEN-01 column/index presence
- [ ] `remix-app/tests/db/constraints.test.ts` — covers TEN-04 constraint swap

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Better-Auth email/password; bcrypt/argon2 via Better-Auth; no hand-rolled hashing |
| V3 Session Management | yes | Better-Auth signed cookie sessions; `SameSite=Lax`; `expiresIn` + `updateAge` configured |
| V4 Access Control | yes | Authenticated layout loader — `redirect()` on missing session; role field on user; D-01 invite-only hook |
| V5 Input Validation | yes | React Router form data; invite token validated server-side; no user-controlled role input (`input: false`) |
| V6 Cryptography | yes | Never hand-roll — Better-Auth handles password hashing + session token generation |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Open signup (unauthenticated account creation) | Elevation of privilege | `beforeSignUp` hook throws 403 unless invite token matches |
| Session fixation | Elevation of privilege | Better-Auth rotates session token on sign-in |
| Role self-assignment | Elevation of privilege | `additionalFields.role` has `input: false` — users cannot POST a role during signup/profile update |
| Leaked PILOT_BASIC_AUTH env var after Phase 3 | Information disclosure | Delete `PILOT_BASIC_AUTH` from Vercel env after Phase 3 deploy |
| Unauthenticated access to data routes | Information disclosure | Authenticated layout loader redirects to `/login` — not opt-in per route |
| JWT claims leaking across pooled connections (Phase 7 concern) | Information disclosure | Phase 3 does NOT set any `SET LOCAL` — this is Phase 7; no leakage risk in Phase 3 |

**Phase 7 groundwork Phase 3 lays:**
The `tenantId` and `subjectId` columns added in Phase 3 are the values that Phase 7's `SET LOCAL request.jwt.claims` will carry. Phase 3 only writes them to schema. No `NOBYPASSRLS` role, no `FORCE ROW LEVEL SECURITY`, no RLS policies are created — those are Phase 7. The only Phase 3 obligation to Phase 7 is: **all 8 tables have non-null `tenant_id` and `subject_id` columns, correctly backfilled**.

---

## Sources

### Primary (HIGH confidence)
- [Better-Auth official docs — Database/extending core schema](https://www.better-auth.com/docs/concepts/database) — user/session/account/verification table schemas; additionalFields configuration
- [Better-Auth official docs — Drizzle adapter](https://www.better-auth.com/docs/adapters/drizzle) — drizzleAdapter config; provider: "pg"; schema passing
- [Better-Auth official docs — React Router integration](https://better-auth.com/docs/integrations/react-router) — resource route pattern; loader/action handler
- [Better-Auth official docs — Session management](https://www.better-auth.com/docs/concepts/session-management) — expiresIn, updateAge, cookieCache; getSession() pattern
- [Better-Auth official docs — Email/password](https://www.better-auth.com/docs/authentication/email-password) — enabled config; rememberMe; server API methods
- [Better-Auth official docs — Hooks](https://www.better-auth.com/docs/concepts/hooks) — createAuthMiddleware; before hooks; APIError for blocking sign-up
- [Better-Auth official docs — Organization plugin](https://www.better-auth.com/docs/plugins/organization) — schema tables; role model; invitation workflow
- [Better-Auth official docs — Admin plugin](https://www.better-auth.com/docs/plugins/admin) — additionalFields role column; user.role; session schema
- [Better-Auth official docs — Options reference](https://www.better-auth.com/docs/reference/options) — disableSignUp option
- [Drizzle ORM — Custom migrations](https://orm.drizzle.team/docs/kit-custom-migrations) — generate --custom; ADD COLUMN nullable → backfill → NOT NULL pattern
- [01-SPIKE-FINDINGS.md](/.planning/phases/01-schema-baseline-engine-tests-auth-spike/01-SPIKE-FINDINGS.md) — SET LOCAL vs bare SET leak proof; NOBYPASSRLS requirement; fail-closed NULLIF policy

### Secondary (MEDIUM confidence)
- npm registry `npm view better-auth` — confirmed version 1.6.15, created 2024-04-22, source repo github.com/better-auth/better-auth
- npm registry `npm view @better-auth/drizzle-adapter` — confirmed version 1.6.15, created 2026-01-21, homepage better-auth.com/docs/adapters/drizzle

### Tertiary (LOW confidence)
- WebSearch results on constraint swap patterns — verified against Drizzle custom migrations docs

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — better-auth and @better-auth/drizzle-adapter confirmed on npm registry + official docs
- Architecture: HIGH — React Router 7 layout pattern + Better-Auth handler pattern confirmed from official docs
- Migration mechanics: MEDIUM — expand-contract pattern verified from Drizzle custom migrations docs; exact drizzle-kit behavior with NOT NULL columns not confirmed by a live run
- Invite-only hook: HIGH — createAuthMiddleware + APIError pattern confirmed from official hooks docs
- Org plugin analysis: HIGH — confirmed org plugin tables and roles; confirmed it is NOT the right fit for this project
- Pitfalls: MEDIUM — some derived from spike findings (HIGH); others from training knowledge (MEDIUM)

**Research date:** 2026-06-09
**Valid until:** 2026-07-09 (Better-Auth is actively developed; recheck if > 30 days)
