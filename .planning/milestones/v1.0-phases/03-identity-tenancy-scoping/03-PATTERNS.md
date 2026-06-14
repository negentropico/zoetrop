# Phase 3: Identity + Tenancy Scoping - Pattern Map

**Mapped:** 2026-06-09
**Files analyzed:** 9 new/modified files
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `remix-app/app/lib/auth.server.ts` | service (server-only module) | request-response | `remix-app/app/lib/db.server.ts` | role-match (same server-only module pattern, lazy init, singleton export) |
| `remix-app/app/lib/auth-client.ts` | utility (browser-safe) | request-response | `remix-app/app/lib/db.server.ts` | partial (same lib/ convention; client-side has no real analog yet) |
| `remix-app/app/routes/api.auth.$.ts` | route (resource route) | request-response | `remix-app/app/routes/import/whoop.tsx` (action route) | partial (action pattern; no existing resource-only catch-all) |
| `remix-app/app/routes/_app/layout.tsx` | layout (authenticated parent) | request-response | `remix-app/app/routes/metrics/layout.tsx` + `remix-app/app/routes/import/layout.tsx` | role-match (layout.tsx exports default component + Outlet; new one adds a loader) |
| `remix-app/app/routes/landing.tsx` | route (public page) | request-response | `remix-app/app/routes/home.tsx` | role-match (same route file shape; no loader needed) |
| `remix-app/app/routes/auth/login.tsx` | route (form + action) | request-response | `remix-app/app/routes/import/whoop.tsx` (action) | partial (closest action route; login adds server action + client form) |
| `remix-app/app/routes/auth/logout.tsx` | route (action-only) | request-response | `remix-app/app/routes/import/whoop.tsx` | partial (action-only resource route shape) |
| `remix-app/db/schema.ts` | model (schema) | CRUD | self (already exists; 8 existing table definitions are the pattern) | exact (modify in place, copy existing table/enum idioms) |
| `remix-app/migrations/` (new migration files) | migration | batch | `remix-app/migrations/0000_light_blue_shield.sql` | exact (same drizzle-kit SQL migration format) |
| `remix-app/scripts/seed-owner.ts` | utility (CLI script) | batch | `remix-app/scripts/ds-audit.sh` (only existing script) | partial (scripts/ directory convention; .ts script has no exact analog) |
| `remix-app/app/root.tsx` | config (modified) | request-response | self | exact (remove loader + headers(); keep Layout, ErrorBoundary, App→bare Outlet) |
| `remix-app/app/routes.ts` | config (modified) | request-response | self | exact (same RouteConfig idiom; add public routes + authenticated layout wrapper) |

---

## Pattern Assignments

### `remix-app/app/lib/auth.server.ts` (service, server-only module)

**Analog:** `remix-app/app/lib/db.server.ts`

**Imports pattern** (db.server.ts lines 1–4):
```typescript
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../../db/schema';
```
Mirror this for auth.server.ts — same `../../db/schema` path convention, same `lib/` location, `.server.ts` suffix enforces server-only.

**Singleton / lazy-init pattern** (db.server.ts lines 5–31):
```typescript
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: Pool | null = null;

function getPool(): Pool {
  if (_pool) return _pool;
  const connectionString =
    process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Database connection string not found...');
  }
  _pool = new Pool({ connectionString });
  return _pool;
}

export function getDb() {
  if (_db) return _db;
  const pool = getPool();
  _db = drizzle(pool, { schema });
  return _db;
}
```
`auth.server.ts` should call `getDb()` (imported from `./db.server`) rather than creating its own Pool. The `auth` object is a module-level singleton (no lazy pattern needed — betterAuth is sync config):

```typescript
// remix-app/app/lib/auth.server.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { getDb } from "./db.server";
import * as schema from "../../db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema,  // MUST include Better-Auth tables (user/session/account/verification)
  }),
  // ... config
});
```

