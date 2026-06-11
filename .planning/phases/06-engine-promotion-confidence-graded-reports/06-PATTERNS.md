# Phase 6: Engine Promotion + Confidence-Graded Reports — Pattern Map

**Mapped:** 2026-06-11
**Files analyzed:** 18 new or modified files
**Analogs found:** 17 / 18

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `app/lib/engine.ts` | pure-logic module | transform | `app/lib/correlations.ts` + `app/lib/metrics.ts` | exact (pure-function extraction) |
| `db/schema.ts` (extended) | Drizzle schema | CRUD | existing tables in `db/schema.ts` (lines 18–262) | exact |
| `app/types/report.ts` | TypeScript types | transform | `app/types/genetics.ts` | role-match |
| `app/types/genetics.ts` (modified) | TypeScript types | transform | self — relabel CONFIDENCE_LEVELS | self-modification |
| `app/lib/corpus.server.ts` | server data module | CRUD (read-only) | `app/lib/data.server.ts` | exact (tenant-scoped read pattern) |
| `app/lib/report-generator.server.ts` | server data module | CRUD + transform | `app/lib/ingest/ingest.server.ts` | role-match (write + assemble) |
| `app/lib/data.server.ts` (extended) | server data module | CRUD | self — add `getVariantMaps`/`getMetricRules` | self-extension |
| `app/lib/metrics.ts` (modified) | utility (re-export) | transform | self — re-export from engine | self-modification |
| `app/lib/cessation.ts` / `protocol-data.ts` (modified) | utility (re-export) | transform | self — re-export from engine | self-modification |
| `app/lib/correlations.ts` (modified) | utility (re-export) | transform | self — re-export from engine | self-modification |
| `scripts/seed-corpus.ts` | seed script | batch (DB write) | `scripts/seed-analyte-dictionary.ts` | exact |
| `app/routes/_app/reports/index.tsx` | route (loader) | request-response | `app/routes/_app/ingest/index.tsx` | role-match (section landing) |
| `app/routes/_app/reports/generate.tsx` | route (action) | request-response | `app/routes/_app/ingest/upload.tsx` | exact (auth sequence + form action) |
| `app/routes/_app/reports/detail.tsx` | route (loader + component) | request-response | `app/routes/_app/ingest/document.tsx` + `app/routes/_app/insights/genetics.tsx` | role-match |
| `app/components/ui/KGradeBadge.tsx` | UI component | — | `app/components/ui/StatusBadge.tsx` | role-match (status-chip style) |
| `app/components/ui/RecommendationBlock.tsx` | UI component | — | `app/components/ui/Card.tsx` + `app/components/ui/Badge.tsx` | role-match |
| `app/components/ui/DisclaimerCallout.tsx` | UI component | — | `app/components/ui/Badge.tsx` (CSS-var color pattern) | partial |
| `tests/lib/engine.test.ts` | test | unit | `app/lib/metrics.test.ts` | exact |
| `tests/lib/corpus-lint.test.ts` | test | unit | `app/lib/metrics.test.ts` | role-match |
| `tests/db/corpus-schema.test.ts` | test | DB introspection | `tests/db/schema-columns.test.ts` + `tests/db/ingest-schema.test.ts` | exact |

---

## Pattern Assignments

---

### `app/lib/engine.ts` (pure-logic module, transform)

**Analogs:** `app/lib/correlations.ts` (zero imports, pure functions); `app/lib/metrics.ts` (source of `classifyMetricStatus`); `app/lib/protocol-data.ts` (source of `getCessationDay`/`getCessationPhase`)

**Imports pattern** — copy from `app/lib/correlations.ts` lines 1–9 and `app/lib/protocol-data.ts` lines 1–14:
```typescript
// Zero Drizzle or Remix imports. date-fns is acceptable (pure computation library, D-01).
// Do NOT add .server.ts suffix — engine.ts is genuinely portable (no browser-incompatible code).
import { differenceInDays, parseISO } from "date-fns";
import type { Metric, MetricStatus } from "~/types/metrics";
import { CESSATION_PHASES } from "~/types/protocol";
import type { SubjectGenotype, VariantMap, GradedRecommendation } from "~/types/report";
```

