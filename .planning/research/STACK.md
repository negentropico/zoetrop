# Stack Research — M1 Additive Libraries

**Domain:** Multi-tenant functional-health coaching platform (brownfield M1 additions to Remix + Neon/Drizzle + Netlify)
**Researched:** 2026-06-07
**Confidence:** HIGH (auth, background jobs, testing); MEDIUM (RLS wiring mechanism, file storage PHI posture)

> This document covers ONLY what needs to be ADDED for M1. The existing stack (React Router 7.12, Drizzle 0.45.1, @neondatabase/serverless 1.0.2, Tailwind 4, Recharts, date-fns, Netlify CI/CD) is locked and not re-recommended here.

---

## 1. Auth + RBAC

### Recommended: Better Auth 1.6.14 + organization plugin

**Install:**
```bash
npm install better-auth@^1.6
```

**Why Better Auth over alternatives:**

- **vs Auth.js (NextAuth):** Auth.js defaults to JWTs and was designed for Next.js; getting server-side sessions in Remix loaders requires workarounds. Better Auth is framework-agnostic, defaults to server-side sessions, and ships a first-class Remix handler pattern (`loader`/`action` passthrough to `auth.handler(request)`). The organization plugin ships multi-tenancy, RBAC, invitations, and a `createAccessControl` + `ac.newRole()` model out of the box — Auth.js requires building all of that from scratch.
- **vs Clerk:** Clerk is a hosted SaaS; PHI requires a BAA and full audit of their data handling. Zoetrop owns its data in Neon — keeping auth in-stack avoids a third-party PHI processor.
- **vs Lucia:** Lucia v3 explicitly re-positioned itself as "learning resources + examples", not a library. It no longer ships adapters or session management primitives. Do not use.

**Role model:** Better Auth's `organization` plugin maps directly to Zoetrop's three-role model. Define custom roles via `createAccessControl`:

```ts
// lib/auth/permissions.ts
import { createAccessControl } from "better-auth/plugins/access"

const statement = {
  client:   ["create", "read", "update"],
  protocol: ["create", "read", "update", "delete"],
  report:   ["create", "read"],
  ingest:   ["create", "read", "update"],
} as const

export const ac = createAccessControl(statement)
export const owner       = ac.newRole({ client: ["create","read","update"], protocol: ["create","read","update","delete"], report: ["create","read"], ingest: ["create","read","update"] })
export const practitioner = ac.newRole({ client: ["read","update"], protocol: ["create","read","update"], report: ["create","read"], ingest: ["create","read","update"] })
export const client      = ac.newRole({ protocol: ["read"], report: ["read"] })
```

Pass `{ ac, roles: { owner, practitioner, client } }` to the `organization()` plugin.

**Drizzle adapter:** Better Auth ships `drizzleAdapter(db, { provider: "pg" })` — pass the existing Drizzle instance directly. Run `npx @better-auth/cli generate` to emit auth schema (user, session, account, verification, organization, member, invitation tables) into the Drizzle schema file, then `npm run db:generate && npm run db:migrate`.

**Remix wiring:** One catch-all route `app/routes/api.auth.$.ts` passes `loader` and `action` to `auth.handler(request)`. Get session in any loader via `auth.api.getSession({ headers: request.headers })`.

**Audit logging:** The `dash()` infrastructure plugin (part of Better Auth) auto-collects auth event audit logs once added. Wire it for the PHI audit trail requirement (PLATFORM §5.7). Requires a `BETTER_AUTH_API_KEY` env var.

**Confidence:** HIGH — verified via Context7 (better-auth docs), confirmed active maintenance (1.6.14 published June 2026, regular releases), confirmed Remix handler pattern in official docs.

---

## 2. Postgres RLS + Multi-Tenancy (Neon + Drizzle)

### Recommended: Drizzle RLS APIs (pgTable.withRLS, pgPolicy, crudPolicy) + pg_session_jwt