**Error handling pattern** (db.server.ts line 17–19):
```typescript
if (!connectionString) {
  throw new Error('Database connection string not found. Set NETLIFY_DATABASE_URL or DATABASE_URL.');
}
```
Use the same `throw new Error(...)` style for missing env vars (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`). No `console.error` side effects — throw and let the caller surface it.

**Pattern notes:**
- File MUST have `.server.ts` suffix — React Router / Vite strips server-only modules from the client bundle.
- Import `getDb()` from `./db.server`, not raw Pool — reuse the existing singleton pool.
- Pass `schema` (the full re-export barrel from `db/schema.ts`) to `drizzleAdapter` — without it Better-Auth cannot locate its own tables at runtime.
- No `any` — use typed `Record<string, unknown>` casts in the beforeSignUp hook body.

---

### `remix-app/app/lib/auth-client.ts` (utility, browser-safe)

**Analog:** `remix-app/app/lib/db.server.ts` (same lib/ convention; auth-client.ts is the browser counterpart)

**Pattern:**
```typescript
// remix-app/app/lib/auth-client.ts
// NO .server.ts suffix — this file is browser-safe
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
});
```
No imports from db.server or any server-only module. The `baseURL` pattern handles SSR (server has no `window`).

**Pattern notes:**
- No `.server.ts` suffix — this file is imported by login/logout components that run in the browser.
- No Pool, no schema, no secret — purely the Better-Auth client methods (`signIn`, `signOut`, `useSession`).

---

### `remix-app/app/routes/api.auth.$.ts` (route, resource route)

**Analog:** The action pattern from any existing route (e.g., `remix-app/app/routes/import/whoop.tsx`).

**RouteConfig registration pattern** (routes.ts lines 1–4):
```typescript
import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";
// ...
route("api/auth/*", "routes/api.auth.$.ts"),
```
The `$` in the filename is the wildcard segment. The route path must be `"api/auth/*"` (not `"/api/auth/*"`) — no leading slash in RouteConfig paths.

**Loader + action shape** (matches React Router resource route convention):
```typescript
// remix-app/app/routes/api.auth.$.ts
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  return auth.handler(request);
}

export async function action({ request }: ActionFunctionArgs) {
  return auth.handler(request);
}
// No default export — this is a resource route
```

**Pattern notes:**
- No default export (no JSX component) — it is a pure resource/API route.
- Both `loader` and `action` delegate to `auth.handler(request)` — Better-Auth dispatches internally based on HTTP method + path.
- `~` alias resolves to `remix-app/app/` (confirmed by existing use in home.tsx line 19: `import { getMetricStatus } from "~/lib/metrics"`).

---

### `remix-app/app/routes/_app/layout.tsx` (layout, authenticated parent)

**Analog:** `remix-app/app/routes/metrics/layout.tsx` (layout with Outlet) + `remix-app/app/routes/import/layout.tsx` (simpler layout)

**Layout shell pattern** (metrics/layout.tsx lines 55–58, import/layout.tsx lines 11–51):
```typescript
// Both layouts: default export + Outlet, no loader
export default function MetricsLayout() {
  return (
    <div>
      {/* ... nav */}
      <Outlet />
    </div>
  );
}
```
The authenticated layout ADDS a loader (new pattern for this codebase) and wraps children with `<AppShell>` (moved from root.tsx).

**Full pattern to implement:**
```typescript
// remix-app/app/routes/_app/layout.tsx
import { redirect, Outlet } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";
import { AppShell } from "~/components/shell/AppShell";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    const url = new URL(request.url);
    throw redirect(`/login?redirect=${encodeURIComponent(url.pathname)}`);
  }
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

**AppShell import path** (from AppShell.tsx line 1 comment + existing root.tsx line 12):
```typescript
import { AppShell } from "./components/shell/AppShell";       // in root.tsx
import { AppShell } from "~/components/shell/AppShell";       // in any route file
```
Route files should use the `~` alias (`~/components/shell/AppShell`), not relative paths.