**Core pattern — extract verbatim from sources, rename:**

`classifyMetricStatus` — copy body from `app/lib/metrics.ts` lines 72–81 (rename from `getMetricStatus`):
```typescript
export function classifyMetricStatus(metric: Metric): MetricStatus {
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

`getCessationDay` / `getCessationPhase` — copy body from `app/lib/protocol-data.ts` lines 35–51 (rename `getCurrentCessationPhase` → `getCessationPhase`):
```typescript
export function getCessationDay(startDateIso: string, now: Date = new Date()): number {
  return differenceInDays(now, parseISO(startDateIso));
}
export function getCessationPhase(day: number): typeof CESSATION_PHASES[0] {
  const phase = CESSATION_PHASES.find(p => day >= p.dayRange.start && day <= p.dayRange.end);
  if (phase) return phase;
  return day < CESSATION_PHASES[0].dayRange.start
    ? CESSATION_PHASES[0]
    : CESSATION_PHASES[CESSATION_PHASES.length - 1];
}
```

`computePearson` — copy body from `app/lib/correlations.ts` lines 15–32 (rename from `calculatePearsonCorrelation`):
```typescript
export function computePearson(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  // ... (identical body)
}
```

**New function — `mapVariantToProtocol`:** no existing analog; use the pseudocode in RESEARCH.md §Engine module structure. Key convention: normalize genotypes with `parts.sort().join('/')` before matching (Pitfall 7). Return type is `GradedRecommendation[]` from `~/types/report`.

**Re-export pattern for backward compat** — copy from `app/lib/correlations.ts` file structure (single-module, no default export; named exports only). After extracting to engine.ts, the source files add:
```typescript
// app/lib/metrics.ts (after engine extraction)
export { classifyMetricStatus as getMetricStatus } from "./engine";
```

---

### `db/schema.ts` (extended — 4 new tables + 1 new enum)

**Analog:** `db/schema.ts` itself (lines 18–262). Copy the exact Drizzle table definition style.

**Enum pattern** — copy from `db/schema.ts` lines 18–89 (pgEnum declaration style):
```typescript
// Copy the style of existing enums at lines 18-89.
// CRITICAL: name it evidenceTierEnum / Postgres type 'evidence_tier'
// to AVOID collision with confidenceLevelEnum ('high'|'low') at line 62.
// Add comment: // evidence_tier ('k1'|'k2'|'k3'|'k4') — DISTINCT from confidence_level ('high'|'low')
export const evidenceTierEnum = pgEnum('evidence_tier', ['k1', 'k2', 'k3', 'k4']);
```

**Non-PHI corpus table pattern** — copy from `db/schema.ts` lines 249–262 (`subjectGenotypes` style but WITHOUT `tenantId`/`subjectId` FKs, since corpus tables are non-PHI population knowledge):
```typescript
// Copy: integer PK with generatedAlwaysAsIdentity(), varchar/text columns,
// timestamp('created_at').defaultNow(), index() call in the table options array.
// DO NOT add tenantId/subjectId — these are non-PHI corpus tables.
export const geneticVariants = pgTable('genetic_variants', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  // ... varchar/text/timestamp columns ...
}, (t) => [
  index('idx_genetic_variants_gene').on(t.gene),
]);
```

**PHI-adjacent table with tenant scope** — copy from `db/schema.ts` lines 113–131 (`metrics` table style — tenantId/subjectId not-null with .references()):
```typescript
// reports table follows the metrics/labDocuments pattern:
// text('id').primaryKey() (UUID, set by caller with crypto.randomUUID())
// tenantId/subjectId NOT NULL with .references()
// jsonb('snapshot').notNull() — follows biometricSnapshot jsonb at line 172
export const reports = pgTable('reports', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  subjectId: text('subject_id').notNull().references(() => subjects.id),
  generatedBy: text('generated_by').notNull().references(() => user.id),
  // ...
  snapshot: jsonb('snapshot').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => [
  index('idx_reports_tenant_subject').on(t.tenantId, t.subjectId),
]);
```

**Migration discipline:** After adding schema — `cd remix-app && npm run db:generate`. Review generated SQL: if it contains `ALTER TYPE evidence_tier ADD VALUE`, that statement MUST be moved outside a `BEGIN/COMMIT` block (Pitfall 2 from RESEARCH.md; same as Phase 5 `0007_silly_sabretooth.sql`). Then `npm run db:migrate`.

---

### `app/types/report.ts` (TypeScript types, transform)

**Analog:** `app/types/genetics.ts` (interface + record type pattern, no runtime code)

**Pattern** — copy the file structure from `app/types/genetics.ts` (lines 1–116):
```typescript
// No imports from Drizzle. Types only — no runtime values exported here
// except constants needed by the engine and report generator.
// Interface naming: PascalCase. Union types: lowercase string literals.
export interface GradedRecommendation { ... }
export interface ReportSnapshot { ... }
export type EvidenceTier = 'k1' | 'k2' | 'k3' | 'k4';
```

**Concrete shape** — copy the complete typed snapshot shape from RESEARCH.md §Snapshot JSON shape (lines 552–601). `schemaVersion: 1` (discriminated union for future migrations). `GradedRecommendation.sourceContext` carries the `detectionConfidence` secondary annotation (D-09).

---

### `app/types/genetics.ts` (modified — relabel CONFIDENCE_LEVELS)

**Change:** Update `CONFIDENCE_LEVELS` record at lines 35–64. Keys (`'K1'|'K2'|'K3'|'K4'`) stay unchanged. Modify `label`, `description`, `source`, `color` fields:

| Level | New label | New description |
|-------|-----------|-----------------|
| K1 | `'Established'` | `'Multiple RCTs or systematic reviews support this finding-to-action link'` |
| K2 | `'Probable'` | `'Observational studies or consistent mechanistic evidence'` |
| K3 | `'Emerging'` | `'Preliminary studies; consistent with mechanism but limited human data'` |
| K4 | `'Speculative'` | `'Expert opinion, case reports, or theoretical mechanistic reasoning only'` |

Remove `source` field (detection-oriented) and `color` field (KGradeBadge uses CSS vars, not Tailwind class strings per UI-SPEC Pattern 1). The `ConfidenceLevel` type at line 3 is unchanged.

---

### `app/lib/corpus.server.ts` (server data module, CRUD read-only)

**Analog:** `app/lib/data.server.ts` (the full file, lines 1–181) — exact same tenant-scoped read module pattern.

**Imports pattern** — copy from `app/lib/data.server.ts` lines 1–26:
```typescript
import { getDb } from "./db.server";
import { eq, and } from "drizzle-orm";
import {
  geneticVariants,
  variantProtocolMap,
  metricProtocolMap,
} from "../../db/schema";
```

**Read function pattern** — copy from `app/lib/data.server.ts` lines 56–73 (`getMetrics` shape; adapt for non-PHI corpus tables — no tenantId/subjectId scope since corpus tables are population-level):
```typescript
export async function getVariantMaps() {
  const db = getDb();
  return db
    .select()
    .from(variantProtocolMap)
    .innerJoin(geneticVariants, eq(variantProtocolMap.variantId, geneticVariants.id));
}