**No new package needed** — the RLS APIs ship in `drizzle-orm` (current: 0.45.1 stable; `1.0.0-rc.4` available on the `beta` tag). **Stay on 0.45.x stable for M1** — the rc.4 is very close to 1.0 GA but introduces breaking changes (`.enableRLS()` → `pgTable.withRLS()`). Plan a Drizzle 1.0 upgrade in the first M1 schema phase.

**RLS mechanism with Neon:**

Neon ships the `pg_session_jwt` extension with two built-in Postgres roles (`authenticated`, `anonymous`) and `auth.user_id()` (extracts `sub` claim from the active JWT). Drizzle exposes these via `drizzle-orm/neon`:

```ts
import { authenticatedRole, authUid, crudPolicy } from "drizzle-orm/neon"
import { pgTable, text, uuid } from "drizzle-orm/pg-core"

export const metrics = pgTable.withRLS("metrics", {
  id: uuid("id").primaryKey(),
  tenantId: uuid("tenant_id").notNull(),
  subjectId: uuid("subject_id").notNull(),
  // ...
}, (t) => [
  crudPolicy({
    role: authenticatedRole,
    read:   authUid(t.subjectId),   // subject sees own rows
    modify: authUid(t.subjectId),
  }),
])
```

**Per-request JWT context in serverless:** Because Netlify functions are stateless, you cannot rely on a persistent Postgres session. The pattern is to set the JWT in a transaction using `pg_session_jwt`:

```ts
// lib/db.server.ts — RLS-aware query wrapper
import { neon } from "@neondatabase/serverless"

export async function withUserRLS<T>(
  jwtToken: string,
  fn: (db: NeonQueryFunction) => Promise<T>
): Promise<T> {
  const sql = neon(process.env.DATABASE_URL!)
  return await sql.transaction(async (tx) => {
    await tx`SELECT auth.jwt_session_init(${jwtToken})`
    return fn(tx)
  })
}
```

Better Auth issues a session token (not a raw JWT) by default. For RLS you need a signed JWT that Neon's `pg_session_jwt` can validate. **Two options:**

1. **Neon Auth mode (recommended):** Configure Neon to trust Better Auth's session JWTs by providing a JWK endpoint. Neon's `pg_session_jwt` then validates them natively. Set `PGOPTIONS="-c pg_session_jwt.jwk=<your-jwk-json>"` in Netlify env vars.
2. **Manual set_config fallback:** If JWK wiring is deferred, set `SET request.jwt.claims = '{"sub": "<userId>", "tenantId": "<tenantId>"}'` in a transaction before each RLS query. This works but bypasses JWT signature validation — acceptable for early M1, must be replaced before handling real PHI.

**Confidence:** MEDIUM-HIGH — Drizzle RLS APIs and `drizzle-orm/neon` exports verified via Context7; Neon `pg_session_jwt` mechanism verified via official Neon docs. The JWK wiring between Better Auth and Neon is documented in Neon's custom-JWT demo repo but not in a step-by-step guide for Better Auth specifically — flag as needing a spike.

---

## 3. LLM Document Extraction

### Recommended: Vercel AI SDK 6.x + `@ai-sdk/anthropic` 3.x + Claude `claude-sonnet-4-6`

**Install:**
```bash
npm install ai@^6 @ai-sdk/anthropic@^3
```

**Why AI SDK over raw `@anthropic-ai/sdk`:**
- `generateObject` with Zod schema gives guaranteed-valid structured extraction with zero `JSON.parse()` risk — critical for lab panel parsing where a malformed number is a patient-safety bug.
- Provider-agnostic: same call shape for Claude and OpenAI means you can swap or A/B models without rewriting extraction logic.
- Streams natively into Remix actions — useful for showing progress during multi-page PDF parsing.
- The raw `@anthropic-ai/sdk` is fine for direct tool-use calls but requires manual Zod validation layering.

