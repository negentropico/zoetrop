# Phase 5: Lab Ingest Pipeline - Pattern Map

**Mapped:** 2026-06-10
**Files analyzed:** 20 new/modified files
**Analogs found:** 17 / 20

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `remix-app/db/schema.ts` (4 tables + enum) | model | CRUD | `remix-app/db/schema.ts` existing tables | exact |
| `remix-app/app/lib/ingest/grounding.ts` | utility | transform | `remix-app/app/lib/metrics.ts` (`getMetricStatus`) | role-match |
| `remix-app/app/lib/ingest/range-check.ts` | utility | transform | `remix-app/app/lib/metrics.ts` (`getMetricStatus`) | role-match |
| `remix-app/app/lib/ingest/analyte-dictionary.ts` | utility | transform | `remix-app/app/lib/metrics.ts` (`METRIC_TARGETS`) | role-match |
| `remix-app/app/lib/ingest/extraction.server.ts` | service | request-response | `remix-app/app/lib/data.server.ts` (server module shape) | partial |
| `remix-app/app/lib/ingest/ingest.server.ts` | service | event-driven | `remix-app/app/lib/data.server.ts` | partial |
| `remix-app/app/lib/audit.server.ts` | service | CRUD | `remix-app/app/lib/data.server.ts` (write side) | role-match |
| `remix-app/app/lib/consent.server.ts` | service | CRUD | `remix-app/app/lib/data.server.ts` | role-match |
| `remix-app/app/routes/_app/ingest/layout.tsx` | middleware | request-response | `remix-app/app/routes/_app/import/layout.tsx` | exact |
| `remix-app/app/routes/_app/ingest/upload.tsx` | controller | request-response | `remix-app/app/routes/_app/import/whoop.tsx` | role-match |
| `remix-app/app/routes/_app/ingest/review.tsx` | controller | request-response | `remix-app/app/routes/_app/import/whoop.tsx` | role-match |
| `remix-app/app/routes/_app/ingest/consent.tsx` | controller | request-response | `remix-app/app/routes/_app/import/whoop.tsx` | role-match |
| `remix-app/app/routes.ts` (add ingest routes) | config | — | `remix-app/app/routes.ts` existing import block | exact |
| `remix-app/app/components/ui/PdfPageViewer.tsx` | component | — | `remix-app/app/components/ui/Dropzone.tsx` | partial |
| `remix-app/migrations/0007_*.sql` | migration | — | `remix-app/migrations/0006_cultured_patriot.sql` | exact |
| `remix-app/tests/lib/ingest/grounding.test.ts` | test | — | `remix-app/app/lib/metrics.test.ts` | exact |
| `remix-app/tests/lib/ingest/range-check.test.ts` | test | — | `remix-app/app/lib/metrics.test.ts` | exact |
| `remix-app/tests/lib/ingest/analyte-dictionary.test.ts` | test | — | `remix-app/app/lib/metrics.test.ts` | exact |
| `remix-app/tests/db/ingest-schema.test.ts` | test | — | `remix-app/tests/db/schema-columns.test.ts` | exact |
| `remix-app/tests/parity/ingest-review.test.ts` | test | — | `remix-app/tests/db/schema-columns.test.ts` | role-match |

---

## Pattern Assignments

### `remix-app/db/schema.ts` — add 4 tables + extend `dataSourceEnum`

**Analog:** `remix-app/db/schema.ts` existing tables (read directly above)

**Enum declaration pattern** (lines 37–44, existing `dataSourceEnum`):
```typescript
export const dataSourceEnum = pgEnum('data_source', [
  'manual',
  'whoop',
  'dexa',
  'bloodwork',
  'csv',
  'vault',
  'lab',  // ← ADD THIS VALUE
]);
```
Note: Drizzle generates `ALTER TYPE data_source ADD VALUE 'lab'` for this change.
Verify the generated migration SQL does NOT wrap the ALTER TYPE in `BEGIN/COMMIT`.

