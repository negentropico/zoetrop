import { describe, it, expect, afterAll } from "vitest";
import { Pool } from "@neondatabase/serverless";

// TEN-01 — tenancy columns + composite index on all 8 data tables.
//
// Live-DB introspection. RED until Plans 02+04 migrate Neon to add non-null
// tenant_id/subject_id and a composite (tenant_id, subject_id) index on each of
// the 8 existing data tables.
//
// Skip-guard: when no connection string is set (local CI without DB creds), the
// whole suite is green-SKIPPED rather than failed — no false-positive pass. When
// a URL IS present, every assertion is hard. Connection-string resolution mirrors
// the migration path (drizzle.config.ts): DATABASE_URL_UNPOOLED || DATABASE_URL.
//
// Source: 03-RESEARCH.md § Migration Sequence (Migration D: SET NOT NULL +
//   CREATE INDEX (tenant_id, subject_id)); CLAUDE.md (8 tables).

const connectionString = process.env["DB_URL_STUBBED"]
  ? undefined
  : process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"];

const DATA_TABLES = [
  "metrics",
  "protocol_versions",
  "protocol_changes",
  "milestones",
  "supplements",
  "supplement_log",
  "correlations",
  "cessation_log",
] as const;

interface ColumnRow {
  is_nullable: string;
}

interface IndexRow {
  indexdef: string;
}

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

// ── DATA-05 vestige columns absent (live Neon) ─────────────────────────────
// Assertions are RED until migration 0006 is applied (Task 2), then GREEN.
// Checks: metrics has no sync_status/sync_version; supplements.is_active is
// boolean; subject_genotypes table exists with gene and genotype columns.

interface DataTypeRow {
  column_name: string;
  data_type: string;
}

describe.skipIf(!connectionString)(
  "DATA-05 vestige columns absent (live Neon)",
  () => {
    it("metrics table has no sync_status or sync_version column", async () => {
      const { rows } = await getPool().query<{ column_name: string }>(
        `SELECT column_name
           FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'metrics'
            AND column_name = ANY($1)`,
        [["sync_status", "sync_version"]]
      );
      expect(rows.length).toBe(0);
    });

    it("supplements.is_active has data_type = 'boolean'", async () => {
      const { rows } = await getPool().query<DataTypeRow>(
        `SELECT column_name, data_type
           FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'supplements'
            AND column_name = 'is_active'`
      );
      expect(rows.length).toBe(1);
      expect(rows[0].data_type).toBe("boolean");
    });

    it("subject_genotypes table exists with gene and genotype columns", async () => {
      const { rows } = await getPool().query<{ column_name: string }>(
        `SELECT column_name
           FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'subject_genotypes'
            AND column_name = ANY($1)`,
        [["gene", "genotype"]]
      );
      const cols = rows.map((r) => r.column_name);
      expect(cols).toContain("gene");
      expect(cols).toContain("genotype");
    });
  }
);

describe.skipIf(!connectionString)(
  "TEN-01 tenancy columns + composite index (live Neon)",
  () => {
    for (const table of DATA_TABLES) {
      it(`${table} has non-null tenant_id and subject_id`, async () => {
        const { rows } = await getPool().query<ColumnRow>(
          `SELECT column_name, is_nullable
             FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = $1
              AND column_name = ANY($2)`,
          [table, ["tenant_id", "subject_id"]]
        );

        const byName = new Map(
          rows.map((r) => [
            (r as unknown as Record<string, unknown>)["column_name"] as string,
            r.is_nullable,
          ])
        );

        expect(byName.has("tenant_id")).toBe(true);
        expect(byName.has("subject_id")).toBe(true);
        expect(byName.get("tenant_id")).toBe("NO");
        expect(byName.get("subject_id")).toBe("NO");
      });

      it(`${table} has a composite index on (tenant_id, subject_id)`, async () => {
        const { rows } = await getPool().query<IndexRow>(
          `SELECT indexdef
             FROM pg_indexes
            WHERE schemaname = 'public'
              AND tablename = $1`,
          [table]
        );

        const hasComposite = rows.some((r) => {
          const def = r.indexdef.replace(/\s+/g, " ").toLowerCase();
          const cols = def.slice(def.indexOf("("));
          const t = cols.indexOf("tenant_id");
          const s = cols.indexOf("subject_id");
          return t !== -1 && s !== -1 && t < s;
        });

        expect(hasComposite).toBe(true);
      });
    }
  }
);