**Extraction pattern:**
```ts
import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"

const LabPanelSchema = z.object({
  panelType: z.enum(["bloodwork", "htma", "dutch", "gut", "dna"]),
  labDate: z.string().datetime(),
  markers: z.array(z.object({
    name:      z.string(),
    value:     z.number(),
    unit:      z.string(),
    refMin:    z.number().nullable(),
    refMax:    z.number().nullable(),
    confidence: z.enum(["extracted", "inferred", "absent"]),
  })),
  extractionNotes: z.string().optional(),
})

const { object } = await generateObject({
  model: anthropic("claude-sonnet-4-6"),
  schema: LabPanelSchema,
  messages: [
    { role: "user", content: [{ type: "text", text: pdfText }] }
  ],
  system: EXTRACTION_SYSTEM_PROMPT,
})
```

**Model selection:**
- **`claude-sonnet-4-6`** — use for extraction (best speed/accuracy ratio, 200K context, handles full lab PDFs). Current as of June 2026.
- **`claude-haiku-4-5`** — use for cheap classification tasks (panel type detection, quick re-checks).
- **`claude-opus-4-7`** — reserve for protocol report generation where reasoning depth matters more than cost.

**Zod:** Must use Zod 4.x (`zod@^4`) — AI SDK 6 generates JSON schema from Zod 4. The existing codebase does not have Zod; add it.

**Human-in-the-loop pattern:** After `generateObject` returns the `LabPanelSchema` object, persist it to a `labDocumentDrafts` table with `status: "pending_review"`. The practitioner reviews in a Remix route (`/import/review/:id`) before committing to `metrics`. The Inngest job (see §4) handles the async extract step; the review is synchronous UI.

**Confidence:** HIGH — verified via Context7 (AI SDK docs), official Claude API docs (model IDs confirmed), and npm (ai@6.0.83, @ai-sdk/anthropic@3.0.81 current).

---

## 4. Background Jobs (Ingest, Report-Gen, Correlation Recompute)

### Recommended: Inngest 4.5.0

**Install:**
```bash
npm install inngest@^4
npm install -D netlify-plugin-inngest
```

Add to `netlify.toml`:
```toml
[[plugins]]
package = "netlify-plugin-inngest"
[plugins.inputs]
path = "/api/inngest"
```

**Why Inngest over alternatives:**
- **vs Netlify Background Functions alone:** Background Functions run up to 15 minutes but have no retry, no step isolation, no observability, and no event fan-out. Inngest gives durable step functions, retry with backoff, an event-driven queue, and a dev UI — all without a Redis/queue server.
- **vs Trigger.dev:** Both are viable; Inngest has an official Netlify plugin and a Remix adapter (`inngest/remix`), making integration mechanical. Trigger.dev requires more custom wiring on Netlify.
- **vs BullMQ/Redis:** Requires a persistent Redis instance — not available on Netlify without an external service; overkill for M1 volume.

**Netlify constraint:** Standard Netlify functions time out at 26 seconds (Pro plan). Inngest works around this: the Inngest cloud calls your Netlify function per `step.run()` — each step gets its own function invocation, so long jobs are composed of short-lived steps. The Netlify Background Function 15-minute limit applies if you wrap a single step; Inngest's step model keeps each invocation well under 26 seconds.

**Key jobs for M1:**
```
lab/document.uploaded  → [extract step] → [persist draft] → notify practitioner
lab/document.approved  → [structured insert to metrics] → [correlation recompute]
protocol/version.saved → [report.generate] → [persist report]
```

**Serve handler in Remix:**
```ts
// app/routes/api.inngest.ts
import { serve } from "inngest/remix"
import { inngest } from "~/lib/inngest.server"
import { labExtractFn, correlationRecomputeFn, reportGenFn } from "~/inngest/functions"

const handler = serve({ client: inngest, functions: [labExtractFn, correlationRecomputeFn, reportGenFn] })
export const { loader, action } = handler
```