**New enum declarations** — follow the existing enum pattern above `metrics`:
```typescript
export const labDocStatusEnum = pgEnum('lab_doc_status', [
  'uploaded', 'processing', 'pending_review', 'completed', 'failed',
]);

export const labExtractionStatusEnum = pgEnum('lab_extraction_status', [
  'pending_review', 'approved', 'rejected',
]);

export const confidenceLevelEnum = pgEnum('confidence_level', ['high', 'low']);
```

**Table with `text` primary key + tenant/subject FK + composite index pattern** (lines 75–89, `invites` table):
```typescript
export const invites = pgTable('invites', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  // ... columns
}, (t) => [
  index('idx_invites_tenant').on(t.tenantId),
]);
```

**Table with `generatedAlwaysAsIdentity` integer PK + composite index pattern** (lines 113–127, `protocolVersions`):
```typescript
export const protocolVersions = pgTable('protocol_versions', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  // ... columns
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  subjectId: text('subject_id').notNull().references(() => subjects.id),
}, (t) => [
  uniqueIndex('protocol_versions_tenant_subject_version_unique').on(t.tenantId, t.subjectId, t.version),
  index('idx_protocol_versions_tenant_subject').on(t.tenantId, t.subjectId),
]);
```

**`metrics` table — the write target** (lines 92–111): note every column the approved extraction must supply:
- `id: varchar('id', { length: 36 }).primaryKey()` — supply a `crypto.randomUUID()`
- `name`, `value`, `unit`, `category` (enum), `subcategory`, `timestamp`, `improvement`, `referenceMin/Max`, `optimalMin/Max`, `source` (set to `'lab'`), `tenantId`, `subjectId`

**New `labDocuments` table** — use `text` PK (not integer identity) + `labDocStatusEnum` + `uploadedBy` FK to `user.id`:
- Follow `invites` shape for text PK + `references(() => user.id)` for `uploadedBy`
- The `pdfBytes: text('pdf_bytes')` column is nullable (set to null after extraction completes per RESEARCH pitfall 5)
- Two indexes: `(tenantId, subjectId)` and `(status)` — see RESEARCH.md lines 596–598

**New `auditLog` table** — integer identity PK, no tenant-scoped unique index, timestamp index:
- `role: appRoleEnum('role').notNull()` — reuse existing `appRoleEnum`
- `action: varchar('action', { length: 50 }).notNull()` — one of `'upload' | 'extraction-complete' | 'approve' | 'reject' | 'metric-insert'`
- NO PHI columns — only IDs and metadata (D-13 constraint)

---

### `remix-app/app/lib/ingest/grounding.ts` (utility, transform)

**Analog:** `remix-app/app/lib/metrics.ts` lines 72–82 (`getMetricStatus`)

**Pure function module pattern** — no imports except types, no I/O, exported function + exported type:
```typescript
// metrics.ts lines 72-82 — the pure function structure to mirror
export function getMetricStatus(metric: Metric): MetricStatus {
  const { value, optimalRange, referenceRange } = metric;
  if (optimalRange && value >= optimalRange.min && value <= optimalRange.max) return "optimal";
  if (referenceRange) {
    if (value < referenceRange.min) return "deficient";
    if (value > referenceRange.max) return "excess";
    return "borderline";
  }
  return "optimal";
}
```

**Apply to `grounding.ts`:** same structure — export the result union type, export a single pure function. See RESEARCH.md lines 469–484 for the exact implementation.

---

### `remix-app/app/lib/ingest/range-check.ts` (utility, transform)

**Analog:** `remix-app/app/lib/metrics.ts` lines 72–82

Same pure function pattern. See RESEARCH.md lines 489–504 for the exact implementation.

---

### `remix-app/app/lib/ingest/analyte-dictionary.ts` (utility, transform)

**Analog:** `remix-app/app/lib/metrics.ts` lines 23–53 (`METRIC_TARGETS` constant export + lookup function)