**Pattern notes:**
- `throw redirect(...)` (not `return redirect(...)`) — React Router 7 idiom for early exit from loaders.
- `auth.api.getSession({ headers: request.headers })` — MUST pass `request.headers` or session will always be null.
- `AppShell` moves here FROM `root.tsx` — do not leave it in both places.
- The `_app/` folder prefix is a filesystem organization choice with no special React Router meaning in RouteConfig mode.

---

### `remix-app/app/routes/landing.tsx` (route, public page)

**Analog:** `remix-app/app/routes/home.tsx`

**Route file shape** (home.tsx lines 1–3, imports):
```typescript
import { Link } from "react-router";
import type { Route } from "./+types/home";
// ... component-specific imports
```
The landing page has the same shape but NO loader (public, no auth check), and does NOT render inside `<AppShell>` (which is now in the authenticated layout). It renders a standalone page.

**RouteConfig registration** (routes.ts line 4):
```typescript
index("routes/home.tsx"),
```
Landing replaces this: `index("routes/landing.tsx")` — the `/` path becomes the public landing. The dashboard route (`routes/_app/dashboard.tsx`) gets the old home.tsx content moved to it.

**Pattern notes:**
- No loader needed (public page).
- No `<AppShell>` wrapper — landing renders outside the authenticated layout.
- home.tsx content (dashboard) moves to `routes/_app/dashboard.tsx` (unchanged logic, new path).

---

### `remix-app/app/routes/auth/login.tsx` (route, form + server action)

**Analog:** Action shape from `remix-app/app/routes/import/whoop.tsx` (closest existing action route).

**Action pattern** (standard React Router 7 action):
```typescript
// remix-app/app/routes/auth/login.tsx
import { redirect } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";

// Redirect already-authenticated users away from login
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (session) throw redirect("/dashboard");
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirect") as string) ?? "/dashboard";

  const response = await auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  });

  if (!response.ok) {
    return { error: "Invalid credentials" };
  }

  // Forward Set-Cookie from Better-Auth's response
  throw redirect(redirectTo, { headers: response.headers });
}

export default function LoginPage() {
  // Form with email/password + hidden redirect field
  // Use authClient from ~/lib/auth-client for client-side submission if preferred
}
```

**No `any`** — use `formData.get("email") as string` (checked cast), not untyped.

**RouteConfig registration:**
```typescript
route("login", "routes/auth/login.tsx"),
```

---

### `remix-app/app/routes/auth/logout.tsx` (route, action-only)

**Analog:** Resource route shape from `api.auth.$.ts` (action-only, no component).

**Pattern:**
```typescript
// remix-app/app/routes/auth/logout.tsx
import { redirect } from "react-router";
import type { ActionFunctionArgs } from "react-router";
import { auth } from "~/lib/auth.server";

export async function action({ request }: ActionFunctionArgs) {
  await auth.api.signOut({ headers: request.headers, asResponse: false });
  throw redirect("/login");
}
// No loader, no default export
```

**RouteConfig registration:**
```typescript
route("logout", "routes/auth/logout.tsx"),
```

---

### `remix-app/db/schema.ts` (model, CRUD — modified in place)

**Analog:** Self — the existing 8 table definitions and 7 enums are the pattern to replicate.

**Existing enum pattern** (schema.ts lines 14–68):
```typescript
export const metricCategoryEnum = pgEnum('metric_category', [
  'vitamins', 'minerals', /* ... */
]);
```
New enums follow the same `export const <name>Enum = pgEnum('<snake_case>', [...])` idiom.

**New enum to add:**
```typescript
export const appRoleEnum = pgEnum('app_role', ['owner', 'practitioner', 'client']);
```