export async function getMetricRules() {
  const db = getDb();
  return db.select().from(metricProtocolMap);
}
```

**Corpus version constant** — single string constant at top of file:
```typescript
export const CORPUS_VERSION = "v1.0-owner-2026-06" as const;
```

---

### `app/lib/report-generator.server.ts` (server data module, CRUD + transform)

**Analog:** `app/lib/ingest/ingest.server.ts` (assemble + DB write pattern) and the `generateReport` pseudocode in RESEARCH.md §Report Generation (lines 472–548).

**UUID pattern** — copy from `app/routes/_app/ingest/upload.tsx` line 122 (confirmed project pattern):
```typescript
const reportId = crypto.randomUUID();
```

**Write pattern** — copy Drizzle insert style from any route action (e.g., `upload.tsx` lines 100–130):
```typescript
await db.insert(reports).values({
  id: reportId,
  tenantId,
  subjectId,
  generatedBy,
  corpusVersion: CORPUS_VERSION,
  snapshot,
  createdAt: new Date(),
});
return reportId;
```

**Function signature:** `export async function generateReport(tenantId: string, subjectId: string, generatedBy: string): Promise<string>` — returns the new report UUID for redirect.

---

### `app/lib/data.server.ts` (extended)

**Pattern:** Extend the existing file by appending two functions at the bottom, following the same pattern as `getSubjectGenotypes` at lines 169–181:
```typescript
// ── Reports ───────────────────────────────────────────────────────────────────