**Exported constant + lookup function pattern** (lines 23–53):
```typescript
export const METRIC_TARGETS: MetricTarget[] = [
  { metricName: "Body Fat", q1Target: 21.5, ... },
  // ...
];

export function getMetricTargets(metricName: string): MetricTarget | undefined {
  return METRIC_TARGETS.find((t) => t.metricName === metricName);
}
```

**Apply to `analyte-dictionary.ts`:** mirror this — export `ANALYTE_DICTIONARY: Record<string, AnalyteEntry>` constant and `lookupAnalyte(rawName: string): AnalyteEntry | null` function. No imports beyond types. See RESEARCH.md lines 509–553 for the full implementation shape.

**Critical:** The file must NOT be imported from any client-side route component. It stays server-only (no `"use client"` pragma anywhere near it; mark with a comment like `// Server-only: do not import from client components`).

---

### `remix-app/app/lib/ingest/extraction.server.ts` (service, request-response)

**Analog:** `remix-app/app/lib/data.server.ts` — server-only module shape (lines 1–14)

**Server module header pattern** (lines 1–14):
```typescript
/**
 * data.server.ts — Centralized tenant-scoped read module (DATA-01)
 * ...
 */

import { getDb } from "./db.server";
import { eq, and } from "drizzle-orm";
import { ... } from "../../db/schema";
```

**Apply to `extraction.server.ts`:**
- File ends in `.server.ts` — enforced by the project's ESLint server-import gate
- Module docblock explaining purpose + out-of-scope note (mirror the Phase 7 retrofit note format)
- Import `Anthropic` from `@anthropic-ai/sdk`
- Export single async function `extractLabValues(pdfBase64: string): Promise<ExtractionResult[]>`
- Uses `tool_choice: { type: 'any' }` to force tool use — see RESEARCH.md lines 369–445

**No analog for LLM calls exists in the codebase.** Use RESEARCH.md Pattern 1 (lines 369–445) as the implementation reference.

---

### `remix-app/app/lib/ingest/ingest.server.ts` (service, event-driven)

**Analog:** `remix-app/app/lib/data.server.ts` — server module shape + write pattern

**Tenant-scoped write pattern from `data.server.ts`** (lines 37–48, `getOwnerSubject` — the closest write-side reference):
```typescript
export async function getOwnerSubject(tenantId: string) {
  const db = getDb();
  const [subject] = await db
    .select()
    .from(subjects)
    .where(eq(subjects.tenantId, tenantId))
    .limit(1);
  if (!subject) {
    throw new Response("Subject not found", { status: 404 });
  }
  return subject;
}
```