**Confidence:** HIGH — Inngest v4 GA (March 2026), official Netlify plugin confirmed, Remix adapter confirmed in docs, `inngest@4.5.0` current on npm.

---

## 5. Test Harness

### Recommended: Vitest 4.1.8

**Install:**
```bash
npm install -D vitest@^4
```

**Why Vitest:** The app already uses Vite 7.x. Vitest runs in the same Vite pipeline — zero additional bundler config, identical module resolution (including `~/` aliases), and native TypeScript + ESM support. Jest requires a separate babel or ts-jest transform pipeline that fights React Router 7's ESM-first setup. Vitest 4.1.8 supports Vite 6–8.

**Config:** Add to `remix-app/vite.config.ts`:
```ts
import { defineConfig } from "vitest/config"
// merge with existing reactRouter() + tsconfigPaths() config
test: {
  environment: "node",
  include: ["app/**/*.test.ts", "app/**/*.test.tsx"],
  setupFiles: ["./test/setup.ts"],
}
```

Add `"test": "vitest"` to `package.json` scripts.

**What to test first (per PRINCIPLES.md §🎯 Tests):**
1. Status classification logic (`optimal/borderline/deficient/excess` math)
2. Cessation phase calculation (day → phase mapping)
3. Pearson correlation calculation
4. Lab extraction Zod schemas (validate sample panel JSON)
5. RLS policy logic (mock db, assert tenantId scoping)

**Confidence:** HIGH — verified via Context7 (Vitest docs), confirmed Vite 7 compatibility, `vitest@4.1.8` current on npm.

---

## 6. Schema Validation

### Recommended: Zod 4.4.3

**Install:**
```bash
npm install zod@^4
```

Zod 4 is a major version with breaking changes from v3 (import path changes, stricter inference). AI SDK 6 generates JSON schema from Zod 4. Use `import { z } from "zod"` — Zod 4 ships as the default export. Import from `"zod/v4"` only if you need backward compat shims.

**Confidence:** HIGH — Zod 4.4.3 confirmed current on npm, AI SDK 6 compatibility confirmed.

---

## 7. File Storage (Lab Document PDFs)

### Recommended: Netlify Blobs (`@netlify/blobs`) for M1 — with a PHI caveat

**Install:**
```bash
npm install @netlify/blobs
```

Netlify Blobs is the zero-config object store available natively in Netlify Functions. For M1 (single practitioner, pre-revenue, no BAA in place yet), it is the lowest-friction option for storing uploaded lab PDFs before extraction.

**PHI caveat (MEDIUM confidence):** Netlify has a HIPAA-compliant enterprise tier with BAA available, but it is enterprise-gated. The general Netlify Blobs product's coverage under that BAA is not explicitly documented. **Before storing real PHI documents in Blobs, confirm with Netlify sales whether Blobs is a HIPAA-eligible service or upgrade to the enterprise tier.** The alternative — AWS S3 with SSE-KMS — is unambiguously HIPAA-eligible under AWS's BAA but adds operational complexity.

**M1 interim approach:** Store only de-identified or practitioner-uploaded-but-not-yet-linked documents in Blobs during the M1 pilot. Link to a `labDocuments` table row (with `tenantId`, `subjectId`, `status`) to preserve the scoping chain. Confirm Netlify enterprise BAA before production launch.

**Confidence:** MEDIUM — Netlify Blobs integration confirmed; HIPAA BAA coverage for Blobs specifically is unconfirmed and requires direct Netlify verification.

---

## Complete Installation Summary

```bash
cd remix-app

# Auth
npm install better-auth@^1.6

# LLM extraction
npm install ai@^6 @ai-sdk/anthropic@^3 zod@^4

# Background jobs
npm install inngest@^4
npm install -D netlify-plugin-inngest

# File storage
npm install @netlify/blobs

# Testing
npm install -D vitest@^4
```