/** Returns all reports rows scoped by tenant + subject, ordered by createdAt desc. */
export async function getReports(tenantId: string, subjectId: string) {
  const db = getDb();
  return db
    .select()
    .from(reports)
    .where(and(eq(reports.tenantId, tenantId), eq(reports.subjectId, subjectId)));
}

/** Returns a single report row by id, scoped by tenant for authz check. */
export async function getReport(id: string) {
  const db = getDb();
  const [row] = await db.select().from(reports).where(eq(reports.id, id));
  return row ?? null;
}
```

Also add `reports` to the import block at lines 15–24.

---

### `scripts/seed-corpus.ts` (seed script, batch)

**Analog:** `scripts/seed-analyte-dictionary.ts` (full file, lines 1–80+) — exact same pattern (env var validation, DB connect, idempotent upsert, console.log progress).

**Imports pattern** — copy from `scripts/seed-analyte-dictionary.ts` lines 1–39:
```typescript
import { getDb } from "../app/lib/db.server";
import { geneticVariants, variantProtocolMap, metricProtocolMap } from "../db/schema";
import { sql } from "drizzle-orm";

const DB_URL = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!DB_URL) {
  throw new Error("DATABASE_URL or DATABASE_URL_UNPOOLED env var is required.");
}
```

**Key difference from seed-analyte-dictionary:** The corpus seed must also export its seed data array so the lint test can import it:
```typescript
// Export the seed data for corpus-lint.test.ts import (RESEARCH.md §Guardrail Lint)
export const corpusSeedData = {
  variantRules: [...],   // variantProtocolMap entries
  metricRules: [...],    // metricProtocolMap entries
};
```

**Idempotency:** Use `ON CONFLICT DO NOTHING` or check-before-insert to make the script re-runnable. Follow the `seed-analyte-dictionary.ts` pattern of logging `[seed-corpus] Inserted N variant rules, M metric rules`.

---

### `app/routes/_app/reports/index.tsx` (route, request-response)

**Analog:** `app/routes/_app/ingest/index.tsx` (redirect landing for a section)

**Pattern** — copy from `app/routes/_app/ingest/index.tsx` lines 1–27. This route can either redirect to `/reports/generate` (if no reports exist) or render a report list. For the list case, use the `app/routes/_app/insights/index.tsx` loader pattern.

```typescript
// loader with requireUser + getOwnerSubject + assertSubjectAccess
export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const subject = await getOwnerSubject(user.tenantId!);
  assertSubjectAccess(user, subject, user.tenantId!);
  const reportsData = await getReports(user.tenantId!, subject.id);
  return { reports: reportsData };
}
```

---

### `app/routes/_app/reports/generate.tsx` (route action, request-response)

**Analog:** `app/routes/_app/ingest/upload.tsx` (the complete file, lines 1–130) — exact auth sequence + form action + redirect.

**Auth sequence pattern** — copy from `upload.tsx` lines 61–74 (the T-05-AUTHZ block):
```typescript
export async function action({ request }: Route.ActionArgs) {
  // D-18: Authentication + authorization sequence
  const { user } = await requireUser(request);
  requireRole(user, ["owner", "practitioner"]); // clients cannot generate (D-18)
  const subject = await getOwnerSubject(user.tenantId!);
  assertSubjectAccess(user, subject, user.tenantId!);
  // ... parse form, validate subjectId, call generateReport, redirect
  const reportId = await generateReport(user.tenantId!, subject.id, user.id);
  return redirect(`/reports/${reportId}`);
}
```

**Imports** — copy from `upload.tsx` lines 19–36, substituting the ingest-specific imports:
```typescript
import { redirect } from "react-router";
import type { Route } from "./+types/generate";
import { requireUser, requireRole, assertSubjectAccess } from "~/lib/authz.server";
import { getOwnerSubject } from "~/lib/data.server";
import { generateReport } from "~/lib/report-generator.server";
import { Card } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { PageHeader } from "~/components/ui/PageHeader";
```

**`meta` export** — copy pattern from `upload.tsx` lines 52–57:
```typescript
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Generate Report - Zoetrop" },
    { name: "description", content: "Generate a confidence-graded protocol report" },
  ];
}
```

---

### `app/routes/_app/reports/detail.tsx` (route loader + component, request-response)

**Analog:** `app/routes/_app/ingest/document.tsx` (auth + tenant-scoped read pattern, lines 1–70) and `app/routes/_app/insights/genetics.tsx` (loader + component pattern, lines 1–80+).

**Loader pattern** — copy from `document.tsx` lines 25–47 (auth + row lookup + assertSubjectAccess):
```typescript
export async function loader({ request, params }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  const reportId = params.reportId;  // :reportId not :id (RESEARCH §Routes)
  if (!reportId) throw new Response("Not found", { status: 404 });

  const report = await getReport(reportId);
  if (!report) throw new Response("Not found", { status: 404 });

  // D-18: assertSubjectAccess — 403 for cross-tenant report read
  assertSubjectAccess(user, { tenantId: report.tenantId }, user.tenantId!);

  return { report };
}
```

**Component pattern** — copy from `genetics.tsx` lines 1–25 (import block + meta export + component structure using `useLoaderData`).

---

### `app/routes.ts` (modified — add reports routes)

**Pattern** — copy the flat route registration style from lines 37–44 of `app/routes.ts`. Add inside the `layout("routes/_app/layout.tsx", [...])` block:
```typescript
// Reports
route("reports", "routes/_app/reports/index.tsx"),
route("reports/generate", "routes/_app/reports/generate.tsx"),
route("reports/:reportId", "routes/_app/reports/detail.tsx"),
```

Note: `:reportId` not `:id` (RESEARCH §Routes, to avoid collision with other `:id` params).

---

### `app/components/ui/KGradeBadge.tsx` (UI component)

**Analog:** `app/components/ui/StatusBadge.tsx` (full file, lines 1–29) — the CONFIG-table + function pattern; and `app/components/ui/Badge.tsx` (full file, lines 1–64) — CSS-var-only color implementation.

**Config-table pattern** — copy from `StatusBadge.tsx` lines 7–11, adapting for K-grades:
```typescript
// CSS vars only — dark remap automatic via cascade (no Tailwind color classes)
const K_CONFIG: Record<'K1'|'K2'|'K3'|'K4', { color: string; bg: string; label: string }> = {
  K1: { color: "var(--ink)",      bg: "var(--n-100)",           label: "Established" },
  K2: { color: "var(--focus-500)", bg: "var(--focus-50)",       label: "Probable"    },
  K3: { color: "var(--n-600)",    bg: "var(--surface-sunken)",  label: "Emerging"    },
  K4: { color: "var(--n-500)",    bg: "var(--n-100)",           label: "Speculative" },
};
```

**Font pattern** — copy from `Badge.tsx` lines 43–55 (Space Mono mono font, `--text-2xs`, tracking 0.06em, `--radius-pill`):
```typescript
// font-family: var(--font-mono); font-size: var(--text-2xs); letter-spacing: 0.06em;
// text-transform: uppercase; border-radius: var(--radius-pill);
```

**Props interface:** `{ level: 'K1'|'K2'|'K3'|'K4'; variant?: 'chip'|'inline' }` (from UI-SPEC Pattern 1).
**Chip variant**: render `K{N}` badge + `({label})` in muted mono text after. Inline: render `K{N}` only.
**Accessibility:** `aria-label="Evidence tier: K{N} — {label}"` on the chip `<span>`.

---

### `app/components/ui/RecommendationBlock.tsx` (UI component)

**Analog:** `app/components/ui/Card.tsx` (lines 1–91) for the Card wrapper; `app/components/ui/StatusBadge.tsx` (lines 1–29) for inline config-table pattern.

**Wrapper pattern** — wrap in `Card` with `elevation="xs"` `padding="md"`; K4 blocks add `tone="mist"`:
```typescript
import { Card } from "./Card";
import { KGradeBadge } from "./KGradeBadge";
import { StatusBadge } from "./StatusBadge";
import { DisclaimerCallout } from "./DisclaimerCallout";