**Apply to `ingest.server.ts`:**
- Export `extractionWorker(labDocumentId: string): Promise<void>` — the background job
- Inside: `getDb()`, then UPDATE → extractText (unpdf) → Claude API → per-extraction validate+insert → UPDATE final status
- Use `const db = getDb()` as the single DB reference per function (DATA-01 isolation)
- On error: catch, `UPDATE labDocuments SET status='failed', errorMessage=err.message`, re-throw or swallow (so waitUntil doesn't explode silently)

---

### `remix-app/app/lib/audit.server.ts` (service, CRUD)

**Analog:** `remix-app/app/lib/data.server.ts` — single-function write module pattern

**Write function pattern** — mirror the `getOwnerSubject` shape but as an insert:
```typescript
export async function insertAuditLog(entry: AuditLogEntry): Promise<void> {
  const db = getDb();
  await db.insert(auditLog).values({ ...entry, timestamp: new Date() });
}
```
No PHI values in `entry` — only IDs and metadata (D-13).

---

### `remix-app/app/lib/consent.server.ts` (service, CRUD)

**Analog:** `remix-app/app/lib/data.server.ts` lines 37–48

Same pattern: `getDb()`, `select` with `eq(consentLog.subjectId, subjectId)`, `.limit(1)`, return `!!row`. See RESEARCH.md lines 862–887 for the exact implementation.

---

### `remix-app/app/routes/_app/ingest/layout.tsx` (layout)

**Analog:** `remix-app/app/routes/_app/import/layout.tsx` — exact copy-modify

**Complete layout pattern** (lines 1–51):
```typescript
import { NavLink, Outlet } from "react-router";

const TABS = [
  { to: "/import", label: "Overview", end: true },
  { to: "/import/whoop", label: "WHOOP", end: false },
  { to: "/import/vault", label: "Vault", end: false },
];

export default function ImportLayout() {
  return (
    <div>
      <nav
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid var(--border)",
          marginBottom: "var(--gap-2xl)",
          overflowX: "auto",
        }}
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            style={({ isActive }) => ({
              display: "inline-block",
              padding: "12px 16px",
              fontFamily: "var(--font-text)",
              fontWeight: isActive ? 600 : 500,
              fontSize: "var(--text-base)",
              color: isActive ? "var(--ink)" : "var(--text-muted)",
              whiteSpace: "nowrap",
              borderBottom: `2px solid ${isActive ? "var(--ink)" : "transparent"}`,
              marginBottom: -1,
              textDecoration: "none",
              transition: "color var(--dur-fast) var(--ease-out)",
            })}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
```

**For ingest layout:** Change `TABS` to `[{ to: "/ingest", label: "Upload", end: true }, { to: "/ingest/review", label: "Review", end: false }]`. Function name → `IngestLayout`.

---

### `remix-app/app/routes/_app/ingest/upload.tsx` (controller, request-response)

**Analog:** `remix-app/app/routes/_app/import/whoop.tsx`

**Route auth + FormData action pattern** (lines 18–65):
```typescript
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return { error: "No file provided", success: false };
  }

  try {
    // ... process
    return { success: true, ... };
  } catch (error) {
    return {
      error: `Failed ...: ${error instanceof Error ? error.message : "Unknown error"}`,
      success: false,
    };
  }
}
```

**Dropzone usage pattern** (lines 325–330):
```typescript
<Dropzone
  accept=".json,application/json"
  onFile={handleFile}
  label="Drag and drop your WHOOP JSON here"
/>
```

**Apply to `upload.tsx`:**
- Add `requireUser` + `requireRole` + `assertSubjectAccess` calls at the top of `action` (not present in whoop.tsx because it was parse-only — ingest persists data, so auth is mandatory)
- Change `Dropzone` accept to `".pdf,application/pdf"`
- The action must insert a `labDocuments` row, call `waitUntil(extractionWorker(docId))`, and return `redirect(\`/ingest/review?docId=${docId}\`)` — NOT return JSON like whoop.tsx
- Add `export const config = { maxDuration: 120 };` at module level (RESEARCH.md line 812)
- Import `waitUntil` from `'@vercel/functions'`

**_app/layout.tsx auth pattern** (lines 11–28) — the outer auth gate that wraps all ingest routes:
```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    const url = new URL(request.url);
    throw redirect(`/login?redirect=${encodeURIComponent(url.pathname)}`);
  }
  // ...
}
```

---

### `remix-app/app/routes/_app/ingest/review.tsx` (controller, request-response)

**Analog:** `remix-app/app/routes/_app/import/whoop.tsx` for route structure;
`remix-app/app/lib/data.server.ts` for the loader's DB pattern.

**Loader DB query pattern** — mirror `data.server.ts` select pattern:
```typescript
// data.server.ts lines 56-73
export async function getMetrics(tenantId: string, subjectId: string, category?: MetricCategory) {
  const db = getDb();
  const conditions = [
    eq(metrics.tenantId, tenantId),
    eq(metrics.subjectId, subjectId),
  ] as const;
  // ...
  return db.select().from(metrics).where(and(...conditions));
}
```

**Apply to `review.tsx` loader:**
```typescript
export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const url = new URL(request.url);
  const docId = url.searchParams.get('docId');
  const db = getDb();
  const [doc] = await db.select().from(labDocuments).where(eq(labDocuments.id, docId!));
  if (!doc) throw new Response('Not found', { status: 404 });
  assertSubjectAccess(user, { tenantId: doc.tenantId }, user.tenantId!);
  const extractions = await db.select().from(labExtractions)
    .where(eq(labExtractions.labDocumentId, docId!));
  return { doc, extractions };
}
```

**Approve action** — uses `assertSubjectAccess` + Drizzle transaction + `insertAuditLog` (D-15 pattern from RESEARCH.md lines 676–698).

---

### `remix-app/app/routes/_app/ingest/consent.tsx` (controller, request-response)

**Analog:** `remix-app/app/routes/_app/import/whoop.tsx` for route skeleton.

**Apply to `consent.tsx`:**
- Loader: call `requireUser`, check `checkConsent(subjectId)`, if already consented → redirect to upload
- Action: call `requireUser` + `assertSubjectAccess`, call `insertConsent(subjectId, userId, 'v1-pilot-self')`, redirect to upload
- UI: simple form with consent text + submit button; use `Card` + `Button` components matching whoop.tsx style

---

### `remix-app/app/routes.ts` (add ingest routes)

**Analog:** `remix-app/app/routes.ts` existing import block (lines 35–39)

**Import section to mirror** (lines 35–39):
```typescript
// Import
layout("routes/_app/import/layout.tsx", [
  route("import", "routes/_app/import/index.tsx"),
  route("import/whoop", "routes/_app/import/whoop.tsx"),
  route("import/vault", "routes/_app/import/vault.tsx"),
]),
```

**Add immediately after, inside the `layout("routes/_app/layout.tsx", [...])` array:**
```typescript
// Ingest
layout("routes/_app/ingest/layout.tsx", [
  route("ingest/upload", "routes/_app/ingest/upload.tsx"),
  route("ingest/review", "routes/_app/ingest/review.tsx"),
  route("ingest/consent", "routes/_app/ingest/consent.tsx"),
]),
```

---

### `remix-app/app/components/ui/PdfPageViewer.tsx` (component)

**Analog:** `remix-app/app/components/ui/Dropzone.tsx`

**Client component pattern** (lines 1–9 of Dropzone.tsx):
```typescript
// Dropzone — client-only ...
"use client";

import { useRef, useState } from "react";
import { Upload, FileJson } from "lucide-react";

export interface DropzoneProps {
  accept?: string;
  onFile: (file: File) => void;
  label?: string;
}

export function Dropzone({ ... }: DropzoneProps) {
```

**Apply to `PdfPageViewer.tsx`:**
- Add `"use client"` pragma — this is browser-only (react-pdf renders to canvas)
- Export interface `PdfPageViewerProps { pdfBytes: Uint8Array; pageNumber: number; highlightSnippet?: string; }`
- Export function `PdfPageViewer({ ... }: PdfPageViewerProps)`
- Worker config goes at module level (one-time setup): see RESEARCH.md lines 233–248
- No I/O, no DB — pure rendering component

**No exact analog for react-pdf usage.** Use RESEARCH.md lines 225–251 for the `<Document>/<Page>` implementation.

---

### `remix-app/migrations/0007_*.sql` (migration)

**Analog:** `remix-app/migrations/0006_cultured_patriot.sql` (generated by Drizzle)

**Migration structure pattern** (0006, lines 1–20):
```sql
CREATE TABLE "subject_genotypes" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (...),
    "tenant_id" text NOT NULL,
    "subject_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subject_genotypes" ADD CONSTRAINT "subject_genotypes_tenant_id_tenants_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_subject_genotypes_tenant_subject" ON "subject_genotypes" USING btree ("tenant_id","subject_id");
```

**Generation command:** `npm run db:generate` from `remix-app/` — do NOT hand-write the migration SQL; let Drizzle generate it from the updated schema.ts.

**Critical check:** After generation, open the `.sql` file and verify the `ALTER TYPE data_source ADD VALUE 'lab'` statement is NOT wrapped inside `BEGIN;`/`COMMIT;`. If it is, split into two migration files: one for the enum addition (no transaction wrapper), one for the table creations (transaction wrapper is fine).

**Migration apply command:** `npm run db:migrate`

---

### `remix-app/tests/lib/ingest/grounding.test.ts` (test)

**Analog:** `remix-app/app/lib/metrics.test.ts`

**Pure function test pattern** (lines 1–69):
```typescript
import { describe, it, expect } from "vitest";
import { getMetricStatus } from "~/lib/metrics";

// Fixture factory
function makeMetric(value: number, ...): Metric {
  return { ... } as unknown as Metric;
}

describe("getMetricStatus", () => {
  it("value at optimal min → optimal", () => {
    expect(getMetricStatus(makeMetric(70, REF, OPT))).toBe("optimal");
  });
  // boundary cases...
});
```

**Apply to `grounding.test.ts`:**
- Import `{ checkGrounding } from '~/lib/ingest/grounding'`
- No fixture factory needed — function takes plain strings
- Test cases: snippet present in page text → `'grounded'`; snippet absent → `'low_confidence'`; whitespace-normalized match → `'grounded'`; wrong page number → `'low_confidence'`

---

### `remix-app/tests/lib/ingest/range-check.test.ts` (test)

**Analog:** `remix-app/app/lib/metrics.test.ts`

Same pattern as grounding test. Import `{ checkRange }`, test all 5 `RangeFlag` values including null bounds and exact boundary values (at-min, below-min, at-max, above-max, both-null).

---

### `remix-app/tests/lib/ingest/analyte-dictionary.test.ts` (test)

**Analog:** `remix-app/app/lib/metrics.test.ts`

Same pattern. Import `{ lookupAnalyte, ANALYTE_DICTIONARY }`. Test: known key returns correct `AnalyteEntry`; unknown key returns `null`; key normalization (uppercase input, extra spaces) returns correct entry.

---

### `remix-app/tests/db/ingest-schema.test.ts` (test, skip-guarded)

**Analog:** `remix-app/tests/db/schema-columns.test.ts`

**Skip-guard pattern** (lines 18–21):
```typescript
const connectionString = process.env["DB_URL_STUBBED"]
  ? undefined
  : process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"];
```

**describe.skipIf pattern** (line 64):
```typescript
describe.skipIf(!connectionString)("...", () => { ... });
```

**Pool lifecycle pattern** (lines 41–52):
```typescript
let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) pool = new Pool({ connectionString });
  return pool;
}
afterAll(async () => { if (pool) await pool.end(); });
```

**Column assertion pattern** (lines 110–130):
```typescript
it(`${table} has non-null tenant_id and subject_id`, async () => {
  const { rows } = await getPool().query<ColumnRow>(
    `SELECT column_name, is_nullable
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = ANY($2)`,
    [table, ["tenant_id", "subject_id"]]
  );
  // ...
  expect(byName.get("tenant_id")).toBe("NO");
  expect(byName.get("subject_id")).toBe("NO");
});
```

**Apply to `ingest-schema.test.ts`:**
- Cover all 4 new tables: `lab_documents`, `lab_extractions`, `audit_log`, `consent_log`
- Assert: `tenant_id`/`subject_id` NOT NULL on `lab_documents`, `lab_extractions`, `audit_log` (note: `consent_log` uses only `subject_id`)
- Assert: composite index exists on `(tenant_id, subject_id)` for `lab_documents` and `lab_extractions`
- Assert: `data_source` enum includes `'lab'` value
- Assert: `audit_log` has NO column named `value` or `name` (PHI-free enforcement, LAB-05)

---

### `remix-app/tests/parity/ingest-review.test.ts` (test, skip-guarded)

**Analog:** `remix-app/tests/db/schema-columns.test.ts` skip-guard + Pool pattern

Same skip-guard and Pool lifecycle. Tests that the review loader query (SELECT from `lab_extractions WHERE lab_document_id = ? AND tenant_id = ?`) returns only rows scoped to the correct tenant, not rows from another tenant.

---

## Shared Patterns

### Authentication + Authorization (apply to all ingest route actions and loaders)

**Source:** `remix-app/app/lib/authz.server.ts`

**requireUser** (lines 28–35):
```typescript
export async function requireUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    const url = new URL(request.url);
    throw redirect(`/login?redirect=${encodeURIComponent(url.pathname)}`);
  }
  return { user: session.user, session };
}
```

**requireRole** (lines 43–52):
```typescript
export function requireRole(
  user: { role?: string | null },
  allowed: AppRole[]
): void {
  if (!user.role || !allowed.includes(user.role as AppRole)) {
    throw new Response("You don't have permission to view this.", { status: 403 });
  }
}
```

**assertSubjectAccess** (lines 61–76) — MANDATORY on every write path (D-15):
```typescript
export function assertSubjectAccess(
  user: { role?: string | null },
  subject: { tenantId: string },
  userTenantId: string
): void {
  if (user.role === "client") {
    throw new Response("You don't have permission to view this.", { status: 403 });
  }
  if (subject.tenantId !== userTenantId) {
    throw new Response("You don't have permission to view this.", { status: 403 });
  }
}
```

**Sequence for every ingest action:** `requireUser` → `requireRole(['owner','practitioner'])` → load subject → `assertSubjectAccess` → proceed with writes.

---

### Tenant-Scoped DB Read (apply to all ingest loaders)

**Source:** `remix-app/app/lib/data.server.ts`

**getDb isolation rule** (line 13, comment on lines 1–11): `getDb()` is called only inside server modules, never in route loaders directly. All DB access goes through a lib function. This is the Phase 7 retrofit boundary.

**and() + eq() WHERE pattern** (lines 62–72):
```typescript
const conditions = [
  eq(metrics.tenantId, tenantId),
  eq(metrics.subjectId, subjectId),
] as const;
return db.select().from(metrics).where(and(...conditions));
```

**getOwnerSubject** (lines 37–48): call this to resolve the `subjectId` when only `tenantId` is known (all ingest routes start from `user.tenantId`).

---

### Error Handling (apply to all server modules and route actions)

**Source:** `remix-app/app/lib/authz.server.ts` + `remix-app/app/lib/data.server.ts`

**Not-found pattern** (data.server.ts lines 43–45):
```typescript
if (!subject) {
  throw new Response("Subject not found", { status: 404 });
}
```

**Auth failure pattern** (authz.server.ts lines 48–51):
```typescript
throw new Response("You don't have permission to view this.", { status: 403 });
```

**Extraction error pattern** (ingest-specific — no existing analog): catch errors in `extractionWorker`, update `labDocuments.status = 'failed'` and `errorMessage = err.message`, then swallow so `waitUntil` does not leave the function in an unclean state.

---

### Route Registration (apply when adding to routes.ts)

**Source:** `remix-app/app/routes.ts`

**Nested layout inside `_app/layout.tsx`** (lines 11–43):
```typescript
layout("routes/_app/layout.tsx", [
  // ...existing sections...
  layout("routes/_app/import/layout.tsx", [
    route("import", "routes/_app/import/index.tsx"),
    route("import/whoop", "routes/_app/import/whoop.tsx"),
    route("import/vault", "routes/_app/import/vault.tsx"),
  ]),
]),
```

New ingest block mirrors this pattern exactly — nested inside the outer `_app/layout.tsx` layout, not at the top level.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `app/lib/ingest/extraction.server.ts` (LLM call) | service | request-response | No prior LLM/Anthropic API calls exist in the codebase. Use RESEARCH.md Pattern 1 (lines 369–445) as primary reference. |
| `app/components/ui/PdfPageViewer.tsx` (react-pdf) | component | — | No prior PDF rendering component. Use RESEARCH.md lines 225–251 for `<Document>/<Page>` with worker setup. |
| `scripts/seed-analyte-dictionary.ts` | utility | batch | No prior seed scripts in `scripts/`. Model after the data structure in RESEARCH.md lines 509–553; it is a one-shot Node script that reads from live Neon and emits a `.ts` file. |

---

## Metadata

**Analog search scope:** `remix-app/app/`, `remix-app/db/`, `remix-app/tests/`, `remix-app/migrations/`
**Files scanned:** 12 source files read, 7 migration files checked
**Pattern extraction date:** 2026-06-10