**No new env vars added to the existing two (`NETLIFY_DATABASE_URL`, `DATABASE_URL`):**

| Var | Purpose |
|-----|---------|
| `BETTER_AUTH_SECRET` | Better Auth session signing key (32+ random bytes) |
| `BETTER_AUTH_URL` | Full origin URL (e.g. `https://zoetrop.netlify.app`) |
| `BETTER_AUTH_API_KEY` | Better Auth dash plugin audit log API key |
| `ANTHROPIC_API_KEY` | Claude API access for extraction + report-gen |
| `INNGEST_EVENT_KEY` | Inngest event signing key |
| `INNGEST_SIGNING_KEY` | Inngest webhook signing key |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Auth | Better Auth 1.6 | Auth.js (NextAuth) | JWT-first, not designed for Remix loaders; no org/RBAC plugin; requires custom multi-tenancy |
| Auth | Better Auth 1.6 | Clerk | Hosted SaaS — PHI requires BAA, adds a third-party PHI processor; removes data control |
| Auth | Better Auth 1.6 | Lucia | Rebranded as "learning resources" in v3; no longer a maintained library |
| Background jobs | Inngest 4.x | Netlify Background Functions alone | No retry, no step isolation, no observability, 15 min hard cap with no partial completion |
| Background jobs | Inngest 4.x | Trigger.dev | Viable but no official Netlify plugin; more custom wiring required |
| LLM extraction | Vercel AI SDK 6 + Claude | Raw `@anthropic-ai/sdk` | Requires manual Zod schema wrapping; not provider-agnostic; no `generateObject` guarantee |
| File storage | Netlify Blobs | AWS S3 | S3 adds IAM + infra complexity; Blobs is zero-config on Netlify — switch to S3 at M2 if HIPAA BAA needed |
| Testing | Vitest 4.x | Jest | Jest requires separate babel/ts-jest config; fights Vite's ESM module resolution; no Vite plugin |
| Validation | Zod 4.x | Zod 3.x | AI SDK 6 targets Zod 4; schema inference differs between versions |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Lucia auth | v3 explicitly retired as a library; now only docs/examples | Better Auth |
| NextAuth / Auth.js | JWT-default session model, Next.js-centric API, no org RBAC | Better Auth |
| BullMQ + Redis | Requires persistent Redis; not available serverlessly on Netlify | Inngest |
| Drizzle 1.0.0-rc.x (beta tag) | RC — breaking API changes from 0.45.x (`.enableRLS()` removed); not production-stable | Drizzle 0.45.x stable for M1; plan 1.0 upgrade post-GA |
| `pg_session_jwt` SET without JWK | Setting `request.jwt.claims` without JWK validation bypasses signature check — unsafe for PHI | JWK-validated mode via `PGOPTIONS` |
| Netlify Blobs for confirmed PHI | HIPAA BAA coverage for Blobs unconfirmed outside enterprise tier | Confirm enterprise BAA with Netlify, or use S3 |
| Neon Data API (REST) for RLS | Data API is designed for Neon's own auth ecosystem; using it with Better Auth requires custom JWK provisioning — the WebSocket driver + transaction-based `jwt_session_init` is more controllable | `@neondatabase/serverless` WebSocket driver (already in use) + `auth.jwt_session_init()` |

---

## Drizzle + Neon RLS Integration — Concrete Steps

This is the highest-risk integration in M1. The sequence:

1. **Upgrade Drizzle to 1.0 GA** (once released, targeting post-RC) — `pgTable.withRLS` syntax requires 1.0+; current 0.45.x uses the deprecated `.enableRLS()` method. Plan this as the first schema-phase task.
2. **Enable `pg_session_jwt` extension** on the Neon project (one-time SQL: `CREATE EXTENSION IF NOT EXISTS pg_session_jwt`).
3. **Add `tenantId` + `subjectId` columns** to all 8 existing tables in `schema.ts`; run `db:generate` + `db:migrate`.
4. **Apply `pgTable.withRLS`** to each table with a `crudPolicy` using `authenticatedRole` + `authUid(t.subjectId)` for subject-scoped tables and a tenant-level policy for org-scoped tables.
5. **Configure JWK validation:** export Better Auth's JWKS endpoint, set `PGOPTIONS` in Netlify env. Test with a direct SQL `SELECT auth.user_id()` in Drizzle Studio to confirm JWK round-trip.
6. **Wrap all data queries** in `withUserRLS(jwtToken, fn)` — the helper executes `SELECT auth.jwt_session_init(token)` inside a transaction, then runs `fn`. Every loader that reads from a scoped table must go through this wrapper.
7. **Owner bypass:** For owner-level queries (admin views across subjects), use a separate Neon role with `BYPASSRLS` privilege, connected via a separate `DATABASE_URL_ADMIN` env var. Never expose this role to user-facing requests.

**Spike required:** Test the JWK round-trip from Better Auth → `pg_session_jwt` → `auth.user_id()` in a local branch before building the full schema migration. This is the one piece with no worked example in the exact stack (Better Auth + Neon RLS without Neon Auth's hosted JWK service).

---

## Version Compatibility Matrix

| Package | Version | Peer / Compatible With |
|---------|---------|------------------------|
| `better-auth` | ^1.6 (1.6.14) | Drizzle 0.45.x, pg driver |
| `ai` | ^6 (6.0.83) | Zod 4.x required for `generateObject` |
| `@ai-sdk/anthropic` | ^3 (3.0.81) | `ai` v6 |
| `zod` | ^4 (4.4.3) | `ai` v6, TypeScript 5.x |
| `inngest` | ^4 (4.5.0) | Node 20, Remix, Netlify |
| `netlify-plugin-inngest` | latest | Inngest v4 |
| `@netlify/blobs` | latest | Netlify Functions, Node 20 |
| `vitest` | ^4 (4.1.8) | Vite ^6 || ^7 || ^8 |
| `drizzle-orm` | 0.45.x (stable) | `@neondatabase/serverless` 1.0.2 |
| `drizzle-orm` 1.0.0-rc.4 | beta tag | Breaking: `pgTable.withRLS` API; upgrade post-GA |

---

## Sources

- Context7 `/better-auth/better-auth` — Remix handler, Drizzle adapter, organization plugin, audit logs plugin, `createAccessControl` API
- Context7 `/drizzle-team/drizzle-orm-docs` — `pgTable.withRLS`, `pgPolicy`, `crudPolicy`, `authenticatedRole`, `authUid`, Neon RLS patterns
- Context7 `/inngest/inngest-js` — Remix adapter, Netlify plugin, step function patterns
- Context7 `/vercel/ai` — `generateObject`, Zod schema, `Output.object`
- Context7 `/websites/platform_claude_en_api` — current model IDs (`claude-sonnet-4-6`, `claude-haiku-4-5`, `claude-opus-4-7`), structured outputs API
- [Neon RLS + Drizzle guide](https://neon.com/docs/guides/rls-drizzle) — `pg_session_jwt`, `auth.user_id()`, JWK configuration
- [pg_session_jwt extension docs](https://neon.com/docs/extensions/pg_session_jwt) — `auth.jwt_session_init()` function, SET-based fallback
- [Better Auth comparison page](https://better-auth.com/docs/comparison) — vs Auth.js feature delta
- [Inngest Netlify docs](https://www.inngest.com/docs/deploy/netlify) — `netlify-plugin-inngest` setup
- npm: `better-auth@1.6.14`, `ai@6.0.83`, `@ai-sdk/anthropic@3.0.81`, `inngest@4.5.0`, `vitest@4.1.8`, `zod@4.4.3` — current as of 2026-06-07

---

*Stack research for: Zoetrop M1 — multi-tenant functional-health coaching platform*
*Researched: 2026-06-07*