// Inside render:
<Card elevation="xs" padding="md" tone={kLevel === 'K4' ? 'mist' : null}>
  {/* header row: KGradeBadge chip + source name + StatusBadge (metric) */}
  {/* body text: "K{N} (Label): {recommendationText}" assembled inline */}
  {kLevel === 'K4' && <DisclaimerCallout />}
</Card>
```

**Body text assembly** (from UI-SPEC Pattern 2 — LOCKED format):
```typescript
// "K{N} ({label}): {recommendationText}"
// KGradeBadge variant="inline" + muted parenthetical + colon + body text
// All inline flow — badge, parenthetical, colon, text are text-level elements.
```

**Props interface** — copy from UI-SPEC Pattern 2 exactly (no deviations from the spec).

---

### `app/components/ui/DisclaimerCallout.tsx` (UI component)

**Analog:** `app/components/ui/Badge.tsx` lines 32–63 (CSS-var-only implementation, no Tailwind color classes).

**Pattern — zero-props, hardcoded string:**
```typescript
// No props. ROADMAP SC5 locks the disclaimer string — no override allowed.
const K4_DISCLAIMER = "This recommendation is speculative (limited evidence). Discuss with a licensed practitioner before acting.";

export function DisclaimerCallout() {
  return (
    <div
      role="note"
      aria-label="K4 speculative recommendation notice"
      style={{
        background: "var(--excess-bg)",
        borderLeft: "3px solid var(--energy)",
        borderRadius: "0 var(--radius-md) var(--radius-md) 0",
        padding: "12px 16px",
        marginTop: 12,
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
      }}
    >
      {/* alert-triangle icon from lucide-react, 16px, color var(--energy-600) */}
      <span style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)", lineHeight: 1.5 }}>
        {K4_DISCLAIMER}
      </span>
    </div>
  );
}
```

**Critical:** The `K4_DISCLAIMER` constant must appear verbatim in the file — `tests/lib/corpus-lint.test.ts` asserts its presence with `src.includes(K4_DISCLAIMER)`.

---

### `tests/lib/engine.test.ts` (unit tests)

**Analog:** `app/lib/metrics.test.ts` (full file, lines 1–69) — exact test harness pattern.

**Test harness pattern** — copy from `metrics.test.ts` lines 1–5:
```typescript
import { describe, it, expect } from "vitest";
import { classifyMetricStatus, computePearson, getCessationDay, getCessationPhase } from "~/lib/engine";
```

**Fixture factory pattern** — copy from `metrics.test.ts` lines 6–27 (the `makeMetric` factory + `as unknown as Metric` comment).

**Import-purity test** — import `engine.ts` and assert no Drizzle/Remix module references (RESEARCH.md §Engine Purity):
```typescript
it("engine.ts has no Drizzle or Remix imports", async () => {
  const src = await import("fs").then(fs =>
    fs.readFileSync("app/lib/engine.ts", "utf-8")
  );
  expect(src).not.toMatch(/drizzle-orm/);
  expect(src).not.toMatch(/react-router/);
  expect(src).not.toMatch(/@react-router\//);
  expect(src).not.toMatch(/@neondatabase\//);
});
```

**Behavior-preservation tests** — re-point from `protocol-data.test.ts` (lines 1–41) and `metrics.test.ts` (lines 1–69): copy all cases verbatim, update imports to point at `~/lib/engine`.

---

### `tests/lib/corpus-lint.test.ts` (unit tests, lint)

**Analog:** `app/lib/metrics.test.ts` (test harness structure); RESEARCH.md §Guardrail Lint (lines 629–682) for the concrete assertions.

**Pattern** — copy from `metrics.test.ts` lines 1–5 (imports), then follow the RESEARCH.md lint test design:
```typescript
import { describe, it, expect } from "vitest";
import { corpusSeedData } from "../../scripts/seed-corpus";

const IMPERATIVE_PATTERNS = [/\byou should\b/i, /\byou must\b/i, /\byou need to\b/i, ...];
const K4_DISCLAIMER = "This recommendation is speculative (limited evidence). Discuss with a licensed practitioner before acting.";

// Test 1: No imperative patterns in any corpus recommendationText
// Test 2: DisclaimerCallout.tsx hard-codes the K4 disclaimer string (static source assertion)
```

---

### `tests/db/corpus-schema.test.ts` (DB introspection test)

**Analog:** `tests/db/ingest-schema.test.ts` (full file, lines 1–60+) and `tests/db/schema-columns.test.ts` (full file, lines 1–155) — exact skip-guard + Pool pattern.

**Skip-guard pattern** — copy from `tests/db/ingest-schema.test.ts` lines 14–33:
```typescript
import { describe, it, expect, afterAll } from "vitest";
import { Pool } from "@neondatabase/serverless";

const connectionString = process.env["DB_URL_STUBBED"]
  ? undefined
  : process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"];

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) pool = new Pool({ connectionString });
  return pool;
}
afterAll(async () => { if (pool) await pool.end(); });
```

**Non-null K assertion pattern** — copy from `tests/db/schema-columns.test.ts` lines 64–104 (SQL query style):
```typescript
describe.skipIf(!connectionString)("corpus tables: evidence_tier NOT NULL", () => {
  for (const table of ["variant_protocol_map", "metric_protocol_map"]) {
    it(`${table}.evidence_tier is NOT NULL`, async () => {
      const { rows } = await getPool().query<{ is_nullable: string }>(
        `SELECT is_nullable FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'evidence_tier'`,
        [table]
      );
      expect(rows.length).toBe(1);
      expect(rows[0].is_nullable).toBe("NO");
    });
  }
  // Also assert COUNT(*) WHERE evidence_tier IS NULL = 0 after seed
});
```

---

## Shared Patterns

### Authentication + Role Gate
**Source:** `app/lib/authz.server.ts` lines 28–76 (`requireUser` + `requireRole` + `assertSubjectAccess`)
**Apply to:** `reports/generate.tsx` (action), `reports/detail.tsx` (loader), `reports/index.tsx` (loader)

```typescript
// Standard auth sequence (copy from upload.tsx lines 61-74):
const { user } = await requireUser(request);       // unauthenticated → redirect /login
requireRole(user, ["owner", "practitioner"]);       // client → 403 (generate only)
const subject = await getOwnerSubject(user.tenantId!);
assertSubjectAccess(user, subject, user.tenantId!); // cross-tenant → 403
```

### Drizzle Tenant-Scoped Read
**Source:** `app/lib/data.server.ts` lines 56–73 (`getMetrics` pattern with `and(eq(table.tenantId, ...), eq(table.subjectId, ...))`)
**Apply to:** `corpus.server.ts` (reports queries), `data.server.ts` extension (getReports, getReport)

```typescript
// Standard tenant-scoped query (copy the and(...conditions) pattern):
const db = getDb();
return db.select().from(TABLE)
  .where(and(eq(TABLE.tenantId, tenantId), eq(TABLE.subjectId, subjectId)));