**Existing table pattern** (schema.ts lines 71–90 — metrics table):
```typescript
export const metrics = pgTable('metrics', {
  id: varchar('id', { length: 36 }).primaryKey(),
  // ...
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```
Note: existing tables use `integer` PKs with `generatedAlwaysAsIdentity()` (all except `metrics` which uses `varchar(36)`). New tenancy tables (`tenants`, `subjects`) use `text` PKs (UUID string, matching Better-Auth's `user.id` type).

**New tables to add** (paste after existing tables):
```typescript
// Better-Auth core tables (user/session/account/verification) — in db/auth-schema.ts
// imported here: export * from "./auth-schema";

// Tenancy spine
export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const subjects = pgTable('subjects', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Columns to add to all 8 data tables** (expand-contract: start nullable):
```typescript
// In each of the 8 tables (metrics, protocolVersions, protocolChanges,
// milestones, supplements, supplementLog, correlations, cessationLog):
tenantId: text('tenant_id').references(() => tenants.id),   // nullable first
subjectId: text('subject_id').references(() => subjects.id), // nullable first
```

**`protocolVersions` constraint change** (schema.ts line 95):
```typescript
// BEFORE (remove):
version: varchar('version', { length: 10 }).notNull().unique(),
// AFTER (per-subject uniqueness — TEN-04):
version: varchar('version', { length: 10 }).notNull(),
// Unique constraint on (tenant_id, subject_id, version) handled in migration SQL
```

**Existing relations pattern** (schema.ts lines 173–201) — add `tenants`/`subjects` relations after the tenancy table definitions, following the same `relations(table, ({ many/one }) => ...)` style.

**Barrel export for Better-Auth adapter** — add at the end of schema.ts:
```typescript
export * from "./auth-schema";
```
The `drizzleAdapter` in `auth.server.ts` receives the full `* as schema` import and must be able to find the Better-Auth tables.

---

### `remix-app/migrations/` (new migration files — batch)

**Analog:** `remix-app/migrations/0000_light_blue_shield.sql`

**Migration file format** (0000_light_blue_shield.sql lines 1–7):
```sql
CREATE TYPE "public"."cessation_phase" AS ENUM('acute', 'stabilization', 'clearing', 'optimization');--> statement-breakpoint
CREATE TABLE "cessation_log" (
  ...
);--> statement-breakpoint
ALTER TABLE "correlations" ADD CONSTRAINT "..." FOREIGN KEY (...) REFERENCES ...;--> statement-breakpoint
```
Each DDL statement is separated by `--> statement-breakpoint`. Drizzle-kit generates these; custom migrations must follow the same format when using `drizzle-kit generate --custom`.

**Drizzle config** (drizzle.config.ts lines 1–10):
```typescript
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema.ts',
  out: './migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED || process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL!,
  },
});
```
Custom migrations go in `remix-app/migrations/` (the `out` directory). The naming convention is `NNNN_<slug>.sql`. Numbers must be sequential.

**Existing constraint syntax** (from 0000 migration line 76):
```sql
CONSTRAINT "protocol_versions_version_unique" UNIQUE("version")
```
The custom migration to swap this constraint is:
```sql
ALTER TABLE "protocol_versions" DROP CONSTRAINT "protocol_versions_version_unique";--> statement-breakpoint
ALTER TABLE "protocol_versions" ADD CONSTRAINT "protocol_versions_tenant_subject_version_unique" UNIQUE ("tenant_id", "subject_id", "version");--> statement-breakpoint
```

**3-migration sequence filenames:**
- `0001_better_auth_and_tenancy_spine.sql` — auto-generated (CREATE TABLE user/session/account/verification/tenants/subjects + CREATE TYPE app_role)
- `0002_tenancy_columns_nullable.sql` — custom (ADD COLUMN tenant_id/subject_id nullable to 8 tables + DROP old unique constraint)
- `0003_tenancy_backfill.sql` — custom (DO $$ ... UPDATE all 8 tables $$)
- `0004_tenancy_not_null.sql` — custom (ALTER COLUMN SET NOT NULL + CREATE INDEX CONCURRENTLY + ADD CONSTRAINT composite unique)

---

### `remix-app/scripts/seed-owner.ts` (utility, CLI script)

**Analog:** `remix-app/scripts/ds-audit.sh` (only existing script — establishes scripts/ as the right location)

**Package.json scripts pattern** (package.json):
```json
"ds:audit": "bash scripts/ds-audit.sh"
```
Add:
```json
"db:seed-owner": "npx tsx scripts/seed-owner.ts"
```
`tsx` (TypeScript executor) is the standard for running `.ts` scripts in Node without a compile step; check `devDependencies` for `tsx` or use `ts-node`.

**Import pattern** — seed script imports from app lib using relative paths (scripts/ is outside app/):
```typescript
import { getDb } from "../app/lib/db.server";
import { tenants, subjects } from "../../db/schema";
// Note: path is relative to scripts/seed-owner.ts:
//   ../app/lib/db.server  → remix-app/app/lib/db.server.ts
//   ../../db/schema       → remix-app/db/schema.ts  (same as db.server.ts uses)
```

**Pattern notes:**
- Run from `remix-app/` directory (same as all other npm scripts).
- Must set env vars `DATABASE_URL` + `OWNER_EMAIL` + `OWNER_PASSWORD` + `OWNER_INVITE_TOKEN` before running.
- See open question A1 in RESEARCH.md regarding `hashPassword` import — prefer `auth.api.signUpEmail()` with the invite token rather than direct DB insert, to avoid knowing Better-Auth's internal password hash format.

---

### `remix-app/app/root.tsx` (config — modified)

**Analog:** Self (lines 1–129 — all existing structure kept, specific sections deleted)

**What to DELETE** (lines 31–55 — the throwaway pilot gate):
```typescript
// DELETE this entire block (D-05):
export async function loader({ request }: Route.LoaderArgs) {
  const expected = process.env.PILOT_BASIC_AUTH;
  if (expected) { /* ... */ }
  return null;
}

