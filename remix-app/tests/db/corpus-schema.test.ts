/**
 * corpus-schema.test.ts — ENG-02 / T-06-PHI-CORPUS / T-06-ENUM structural DB assertions
 *
 * Wave-0 RED-first stub (06-02 Task 1). These assertions are authored BEFORE the
 * production schema/seed code in Task 2. They become GREEN after:
 *   - Task 2: Schema edits (types known to TypeScript)
 *   - Task 3: db:migrate 0009 applied to live Neon (DB introspection assertions)
 *   - 06-03:  Corpus seed fills the tables (NOT asserted here — see note below)
 *
 * Skip-guard: when DATABASE_URL_UNPOOLED or DATABASE_URL is not set (local CI
 * without DB creds), the whole suite is GREEN-SKIPPED. When a URL is present,
 * every assertion is hard.
 *
 * Assertions owned by THIS plan (06-02):
 *   - evidence_tier column is NOT NULL on variant_protocol_map (structural)
 *   - evidence_tier column is NOT NULL on metric_protocol_map (structural)
 *   - geneticVariants, variantProtocolMap, metricProtocolMap have NO tenant_id/
 *     subject_id columns (T-06-PHI-CORPUS non-PHI constraint)
 *
 * Assertions NOT here (owned by 06-03 after seed):
 *   - COUNT(*) WHERE evidence_tier IS NULL = 0  ← content assertion, 06-03
 *   - COUNT(*) FROM genetic_variants > 0        ← content assertion, 06-03
 * See 06-03 plan for the non-null-content COUNT assertions.
 */

import { describe, it, expect, afterAll } from "vitest";
import { Pool } from "@neondatabase/serverless";

const connectionString = process.env["DB_URL_STUBBED"]
  ? undefined
  : process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"];

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString });
  }
  return pool;
}

afterAll(async () => {
  if (pool) await pool.end();
});

interface ColumnRow {
  column_name: string;
  is_nullable: string;
}

// ── evidence_tier is NOT NULL (structural, D-05 / T-06-ENUM) ─────────────────
//
// Becomes GREEN after Task 3 (db:migrate 0009) applies the schema to live Neon.

describe.skipIf(!connectionString)(
  "corpus tables: evidence_tier column is NOT NULL (structural)",
  () => {
    for (const table of ["variant_protocol_map", "metric_protocol_map"] as const) {
      it(`${table}.evidence_tier is NOT NULL`, async () => {
        const { rows } = await getPool().query<{ is_nullable: string }>(
          `SELECT is_nullable
             FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = $1
              AND column_name = 'evidence_tier'`,
          [table]
        );
        // Column must exist (row returned) and be NOT NULL
        expect(rows.length).toBe(1);
        expect(rows[0].is_nullable).toBe("NO");
      });
    }
  }
);

// ── Corpus tables have NO tenant_id / subject_id (T-06-PHI-CORPUS / D-06) ────
//
// ENG-02 / D-06: geneticVariants, variantProtocolMap, metricProtocolMap are
// non-PHI population-level knowledge tables — they MUST NOT have tenant_id or
// subject_id columns. PHI stays in subject_genotypes + metrics.
//
// Becomes GREEN after Task 3 (db:migrate 0009) applies the schema to live Neon.

const CORPUS_TABLES = [
  "genetic_variants",
  "variant_protocol_map",
  "metric_protocol_map",
] as const;

describe.skipIf(!connectionString)(
  "corpus tables: no tenant_id / subject_id columns (non-PHI, D-06)",
  () => {
    for (const table of CORPUS_TABLES) {
      it(`${table} has no tenant_id or subject_id column`, async () => {
        const { rows } = await getPool().query<ColumnRow>(
          `SELECT column_name, is_nullable
             FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = $1
              AND column_name = ANY($2)`,
          [table, ["tenant_id", "subject_id"]]
        );
        // Must return 0 rows — neither column should exist on corpus tables
        expect(rows.length).toBe(0);
      });
    }
  }
);

// ── All 4 new tables exist (post-migrate) ────────────────────────────────────

describe.skipIf(!connectionString)(
  "corpus + reports tables exist after migration 0009",
  () => {
    for (const table of [
      "genetic_variants",
      "variant_protocol_map",
      "metric_protocol_map",
      "reports",
    ] as const) {
      it(`table ${table} exists`, async () => {
        const { rows } = await getPool().query<{ table_name: string }>(
          `SELECT table_name
             FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = $1`,
          [table]
        );
        expect(rows.length).toBe(1);
      });
    }
  }
);

// ── evidence_tier enum exists and has k1-k4 values (T-06-ENUM) ───────────────

describe.skipIf(!connectionString)(
  "evidence_tier Postgres enum has k1/k2/k3/k4 values (distinct from confidence_level)",
  () => {
    it("evidence_tier enum has all four K values", async () => {
      const { rows } = await getPool().query<{ enumlabel: string }>(
        `SELECT e.enumlabel
           FROM pg_enum e
           JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'evidence_tier'`
      );
      const values = rows.map((r) => r.enumlabel);
      expect(values).toContain("k1");
      expect(values).toContain("k2");
      expect(values).toContain("k3");
      expect(values).toContain("k4");
    });

    it("evidence_tier is distinct from confidence_level (no collision)", async () => {
      // confidence_level has 'high' | 'low' — evidence_tier should NOT have these
      const { rows } = await getPool().query<{ enumlabel: string }>(
        `SELECT e.enumlabel
           FROM pg_enum e
           JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'evidence_tier'`
      );
      const values = rows.map((r) => r.enumlabel);
      expect(values).not.toContain("high");
      expect(values).not.toContain("low");
    });
  }
);