```

### CSS-Var-Only Color Styling
**Source:** `app/components/ui/Badge.tsx` lines 23–63 (TONES config table + inline style object)
**Apply to:** `KGradeBadge.tsx`, `DisclaimerCallout.tsx`, `RecommendationBlock.tsx`

```typescript
// Pattern: CSS custom properties only, never Tailwind color class strings
// for dynamic color — dark remap works automatically via cascade.
// CORRECT: style={{ color: "var(--focus-500)", background: "var(--focus-50)" }}
// WRONG:   className="text-blue-500 bg-blue-50"  (breaks dark-mode token remap)
```

### Route Registration (routes.ts)
**Source:** `app/routes.ts` lines 1–46 (the `route()` + `layout()` pattern)
**Apply to:** reports section routes

```typescript
// Flat registration inside the layout() block — no nested layout for reports section
// (consistent with how ingest routes are registered at lines 37-44)
route("reports", "routes/_app/reports/index.tsx"),
route("reports/generate", "routes/_app/reports/generate.tsx"),
route("reports/:reportId", "routes/_app/reports/detail.tsx"),
```

### RouteConfig Typed Exports
**Source:** All existing route files under `routes/_app/` — every route exports:
- `meta()` function returning title + description array
- `loader()` and/or `action()` as named async exports
- Default export as the React component
- `import type { Route } from "./+types/{filename}"` (generated types)

### Vitest Test Harness
**Source:** `remix-app/vite.config.ts` lines 1–35 (test config) and `app/lib/metrics.test.ts` lines 1–5 (import style)
**Apply to:** all new test files

```typescript
// environment: "node" (default — no pragma needed for non-component tests)
// import from "~/" paths work via tsconfigPaths plugin
// describe.skipIf(!connectionString) for DB-gated tests
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `app/lib/engine.ts` — `mapVariantToProtocol` function | pure-logic module | transform | No existing genotype-matching engine in the codebase; use RESEARCH.md §Engine module structure pseudocode |