// DELETE this export too (lines 60–62):
export function headers({ errorHeaders, loaderHeaders }: Route.HeadersArgs) {
  return errorHeaders ?? loaderHeaders;
}
```

**What to CHANGE** — `App()` default export (lines 94–99):
```typescript
// BEFORE:
export default function App() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

// AFTER (AppShell moves to _app/layout.tsx):
export default function App() {
  return <Outlet />;
}
```

**What to KEEP unchanged:**
- `links` export (lines 17–28) — Google Fonts preconnect
- `NO_FLASH_SCRIPT` + `Layout` export (lines 67–90) — theme + HTML shell
- `ErrorBoundary` export (lines 102–129)
- `import { AppShell }` line 12 — DELETE once App() no longer uses it

**Pattern notes:**
- After removing `AppShell` from `App()`, remove its import on line 12 (or TypeScript strict will error on unused import).
- `loader` and `headers` exports are removed entirely — no replacement needed in root.tsx (auth gating moves to `_app/layout.tsx` loader).

---

### `remix-app/app/routes.ts` (config — modified)

**Analog:** Self (lines 1–32 — existing RouteConfig is the exact pattern to extend)

**Existing registration pattern** (routes.ts lines 1–32):
```typescript
import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  layout("routes/metrics/layout.tsx", [
    route("metrics", "routes/metrics/index.tsx"),
    // ...
  ]),
  // ...
] satisfies RouteConfig;
```

**Target structure after Phase 3:**
```typescript
export default [
  // PUBLIC — no auth check
  index("routes/landing.tsx"),
  route("login", "routes/auth/login.tsx"),
  route("logout", "routes/auth/logout.tsx"),
  route("api/auth/*", "routes/api.auth.$.ts"),

  // AUTHENTICATED — gated by _app/layout.tsx loader
  layout("routes/_app/layout.tsx", [
    route("dashboard", "routes/_app/dashboard.tsx"),
    layout("routes/_app/metrics/layout.tsx", [
      route("metrics", "routes/_app/metrics/index.tsx"),
      route("metrics/:category", "routes/_app/metrics/category.tsx"),
      route("metrics/:category/:metricId", "routes/_app/metrics/detail.tsx"),
    ]),
    layout("routes/_app/protocol/layout.tsx", [
      route("protocol", "routes/_app/protocol/index.tsx"),
      route("protocol/versions", "routes/_app/protocol/versions.tsx"),
      route("protocol/versions/:version", "routes/_app/protocol/version-detail.tsx"),
      route("protocol/supplements", "routes/_app/protocol/supplements.tsx"),
      route("protocol/cessation", "routes/_app/protocol/cessation.tsx"),
      route("protocol/compare", "routes/_app/protocol/compare.tsx"),
    ]),
    layout("routes/_app/insights/layout.tsx", [
      route("insights", "routes/_app/insights/index.tsx"),
      route("insights/correlations", "routes/_app/insights/correlations.tsx"),
      route("insights/genetics", "routes/_app/insights/genetics.tsx"),
    ]),
    layout("routes/_app/import/layout.tsx", [
      route("import", "routes/_app/import/index.tsx"),
      route("import/whoop", "routes/_app/import/whoop.tsx"),
      route("import/vault", "routes/_app/import/vault.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
```

**Pattern notes:**
- No leading `/` on route paths — RouteConfig convention (confirmed by existing file lines 7–30).
- `layout()` takes a file path + children array, no URL segment of its own.
- All existing section route files physically move from `routes/metrics/` → `routes/_app/metrics/` etc. (file moves only — content unchanged, just new path).

---

## Shared Patterns

### Server-only module enforcement
**Source:** `remix-app/app/lib/db.server.ts` (`.server.ts` suffix)
**Apply to:** `auth.server.ts`
```
*.server.ts files are never bundled into the client by Vite/React Router.
auth-client.ts has NO .server.ts suffix — it is intentionally browser-safe.
```

### `~` path alias
**Source:** `remix-app/app/routes/home.tsx` line 19:
```typescript
import { getMetricStatus } from "~/lib/metrics";
```
**Apply to:** All new route files (`api.auth.$.ts`, `_app/layout.tsx`, `auth/login.tsx`, `auth/logout.tsx`)
All route files use `~/` to resolve to `remix-app/app/`. Do not use deep relative paths (`../../lib/`) in route files.

### `throw redirect(...)` (not `return redirect(...)`)
**Source:** React Router 7 convention (observed in research; not yet in codebase — first loader with redirect is `_app/layout.tsx`)
**Apply to:** `_app/layout.tsx` loader, `auth/login.tsx` loader + action
```typescript
throw redirect("/login?redirect=...");   // correct — terminates loader early
return redirect("/login");               // incorrect — returns a Response, not thrown
```

### TypeScript strict / no `any`
**Source:** `docs/PRINCIPLES.md` + tsconfig.json (strict mode)
**Apply to:** All new files
- Use `as string` casts only after runtime checks, or narrow explicitly.
- `Record<string, unknown>` instead of `any` for untyped objects (e.g., `ctx.body` in auth hook).
- No `@ts-ignore` or `@ts-expect-error` without a comment explaining why.

### Drizzle schema conventions
**Source:** `remix-app/db/schema.ts` lines 1–12 (imports) and lines 173–201 (relations)
```typescript
import { pgTable, varchar, text, integer, real, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
```
New tables and auth-schema.ts must use the same import set (add `boolean` for Better-Auth's `emailVerified` column). Table names use `snake_case` strings; TypeScript exports use `camelCase`.

### `satisfies RouteConfig` assertion
**Source:** `remix-app/app/routes.ts` line 32:
```typescript
] satisfies RouteConfig;
```
**Apply to:** Modified routes.ts — keep this assertion on the array close.

---

## No Analog Found

All files have analogs. No entries required in this section.

---

## Metadata

**Analog search scope:** `remix-app/app/lib/`, `remix-app/app/routes/`, `remix-app/db/`, `remix-app/migrations/`, `remix-app/scripts/`, `remix-app/app/root.tsx`, `remix-app/app/routes.ts`
**Files scanned:** 12 source files read
**Pattern extraction date:** 2026-06-09