---

## Naming + Collision Constraints

| Constraint | Detail |
|-----------|--------|
| DO NOT name new enum `confidenceLevelEnum` | Existing enum at `db/schema.ts:62` — `pgEnum('confidence_level', ['high','low'])`. New enum MUST be `evidenceTierEnum` / Postgres type `evidence_tier`. |
| Engine file is `engine.ts` NOT `engine.server.ts` | `.server.ts` suffix is bundle-hygiene for server-only code; engine has no server-only deps (RESEARCH §Engine Purity) |
| Route param is `:reportId` not `:id` | Avoids collision with other `:id` params in nested layouts (RESEARCH §Routes) |
| `CORPUS_VERSION` constant in `corpus.server.ts` | Must match the string written to all corpus table rows at seed time and to `reports.corpusVersion` at generation time |
| `K4_DISCLAIMER` string in `DisclaimerCallout.tsx` | Must match exactly: `"This recommendation is speculative (limited evidence). Discuss with a licensed practitioner before acting."` — ROADMAP SC5-locked; lint test asserts verbatim presence |
| `corpusSeedData` export from `scripts/seed-corpus.ts` | Must be a named export (not default) so `tests/lib/corpus-lint.test.ts` can `import { corpusSeedData }` |

---

## Metadata

**Analog search scope:** `remix-app/app/lib/`, `remix-app/app/components/ui/`, `remix-app/app/routes/_app/`, `remix-app/app/types/`, `remix-app/db/schema.ts`, `remix-app/scripts/`, `remix-app/tests/`
**Files scanned:** 23 source files read directly; 6 test files read
**Pattern extraction date:** 2026-06-11

## PATTERN MAPPING COMPLETE
